import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../src/common/prisma.service';
import { RedisCacheService } from '../src/common/redis-cache.service';

// Mock RedisCacheService for tests
class MockRedisCacheService {
  async getOrSet(key: string, fn: () => any, ttl?: number) {
    return fn();
  }
  async invalidateUserCache(userId: string) {}
  async invalidateLocationsCache() {}
  async invalidateServicesCache() {}
  async invalidateServiceCategoriesCache() {}
  async invalidateBookingsCache(userId: string) {}
  async invalidateReviewsCache(proId?: string, serviceId?: string) {}
}

@Injectable()
export class TestDatabaseService extends PrismaService implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super(new MockRedisCacheService() as any);
  }

  async onModuleInit() {
    // Set test database URL
    process.env.DATABASE_URL = 'file:./prisma/test.db';
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
  async cleanDatabase() {
    // Clean all tables in reverse order of dependencies
    await this.notification.deleteMany();
    await this.payment.deleteMany();
    await this.proSubscription.deleteMany();
    await this.subscriptionPlan.deleteMany();
    await this.dispute.deleteMany();
    await this.review.deleteMany();
    await this.message.deleteMany();
    await this.conversation.deleteMany();
    await this.booking.deleteMany();
    await this.proService.deleteMany();
    await this.clientProfile.deleteMany();
    await this.proProfile.deleteMany();
    await this.user.deleteMany();
    await this.city.deleteMany();
    await this.serviceCategory.deleteMany();
  }

  async seedTestData() {
    // Create test cities
    const casablanca = await this.city.create({
      data: {
        name: 'Casablanca',
        region: 'Grand Casablanca',
      },
    });

    const rabat = await this.city.create({
      data: {
        name: 'Rabat',
        region: 'Rabat-Salé-Zemmour-Zaër',
      },
    });

    // Create test service categories
    const menageCategory = await this.serviceCategory.create({
      data: {
        name: 'Ménage',
        description: 'Services de nettoyage',
        icon: '🧹',
      },
    });

    const electriciteCategory = await this.serviceCategory.create({
      data: {
        name: 'Électricité',
        description: 'Services électriques',
        icon: '⚡',
      },
    });

    return {
      cities: { casablanca, rabat },
      categories: { menageCategory, electriciteCategory },
    };
  }
}