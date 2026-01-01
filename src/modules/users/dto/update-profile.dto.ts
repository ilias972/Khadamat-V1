import { IsOptional, IsString, IsPhoneNumber, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @Transform(({ value }) => value === '' ? undefined : value)
  @IsPhoneNumber('MA') // Assuming Moroccan phone numbers, adjust country code as needed
  phone?: string;

  @IsOptional()
  @IsString()
  cityId?: string;

  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(255)
  address?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(10)
  preferredLanguage?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(1000)
  bio?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  profession?: string;
}