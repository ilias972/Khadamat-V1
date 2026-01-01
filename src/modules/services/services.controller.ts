import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { CacheTTL, CacheKey } from '@nestjs/cache-manager';
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { ThrottlerDebugGuard } from '../../common/guards/throttler-debug.guard';
import { ServicesService } from './services.service';

interface GetServicesParams {
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
  page: number;
  limit: number;
}

@Controller('services')
@UseGuards(ThrottlerDebugGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @SkipThrottle()
  @Get('categories')
  @CacheKey('services:categories')
  @CacheTTL(600000) // 10 minutes
  async getCategories() {
    return this.servicesService.findAllCategories();
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    return this.servicesService.findCategoryById(id);
  }

  @SkipThrottle()
  @Get()
  async getServices(
    @Query('q') q?: string,
    @Query('categoryId') categoryId?: string,
    @Query('cityId') cityId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('minRating') minRating?: string,
    @Query('verified') verified?: string,
    @Query('premium') premium?: string,
    @Query('sort') sort?: string,
    @Query('order') order?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const minPriceNum = minPrice ? parseFloat(minPrice) : undefined;
    const maxPriceNum = maxPrice ? parseFloat(maxPrice) : undefined;
    const minRatingNum = minRating ? parseFloat(minRating) : undefined;
    const verifiedBool = verified === undefined ? undefined : verified === 'true';
    const premiumBool = premium === undefined ? undefined : premium === 'true';

    const params: GetServicesParams = {
      q,
      categoryId,
      cityId,
      minPrice: minPriceNum,
      maxPrice: maxPriceNum,
      minRating: minRatingNum,
      sort,
      order,
      page: pageNum,
      limit: limitNum,
    };

    if (verifiedBool) params.verified = verifiedBool;
    if (premiumBool) params.premium = premiumBool;

    return this.servicesService.findAll(params);
  }
}
