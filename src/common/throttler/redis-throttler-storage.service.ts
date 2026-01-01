import { Inject } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisClientType } from 'redis';

interface ThrottlerStorageRecord {
  totalHits: number;
  isBlocked: boolean;
  timeToExpire: number;
  timeToBlockExpire: number;
}

export class RedisThrottlerStorageService implements ThrottlerStorage {
  private readonly scriptSha: string;

  constructor(@Inject('REDIS_CLIENT') private readonly redis: RedisClientType) {
    // Load the Lua script on initialization
    this.scriptSha = this.loadScript();
  }

  private loadScript(): string {
    const script = `
      local key = KEYS[1]
      local blockKey = key .. ':block'
      local isBlocked = redis.call('EXISTS', blockKey)
      local current = tonumber(redis.call('GET', key) or '0')
      if isBlocked == 1 then
        local ttl = redis.call('PTTL', blockKey)
        return {current, 1, 0, ttl}
      end
      local ttl = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local blockDuration = tonumber(ARGV[3])
      current = redis.call('INCR', key)
      if current == 1 then
        redis.call('PEXPIRE', key, ttl)
      end
      local remainingTtl = redis.call('PTTL', key)
      if current > limit then
        redis.call('SET', blockKey, '1', 'PX', blockDuration)
        return {current, 1, remainingTtl, blockDuration}
      else
        return {current, 0, remainingTtl, 0}
      end
    `;
    // Note: In production, you might want to load the script SHA on startup
    // For simplicity, we'll eval the script directly
    return script;
  }

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const fullKey = `throttler:${throttlerName}:${key}`;

    const result = await this.redis.eval(this.scriptSha, {
      keys: [fullKey],
      arguments: [ttl.toString(), limit.toString(), blockDuration.toString()],
    });

    const [totalHits, isBlocked, timeToExpire, blockExpiresIn] = result as [
      number,
      number,
      number,
      number,
    ];

    return {
      totalHits,
      isBlocked: isBlocked === 1,
      timeToExpire,
      timeToBlockExpire: blockExpiresIn,
    };
  }
}