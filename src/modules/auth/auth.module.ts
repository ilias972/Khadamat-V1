import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
// 👇 C'est cette ligne qui manquait !
import { JwtStrategy } from './jwt.strategy';
import { LoggerModule } from '../../common/logger/logger.module';
import { RedisProviderModule } from '../../common/redis/redis.provider';
import { LoginLockoutService } from './login-lockout.service';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      global: true,
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('jwt.accessSecret'),
        signOptions: { expiresIn: config.get<string>('jwt.accessExpiresIn') ?? '15m' as any },
      }),
      inject: [ConfigService],
    }),
    LoggerModule,
    RedisProviderModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LoginLockoutService,
  ],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {}