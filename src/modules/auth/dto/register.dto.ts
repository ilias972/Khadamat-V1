import {
  IsEmail,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsIn,
  MinLength,
  MaxLength,
  Matches,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'User password',
    minLength: 8,
    example: 'password123',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/)
  password: string;

  @ApiProperty({
    description: 'User role',
    enum: ['CLIENT', 'PRO'],
    example: 'CLIENT',
  })
  @IsIn(['CLIENT', 'PRO'])
  role: 'CLIENT' | 'PRO';

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  @MinLength(2)
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  @MinLength(2)
  lastName: string;

  @ApiProperty({ description: 'Phone number', example: '+212600000000' })
  @IsPhoneNumber('MA') // Morocco
  phone: string;

  @ApiProperty({
    description: 'Profession (required for PRO role)',
    example: 'Electrician',
    required: false,
  })
  @ValidateIf((obj) => obj.role === 'PRO')
  @IsNotEmpty()
  @IsString()
  profession?: string;

  @ApiProperty({
    description: 'Bio (required for PRO role)',
    example: 'Experienced electrician with 10 years of experience',
    required: false,
  })
  @ValidateIf((obj) => obj.role === 'PRO')
  @IsNotEmpty()
  @IsString()
  bio?: string;
}