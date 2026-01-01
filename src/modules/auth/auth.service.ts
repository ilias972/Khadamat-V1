import { Injectable, ConflictException, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { AppLoggerService } from '../../common/logger/logger.service';
import { BusinessLoggerService } from '../../common/logger/business-logger.service';
import { LoginLockoutService } from './login-lockout.service';

const DUMMY_HASH = '$2b$10$4dk7hAl1MjzpOS.ZIf2AY.4VanMeFLsio8o0CTDDn4Va9uQzPiJci';

@Injectable()
export class AuthService {
  private readonly REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private logger: AppLoggerService,
    private businessLogger: BusinessLoggerService,
    private loginLockoutService: LoginLockoutService,
  ) {}

  // --- REFRESH TOKEN HELPERS ---
  private async createRefreshSession(userId: string): Promise<{ refreshToken: string; sessionId: string }> {
    const sessionId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + this.REFRESH_TOKEN_EXPIRY);

    const refreshTokenPayload = {
      sub: userId,
      sid: sessionId,
      tokenType: 'refresh',
    };

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d' as string,
    } as any);
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshSession.create({
      data: {
        id: sessionId,
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return { refreshToken, sessionId };
  }

  private async validateRefreshSession(sessionId: string, userId: string, refreshTokenHash?: string): Promise<boolean> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { id: sessionId },
    });

    const isValid =
      !!session &&
      session.userId === userId &&
      session.expiresAt > new Date() &&
      !session.revokedAt &&
      (!refreshTokenHash || session.refreshTokenHash === refreshTokenHash);

    return isValid;
  }

  private async revokeRefreshSession(sessionId: string): Promise<void> {
    await this.prisma.refreshSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  private async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.refreshSession.deleteMany({
      where: {
        userId,
      },
    });
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify the refresh JWT token
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      } as any);

      // Validate token type
      if (payload.tokenType !== 'refresh') {
        throw new UnauthorizedException('Invalid token type');
      }

      const userId = payload.sub;
      const sessionId = payload.sid;

      const providedRefreshHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

      // Validate session in DB
      const isValidSession = await this.validateRefreshSession(sessionId, userId, providedRefreshHash);
      if (!isValidSession) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      // Get user details for access token
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          role: true,
        },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Revoke current session (rotation)
      await this.revokeRefreshSession(sessionId);

      // Create new session and tokens
      const { refreshToken: newRefreshToken } = await this.createRefreshSession(userId);

      const accessPayload = {
        sub: user.id,
        email: user.email,
        role: user.role,
        tokenType: 'access',
      };
      const access_token = await this.jwtService.signAsync(accessPayload);

      return {
        access_token,
        refresh_token: newRefreshToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      // Verify the refresh JWT token to get sessionId
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      } as any);

      if (payload.tokenType !== 'refresh') {
        return; // Invalid token type, but don't throw
      }

      const sessionId = payload.sid;
      await this.revokeRefreshSession(sessionId);
    } catch (error) {
      // If token is invalid, just ignore
      return;
    }
  }

  // --- REGISTER ---
  async register(data: any) {
    const { email, password, phone, role, firstName, lastName } = data;

    const orConditions: { email?: string; phone?: string }[] = [];
    if (email) orConditions.push({ email });
    if (phone) orConditions.push({ phone });

    const existing = await this.prisma.user.findFirst({
      where: { OR: orConditions },
    });
    
    if (existing) throw new ConflictException('Un utilisateur avec cet email ou téléphone existe déjà');

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'pro' || role === 'PRO' ? 'PRO' : 'CLIENT';

    await this.prisma.user.create({
      data: {
        email,
        phone,
        passwordHash: hashedPassword,
        role: userRole as any,
        clientProfile: userRole === 'CLIENT' ? { create: { firstName, lastName } } : undefined,
        proProfile: userRole === 'PRO' ? { create: { firstName, lastName, profession: data.profession || 'Pro', bio: '' } } : undefined,
      },
    });

    return this.login(email, password);
  }

  async login(identifier: string, password: string, ip?: string) {
    // ✅ No plaintext logs. Ever.
    if (ip) {
      const lockStatus = await this.loginLockoutService.isLocked(identifier, ip);
      if (lockStatus.locked) {
        throw new HttpException({ message: 'Too many failed attempts. Try again later.', retryAfter: lockStatus.retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
      }
    }

    const user = await this.prisma.user.findFirst({
      where: {
        status: 'active',
        deletedAt: null,
        OR: [{ email: identifier }, { phone: identifier }]
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        passwordHash: true,
        clientProfile: { select: { firstName: true, lastName: true } },
        proProfile: { select: { firstName: true, lastName: true } },
      },
    });

    if (!user) {
      // Dummy bcrypt to avoid timing leaks
      await bcrypt.compare(password, DUMMY_HASH);
      if (ip) {
        const failureResult = await this.loginLockoutService.registerFailure(identifier, ip);
        if (failureResult.lockedNow) {
          throw new HttpException({ message: 'Too many failed attempts. Try again later.', retryAfter: failureResult.retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
        }
      }
      this.businessLogger.logSecurityEvent('LOGIN_FAILED', identifier, undefined, undefined, {
        reason: 'USER_NOT_FOUND_OR_INACTIVE',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      if (ip) {
        const failureResult = await this.loginLockoutService.registerFailure(user.email, ip);
        if (failureResult.lockedNow) {
          throw new HttpException({ message: 'Too many failed attempts. Try again later.', retryAfter: failureResult.retryAfterSeconds }, HttpStatus.TOO_MANY_REQUESTS);
        }
      }
      this.businessLogger.logSecurityEvent('LOGIN_FAILED', user.id, undefined, undefined, {
        reason: 'BAD_PASSWORD',
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    if (ip) await this.loginLockoutService.reset(user.email, ip);

    // Generate tokens
    const accessPayload = {
      sub: user.id,
      role: user.role,
      email: user.email,
      tokenType: 'access',
    };
    const access_token = await this.jwtService.signAsync(accessPayload);
    const { refreshToken } = await this.createRefreshSession(user.id);

    this.businessLogger.logSecurityEvent('LOGIN_SUCCESS', user.id);

    const displayName = user.clientProfile?.firstName && user.clientProfile?.lastName
      ? `${user.clientProfile.firstName} ${user.clientProfile.lastName}`
      : user.proProfile?.firstName && user.proProfile?.lastName
      ? `${user.proProfile.firstName} ${user.proProfile.lastName}`
      : user.email;

    return {
      access_token,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        displayName,
      },
    };
  }
}
