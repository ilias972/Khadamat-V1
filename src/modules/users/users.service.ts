import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { PrismaService } from '../../common/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        status: true,
        isEmailVerified: true,
        lastLogin: true,
        createdAt: true,
        updatedAt: true,
        clientProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            cityId: true,
            preferredLanguage: true,
            city: { select: { id: true, name: true } },
          },
        },
        proProfile: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            address: true,
            profession: true,
            bio: true,
            cityId: true,
            isVerifiedPro: true,
            isPremium: true,
            averageRating: true,
            totalReviews: true,
            city: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

async updateProfileSimple(userId: string, role: Role, data: UpdateProfileDto) {
  // 1. Security Validation
  if (role === Role.ADMIN || role === Role.MODERATOR) {
    throw new BadRequestException('Admin and moderator profiles cannot be updated via this endpoint');
  }

  const restrictedFields = ['email', 'password', 'balance', 'role', 'isVerified', 'status'];
  if (Object.keys(data).some(key => restrictedFields.includes(key))) {
      throw new BadRequestException('Modification forbidden for sensitive fields');
  }

  // 2. Data Sanitization (Fixes Error 500)
  // Convert empty string "" to undefined for relations
  const cityIdCleaned = (data.cityId && data.cityId !== '') ? data.cityId : undefined;

  // 3. Prepare Updates
  const userUpdates: any = {};
  if (data.phone) userUpdates.phone = data.phone;

  const profileUpdates: any = {};
  if (data.firstName) profileUpdates.firstName = data.firstName;
  if (data.lastName) profileUpdates.lastName = data.lastName;

  // LOGIC FIX: Handle address for EVERYONE (Client & Pro)
  if (data.address !== undefined) profileUpdates.address = data.address;

  if (cityIdCleaned !== undefined) profileUpdates.cityId = cityIdCleaned;

  // Role Specific Mapping
  if (role === Role.CLIENT) {
      if (data.preferredLanguage) profileUpdates.preferredLanguage = data.preferredLanguage;
  } else if (role === Role.PRO) {
      if (data.bio !== undefined) profileUpdates.bio = data.bio;
      if (data.profession) profileUpdates.profession = data.profession;
  }

  try {
    return await this.prisma.$transaction(async (tx) => {
      // A. Update User
      if (Object.keys(userUpdates).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userUpdates });
      }

      // B. Upsert Profile
      if (Object.keys(profileUpdates).length > 0 || cityIdCleaned !== undefined) {
        if (role === Role.CLIENT) {
          await tx.clientProfile.upsert({
            where: { userId },
            create: {
              userId,
              firstName: profileUpdates.firstName || '',
              lastName: profileUpdates.lastName || '',
              address: profileUpdates.address || null,
              cityId: cityIdCleaned,
              preferredLanguage: profileUpdates.preferredLanguage || 'fr',
            },
            update: profileUpdates,
          });
        } else if (role === Role.PRO) {
           await tx.proProfile.upsert({
            where: { userId },
            create: {
              userId,
              firstName: profileUpdates.firstName || '',
              lastName: profileUpdates.lastName || '',
              // Fix: Provide default profession to avoid crash on creation
              profession: profileUpdates.profession || 'Non spécifié',
              bio: profileUpdates.bio || null,
              address: profileUpdates.address || null, // Storing address for Pro now
              cityId: cityIdCleaned,
            },
            update: profileUpdates,
          });
        }
      }
      // Return full profile
      return this.findProfile(userId);
    });
  } catch (error) {
    if (error instanceof PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('Phone number already in use');
      if (error.code === 'P2003') throw new BadRequestException('Invalid City ID provided');
    }
    console.error('Update Profile Error:', error);
    throw error;
  }
}
}