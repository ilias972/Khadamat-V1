import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { App } from 'supertest/types';
import request from 'supertest';
import { TestDatabaseService } from './test-database.service';
import { PrismaService } from '../src/common/prisma.service';
import { TestUtils } from './test-utils';
import { RedisCacheService } from '../src/common/redis-cache.service';

// Mock RedisCacheService for tests
const mockRedisCacheService = {
  getOrSet: jest.fn().mockImplementation(async (key, fn) => fn()),
  invalidateUserCache: jest.fn(),
  invalidateLocationsCache: jest.fn(),
  invalidateServicesCache: jest.fn(),
  invalidateServiceCategoriesCache: jest.fn(),
  invalidateBookingsCache: jest.fn(),
  invalidateReviewsCache: jest.fn(),
};

// Import only the modules we need for testing
import { AuthModule } from '../src/modules/auth/auth.module';
import { UsersModule } from '../src/modules/users/users.module';
import { ConfigModule } from '@nestjs/config';
import appConfig, { databaseConfig, jwtConfig, redisConfig, emailConfig, paymentConfig, uploadConfig, loginLockoutConfig } from '../src/config/configuration';
import { ThrottlerModule } from '@nestjs/throttler';
import { RedisProviderModule } from '../src/common/redis/redis.provider';
import { DatabaseModule } from '../src/common/database.module';

describe('Auth Security Integration Tests', () => {
  let app: INestApplication<App>;
  let testDb: TestDatabaseService;
  let testUtils: TestUtils;
  let testData: any;

  beforeAll(async () => {
    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'file:./prisma/test.db';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [appConfig, databaseConfig, jwtConfig, redisConfig, emailConfig, paymentConfig, uploadConfig, loginLockoutConfig],
          envFilePath: '.env',
        }),
        DatabaseModule,
        ThrottlerModule.forRoot({
          throttlers: [
            { name: 'default', ttl: 60000, limit: 200 },
            { name: 'auth', ttl: 60000, limit: 5, blockDuration: 900000 },
          ],
        }),
        RedisProviderModule,
        AuthModule,
        UsersModule,
      ],
    }).overrideProvider('PrismaService')
      .useClass(TestDatabaseService)
      .overrideProvider(RedisCacheService)
      .useValue(mockRedisCacheService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }));

    testDb = new TestDatabaseService();
    testUtils = new TestUtils(app, testDb);

    await app.init();

    // Clean and seed database
    await testDb.cleanDatabase();
    testData = await testDb.seedTestData();
  });

  afterAll(async () => {
    await testDb.$disconnect();
    await app.close();
  });

  afterEach(async () => {
    // Clean database after each test
    await testDb.cleanDatabase();
    testData = await testDb.seedTestData();
  });

  describe('Login, Refresh, and Logout Flow', () => {
    let testClient: any;

    beforeEach(async () => {
      testClient = await testUtils.createTestClient();
    });

    it('should login and set httpOnly refresh token cookie with accessToken response', async () => {
      const loginData = {
        identifier: testClient.credentials.email,
        password: testClient.credentials.password,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      // Verify response contains access_token and user
      expect(response.body).toHaveProperty('access_token');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user.email).toBe(testClient.credentials.email);

      // Verify refresh_token cookie is set (httpOnly, so we check headers)
      const cookies = response.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((cookie: string) => cookie.includes('refresh_token='))).toBe(true);
      expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
    });

    it('should refresh token with cookie and return new accessToken with rotated cookie', async () => {
      // First login to get initial cookie
      const loginData = {
        identifier: testClient.credentials.email,
        password: testClient.credentials.password,
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const initialCookies = loginResponse.headers['set-cookie'];
      const initialRefreshCookie = initialCookies.find((cookie: string) => cookie.startsWith('refresh_token='));

      // Now refresh using the cookie
      const refreshResponse = await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [initialRefreshCookie])
        .expect(200);

      // Verify new access token and user returned
      expect(refreshResponse.body).toHaveProperty('access_token');
      expect(refreshResponse.body).toHaveProperty('user');
      expect(refreshResponse.body.user.email).toBe(testClient.credentials.email);

      // Verify new refresh token cookie is set (different from initial)
      const newCookies = refreshResponse.headers['set-cookie'];
      expect(newCookies).toBeDefined();
      const newRefreshCookie = newCookies.find((cookie: string) => cookie.startsWith('refresh_token='));
      expect(newRefreshCookie).toBeDefined();
      expect(newRefreshCookie).not.toBe(initialRefreshCookie); // Cookie should be rotated
    });

    it('should logout, clear cookie, and prevent further refresh', async () => {
      // First login to get cookie
      const loginData = {
        identifier: testClient.credentials.email,
        password: testClient.credentials.password,
      };

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      const cookies = loginResponse.headers['set-cookie'];
      const refreshCookie = cookies.find((cookie: string) => cookie.startsWith('refresh_token='));

      // Logout with the cookie
      const logoutResponse = await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Cookie', [refreshCookie])
        .expect(200);

      expect(logoutResponse.body).toHaveProperty('message', 'Logged out successfully');

      // Verify cookie is cleared
      const logoutCookies = logoutResponse.headers['set-cookie'];
      const clearCookie = logoutCookies.find((cookie: string) =>
        cookie.includes('refresh_token=') && cookie.includes('Max-Age=0')
      );
      expect(clearCookie).toBeDefined();

      // Try to refresh with the old cookie - should fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [refreshCookie])
        .expect(401);
    });

    it('should fail refresh with invalid cookie', async () => {
      const invalidCookie = 'refresh_token=invalid-token; HttpOnly; Path=/api/auth/refresh; Max-Age=604800';

      await request(app.getHttpServer())
        .post('/auth/refresh')
        .set('Cookie', [invalidCookie])
        .expect(401);
    });

    it('should fail refresh without cookie', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .expect(401);
    });
  });
});