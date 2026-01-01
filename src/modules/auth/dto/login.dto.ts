import { IsString, IsOptional, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class LoginDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  emailOrPhone?: string;

  @Transform(({ obj }) => obj.identifier || obj.email || obj.emailOrPhone)
  @IsString()
  identifier!: string; // unified from identifier, email, or emailOrPhone

  @IsString()
  @MinLength(8)
  password!: string;
}
