import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PrismaService } from '../../common/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ServicesService {
  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async findAllCategories() {
    return this.prisma.serviceCategory.findMany({
      where: { isActive: true },
    });
  }

  async findCategoryById(id: string) {
    return this.prisma.serviceCategory.findUnique({
      where: { id },
    });
  }

  async findAll(options: {
    q?: string;
    categoryId?: string;
    cityId?: string;
    minPrice?: number;
    maxPrice?: number;
    minRating?: number;
    verified?: boolean;
    premium?: boolean;
    sort?: string;
    order?: string;
    page?: number;
    limit?: number;
  }) {
    const cacheKey = `services:search:${JSON.stringify(options)}`;
    const cached = await this.cacheManager.get(cacheKey);
    if (cached) return cached;

    const {
      q,
      categoryId,
      cityId,
      minPrice,
      maxPrice,
      minRating,
      verified,
      premium,
      sort,
      order,
      page = 1,
      limit = 10,
    } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.ProServiceWhereInput = {
      isActive: true,
    };

    // Advanced search across multiple fields
    if (q) {
      where.OR = [
        { description: { contains: q, mode: 'insensitive' } },
        { proProfile: { profession: { contains: q, mode: 'insensitive' } } },
        { proProfile: { bio: { contains: q, mode: 'insensitive' } } },
        { proProfile: { firstName: { contains: q, mode: 'insensitive' } } },
        { proProfile: { lastName: { contains: q, mode: 'insensitive' } } },
        { serviceCategory: { name: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Category filter
    if (categoryId) {
      where.serviceCategoryId = categoryId;
    }

    // City filter
    if (cityId) {
      where.cityId = cityId;
    }

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.basePrice = {};
      if (minPrice !== undefined) {
        where.basePrice.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.basePrice.lte = maxPrice;
      }
    }

    // Build proProfile where conditions
    const proProfileWhere: any = {};
    if (minRating !== undefined) {
      proProfileWhere.averageRating = { gte: minRating };
    }
    if (verified) {
      proProfileWhere.isVerifiedPro = true;
    }
    if (premium) {
      proProfileWhere.isPremium = true;
    }
    if (Object.keys(proProfileWhere).length > 0) {
      where.proProfile = proProfileWhere;
    }

    // Sorting logic
    let orderBy: any[] = [];

    if (sort) {
      const sortField = sort.toLowerCase();
      const sortOrder = order?.toLowerCase() === 'asc' ? 'asc' : 'desc';

      switch (sortField) {
        case 'rating':
          orderBy.push({ proProfile: { averageRating: sortOrder } });
          break;
        case 'price':
          orderBy.push({ basePrice: sortOrder });
          break;
        case 'reviews':
          orderBy.push({ proProfile: { totalReviews: sortOrder } });
          break;
        case 'date':
          orderBy.push({ createdAt: sortOrder });
          break;
        default:
          // Invalid sort field, fall back to default
          break;
      }
    }

    // Default sorting: isVerifiedPro DESC, averageRating DESC, totalReviews DESC, basePrice ASC
    if (orderBy.length === 0) {
      orderBy = [
        { proProfile: { isVerifiedPro: 'desc' } },
        { proProfile: { averageRating: 'desc' } },
        { proProfile: { totalReviews: 'desc' } },
        { basePrice: 'asc' },
      ];
    }

    const [services, total] = await Promise.all([
      this.prisma.proService.findMany({
        where,
        include: {
          proProfile: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profession: true,
              bio: true,
              averageRating: true,
              totalReviews: true,
              isVerifiedPro: true,
              isPremium: true,
            },
          },
          serviceCategory: true,
          city: true,
        },
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.proService.count({ where }),
    ]);

    const result = {
      services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await this.cacheManager.set(cacheKey, result, 300000); // 5 minutes
    return result;
  }
}