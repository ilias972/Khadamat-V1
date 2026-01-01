import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validationSchema } from './validation.schema';
import {
  default as appConfig,
  databaseConfig,
  jwtConfig,
  redisConfig,
  emailConfig,
  paymentConfig,
  loginLockoutConfig,
} from './configuration';

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [
        appConfig,
        databaseConfig,
        jwtConfig,
        redisConfig,
        emailConfig,
        paymentConfig,
        loginLockoutConfig,
      ],
      validationSchema,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),
  ],
})
export class ConfigModule {}
