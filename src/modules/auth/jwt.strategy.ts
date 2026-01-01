import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService, private config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET')!,
    });
  }

  async validate(payload: any) {
    // Validate token type
    if (payload.tokenType !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // On vérifie que l'utilisateur existe toujours
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        clientProfile: {
          select: {
            firstName: true,
            lastName: true,
            address: true,
            cityId: true,
            preferredLanguage: true,
          },
        },
        proProfile: {
          select: {
            firstName: true,
            lastName: true,
            profession: true,
            bio: true,
            cityId: true,
            isVerifiedPro: true,
            isPremium: true,
            averageRating: true,
            totalReviews: true,
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Utilisateur introuvable ou inactif');
    }

    // Ce que tu retournes ici est injecté dans req.user
    return user;
  }
}