import { Body, Controller, Post, HttpCode, HttpStatus, UseGuards, Req, Res, UnauthorizedException, HttpException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Throttle, ThrottlerGuard, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';

@Controller('auth')
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 900000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      const result = await this.authService.login(dto.identifier, dto.password, req.ip);

      // Set httpOnly cookie for refresh token
      res.cookie('refresh_token', result.refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/api/auth/refresh',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Return only access token and user info (not refresh token)
      const { refresh_token, ...response } = result;
      return response;
    } catch (error) {
      if (error instanceof HttpException && error.getStatus() === HttpStatus.TOO_MANY_REQUESTS) {
        const response = error.getResponse() as any;
        res.setHeader('Retry-After', response.retryAfter || 1800);
      }
      throw error;
    }
  }

  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 900000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: 60000, blockDuration: 900000 } })
  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  async signup(@Body() dto: RegisterDto) {
    return this.register(dto);
  }

  @SkipThrottle()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token not found');
    }

    const result = await this.authService.refreshToken(refreshToken);

    // Set new refresh token cookie
    res.cookie('refresh_token', result.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Return access token and user info
    return {
      access_token: result.access_token,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }

    // Clear refresh token cookie
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/api/auth/refresh',
    });

    return { message: 'Logged out successfully' };
  }
}
