import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Application } from 'express';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing
  app.use(cookieParser());

  (app.getHttpAdapter().getInstance() as Application).set('trust proxy', process.env.TRUST_PROXY ? 1 : false);

  // 1. CORS
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // ✅ 2. LE PRÉFIXE MANQUANT (C'est ça qui causait le 404 !)
  // Cela transforme toutes les routes "auth/login" en "api/auth/login"
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // 3. PORT
  const port = process.env.PORT || 4000;
  await app.listen(port);
  
  console.log(`🚀 BACKEND en ligne sur : http://localhost:${port}/api`);
}
bootstrap();