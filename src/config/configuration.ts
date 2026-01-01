import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: Number(process.env.PORT ?? 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  version: process.env.npm_package_version || '1.0.0',
}));

export const databaseConfig = registerAs('database', () => ({
  url: process.env.DATABASE_URL,
}));

export const jwtConfig = registerAs('jwt', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET,
  refreshSecret: process.env.JWT_REFRESH_SECRET,
  accessExpiresIn: process.env.JWT_ACCESS_EXPIRATION || '15m',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
}));

export const redisConfig = registerAs('redis', () => ({
  host: process.env.REDIS_HOST || 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD,
  db: Number(process.env.REDIS_DB) || 0,
}));

export const emailConfig = registerAs('email', () => ({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT ?? 587),
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASS,
}));

export const paymentConfig = registerAs('payment', () => ({
  cmiApiKey: process.env.CMI_API_KEY,
  paypalClientId: process.env.PAYPAL_CLIENT_ID,
  paypalClientSecret: process.env.PAYPAL_CLIENT_SECRET,
}));

export const uploadConfig = registerAs('upload', () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
}));

export const loginLockoutConfig = registerAs('loginLockout', () => ({
  maxFailed: parseInt(process.env.LOGIN_LOCKOUT_MAX_FAILED ?? '7', 10),
  durationMinutes: parseInt(process.env.LOGIN_LOCKOUT_DURATION_MINUTES ?? '30', 10),
  windowMinutes: parseInt(process.env.LOGIN_LOCKOUT_WINDOW_MINUTES ?? '15', 10),
}));
