import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@prisma/client';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';

type AuthUser = Pick<User, 'id' | 'role'>;
type RequestWithUser = Request & { user: AuthUser };

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Req() req: RequestWithUser) {
    return this.usersService.findProfile(req.user.id);
  }

  @Patch('profile')
  async updateProfile(@Req() req: RequestWithUser, @Body() data: UpdateProfileDto) {
    return this.usersService.updateProfileSimple(req.user.id, req.user.role, data);
  }
}