import { IsOptional, IsString, IsNumber, IsBoolean, Max, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class GetProsFilterDto {
  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(1000)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @Transform(({ value, obj }) => {
    const candidate = value ?? obj?.q;
    if (candidate === undefined || candidate === null || candidate === '') return undefined;
    return String(candidate);
  })
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const n = Number(value);
    return Number.isNaN(n) ? undefined : n;
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  minRating?: number;

  @IsOptional()
  @Type(() => Number)
  @Transform(({ value }) => (value ? Number(value) : undefined))
  maxPrice?: number;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === 'true')
  verified?: boolean;

  // Optional flag for frontend compatibility (ignored in service filtering)
  @IsOptional()
  @Type(() => Boolean)
  @Transform(({ value }) => value === 'true')
  premium?: boolean;
}
