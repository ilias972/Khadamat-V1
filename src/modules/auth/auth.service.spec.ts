import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../../common/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { AppLoggerService } from '../../common/logger/logger.service';
import { BusinessLoggerService } from '../../common/logger/business-logger.service';
import { LoginLockoutService } from './login-lockout.service';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

const DUMMY_HASH = '$2b$10$4dk7hAl1MjzpOS.ZIf2AY.4VanMeFLsio8o0CTDDn4Va9uQzPiJci';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: any;
  let jwtService: jest.Mocked<JwtService>;
  let loginLockoutService: jest.Mocked<LoginLockoutService>;
  let businessLogger: jest.Mocked<BusinessLoggerService>;

  beforeEach(async () => {
    const mockPrismaService = {
      user: {
        findFirst: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    const mockJwtService = {
      signAsync: jest.fn(),
    };

    const mockLoginLockoutService = {
      isLocked: jest.fn(),
      registerFailure: jest.fn(),
      reset: jest.fn(),
    };

    const mockBusinessLogger = {
      logSecurityEvent: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: AppLoggerService,
          useValue: {},
        },
        {
          provide: BusinessLoggerService,
          useValue: mockBusinessLogger,
        },
        {
          provide: LoginLockoutService,
          useValue: mockLoginLockoutService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    jwtService = module.get(JwtService);
    loginLockoutService = module.get(LoginLockoutService);
    businessLogger = module.get(BusinessLoggerService);

    // Setup default mocks
    loginLockoutService.isLocked.mockResolvedValue({ locked: false });
    loginLockoutService.registerFailure.mockResolvedValue({ lockedNow: false });
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashedpassword');
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      phone: '1234567890',
      role: 'CLIENT',
      status: 'active',
      passwordHash: '$2b$10$hashedpassword',
      clientProfile: { firstName: 'John', lastName: 'Doe' },
      proProfile: null,
    };

    const mockToken = 'mock-jwt-token';

    beforeEach(() => {
      jwtService.signAsync.mockResolvedValue(mockToken);
    });

    it('should throw HttpException when isLocked=true', async () => {
      loginLockoutService.isLocked.mockResolvedValue({ locked: true, retryAfterSeconds: 1800 });

      await expect(service.login('test@example.com', 'password', '192.168.1.1'))
        .rejects.toThrow('Too many failed attempts. Try again later.');
    });

    it('should trigger dummy bcrypt + registerFailure + Unauthorized for non-existing user', async () => {
      prismaService.user.findFirst.mockResolvedValue(null);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('nonexistent@example.com', 'password', '192.168.1.1'))
        .rejects.toThrow(UnauthorizedException);

      expect(bcrypt.compare).toHaveBeenCalledWith('password', DUMMY_HASH);
      expect(loginLockoutService.registerFailure).toHaveBeenCalledWith('nonexistent@example.com', '192.168.1.1');
    });

    it('should trigger registerFailure + Unauthorized for wrong password', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);
      loginLockoutService.isLocked.mockResolvedValue({ locked: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongpassword', '192.168.1.1'))
        .rejects.toThrow(UnauthorizedException);

      expect(loginLockoutService.registerFailure).toHaveBeenCalledWith('test@example.com', '192.168.1.1');
    });

    it('should throw HttpException when wrong password triggers lock', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);
      loginLockoutService.isLocked.mockResolvedValue({ locked: false });
      loginLockoutService.registerFailure.mockResolvedValue({ lockedNow: true, retryAfterSeconds: 1800 });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login('test@example.com', 'wrongpassword', '192.168.1.1'))
        .rejects.toThrow('Too many failed attempts. Try again later.');
    });

    it('should reset lockout + return token + safe user on successful login', async () => {
      prismaService.user.findFirst.mockResolvedValue(mockUser);
      loginLockoutService.isLocked.mockResolvedValue({ locked: false });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login('test@example.com', 'password', '192.168.1.1');

      expect(loginLockoutService.reset).toHaveBeenCalledWith('test@example.com', '192.168.1.1');
      expect(result).toEqual({
        access_token: mockToken,
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'CLIENT',
          displayName: 'John Doe',
        },
      });
    });
  });

});