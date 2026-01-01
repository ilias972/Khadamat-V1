import { Test, TestingModule } from '@nestjs/testing';
import { LoginLockoutService } from './login-lockout.service';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { loginLockoutConfig } from '../../config/configuration';

describe('LoginLockoutService', () => {
  let service: LoginLockoutService;
  let mockRedisClient: jest.Mocked<any>;

  beforeEach(async () => {
    mockRedisClient = {
      ttl: jest.fn(),
      multi: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginLockoutService,
        {
          provide: REDIS_CLIENT,
          useValue: mockRedisClient,
        },
        {
          provide: loginLockoutConfig.KEY,
          useValue: { maxFailed: 3, durationMinutes: 30, windowMinutes: 15 },
        },
      ],
    }).compile();

    service = module.get<LoginLockoutService>(LoginLockoutService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isLocked', () => {
    it('should return locked with ttl', async () => {
      const email = 'test@example.com';
      const ip = '192.168.1.1';

      mockRedisClient.ttl.mockResolvedValue(1800); // 30 minutes in seconds

      const result = await service.isLocked(email, ip);

      expect(result.locked).toBe(true);
      expect(result.retryAfterSeconds).toBe(1800);
      expect(mockRedisClient.ttl).toHaveBeenCalledWith('auth:lock:emailip:973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b:192.168.1.1');
    });

    it('should return not locked when ttl is 0', async () => {
      const email = 'test@example.com';
      const ip = '192.168.1.1';

      mockRedisClient.ttl.mockResolvedValue(0);

      const result = await service.isLocked(email, ip);

      expect(result.locked).toBe(false);
      expect(result.retryAfterSeconds).toBeUndefined();
    });
  });

  describe('registerFailure', () => {
    it('should increment and lock at threshold', async () => {
      const email = 'test@example.com';
      const ip = '192.168.1.1';

      const mockMulti = {
        incr: jest.fn().mockReturnThis(),
        expire: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([1, 1]), // First call returns 1, second returns 2, third returns 3
      };

      mockRedisClient.multi.mockReturnValue(mockMulti);
      mockRedisClient.setEx.mockResolvedValue('OK');
      mockRedisClient.ttl.mockResolvedValue(1800);

      // First failure
      let result = await service.registerFailure(email, ip);
      expect(result.lockedNow).toBe(false);

      // Second failure
      mockMulti.exec.mockResolvedValue([2, 1]);
      result = await service.registerFailure(email, ip);
      expect(result.lockedNow).toBe(false);

      // Third failure (threshold)
      mockMulti.exec.mockResolvedValue([3, 1]);
      result = await service.registerFailure(email, ip);
      expect(result.lockedNow).toBe(true);
      expect(result.retryAfterSeconds).toBe(1800);

      expect(mockRedisClient.setEx).toHaveBeenCalledWith('auth:lock:emailip:973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b:192.168.1.1', 1800, '1');
    });
  });

  describe('reset', () => {
    it('should delete expected keys', async () => {
      const email = 'test@example.com';
      const ip = '192.168.1.1';

      mockRedisClient.del.mockResolvedValue(3);

      await service.reset(email, ip);

      expect(mockRedisClient.del).toHaveBeenCalledWith('auth:fail:emailip:973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b:192.168.1.1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('auth:fail:ip:192.168.1.1');
      expect(mockRedisClient.del).toHaveBeenCalledWith('auth:lock:emailip:973dfe463ec85785f5f95af5ba3906eedb2d931c24e69824a89ea65dba4e813b:192.168.1.1');
    });
  });

});
