import { Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: async (configService: ConfigService): Promise<any> => {
    const config = configService.get('redis');
    const { host, port, password, db } = config;
    const client = createClient({
      socket: {
        host,
        port,
      },
      password,
      database: db,
    });
    client.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });
    await client.connect();
    return client;
  },
  inject: [ConfigService],
};

@Module({
  providers: [redisProvider],
  exports: [redisProvider],
})
export class RedisProviderModule {}