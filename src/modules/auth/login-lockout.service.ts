import { Injectable, Inject } from '@nestjs/common';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '../../common/redis/redis.provider';
import { createHash } from 'crypto';
import { loginLockoutConfig } from '../../config/configuration';

@Injectable()
export class LoginLockoutService {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
    @Inject(loginLockoutConfig.KEY) private readonly config: ReturnType<typeof loginLockoutConfig>,
  ) {}

  private hashIdentifier(identifier: string): string {
    return createHash('sha256').update(identifier.toLowerCase().trim()).digest('hex');
  }

  private getFailureKeyEmailIp(hash: string, ip: string): string {
    return `auth:fail:emailip:${hash}:${ip}`;
  }

  private getFailureKeyIp(ip: string): string {
    return `auth:fail:ip:${ip}`;
  }

  private getLockKey(hash: string, ip: string): string {
    return `auth:lock:emailip:${hash}:${ip}`;
  }

  async isLocked(identifier: string, ip: string): Promise<{ locked: boolean, retryAfterSeconds?: number }> {
    try {
      const hash = this.hashIdentifier(identifier);
      const lockKey = this.getLockKey(hash, ip);

      const ttl = await this.redisClient.ttl(lockKey);
      if (ttl > 0) {
        return { locked: true, retryAfterSeconds: ttl };
      }

      return { locked: false };
    } catch (error) {
      // Log error in production, but for now throw to indicate failure
      throw new Error(`Failed to check lock status: ${error.message}`);
    }
  }

  async registerFailure(identifier: string, ip: string): Promise<{ lockedNow: boolean, retryAfterSeconds?: number }> {
    try {
      const hash = this.hashIdentifier(identifier);
      const failureKeyEmailIp = this.getFailureKeyEmailIp(hash, ip);
      const failureKeyIp = this.getFailureKeyIp(ip);
      const lockKey = this.getLockKey(hash, ip);

      // Use atomic MULTI operation for both counters
      const multi = this.redisClient.multi();
      multi.incr(failureKeyEmailIp);
      multi.expire(failureKeyEmailIp, this.config.windowMinutes * 60);
      multi.incr(failureKeyIp);
      multi.expire(failureKeyIp, this.config.windowMinutes * 60);

      const results = await multi.exec();
      const failuresEmailIp = results[0] as unknown as number;

      let lockedNow = false;
      let retryAfterSeconds: number | undefined;

      // Check thresholds and set locks based on email+ip failures
      if (failuresEmailIp >= this.config.maxFailed) {
        const durationSeconds = this.config.durationMinutes * 60;
        await this.redisClient.setEx(lockKey, durationSeconds, '1');
        lockedNow = true;
        retryAfterSeconds = await this.redisClient.ttl(lockKey);
      }

      return { lockedNow, retryAfterSeconds };
    } catch (error) {
      throw new Error(`Failed to record failure: ${error.message}`);
    }
  }

  async reset(identifier: string, ip: string): Promise<void> {
    try {
      const hash = this.hashIdentifier(identifier);
      const failureKeyEmailIp = this.getFailureKeyEmailIp(hash, ip);
      const failureKeyIp = this.getFailureKeyIp(ip);
      const lockKey = this.getLockKey(hash, ip);

      await Promise.all([
        this.redisClient.del(failureKeyEmailIp),
        this.redisClient.del(failureKeyIp),
        this.redisClient.del(lockKey),
      ]);
    } catch (error) {
      throw new Error(`Failed to clear failures: ${error.message}`);
    }
  }
}