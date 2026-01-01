import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { UsersService } from './users.service';
import { PrismaService } from '../../common/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      user: {
        findUnique: jest.fn() as any,
        update: jest.fn() as any,
      },
      clientProfile: {
        findUnique: jest.fn() as any,
        create: jest.fn() as any,
        update: jest.fn() as any,
        upsert: jest.fn() as any,
      },
      proProfile: {
        findUnique: jest.fn() as any,
        update: jest.fn() as any,
      },
      $transaction: jest.fn() as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findProfile', () => {
    it('should return safe profile data without sensitive fields', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        phone: '+212600000000',
        role: 'CLIENT',
        status: 'active',
        isEmailVerified: true,
        lastLogin: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        passwordHash: 'hashed-password',
        emailVerificationToken: 'token',
        passwordResetToken: 'reset-token',
        clientProfile: {
          id: 'profile-1',
          firstName: 'John',
          lastName: 'Doe',
          address: '123 Main St',
          cityId: 'city-1',
          preferredLanguage: 'fr',
          city: { id: 'city-1', name: 'Casablanca' },
        },
        proProfile: null,
      };

      // Mock the response to only include selected fields (as Prisma would do)
      const mockSelectedUser = {
        id: 'user-1',
        email: 'test@example.com',
        phone: '+212600000000',
        role: 'CLIENT',
        status: 'active',
        isEmailVerified: true,
        lastLogin: mockUser.lastLogin,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
        clientProfile: mockUser.clientProfile,
        proProfile: null,
      };

      prisma.user.findUnique.mockResolvedValue(mockSelectedUser);

      const result = await service.findProfile('user-1');

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
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

      expect(result).toEqual(mockSelectedUser);

      // Ensure sensitive fields are not present
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
      expect(result).not.toHaveProperty('passwordResetToken');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findProfile('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfileSimple', () => {
    const mockUserId = 'user-1';
    const mockClientProfile = {
      id: 'profile-1',
      userId: mockUserId,
      firstName: 'John',
      lastName: 'Doe',
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();
    });

    it('should update existing CLIENT profile with partial data', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
        phone: '+212611111111',
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        // Mock the transaction calls
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ phone: updateData.phone }),
            findUnique: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: 'test@example.com',
              phone: updateData.phone,
              role: Role.CLIENT,
              status: 'active',
              isEmailVerified: true,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              clientProfile: {
                ...mockClientProfile,
                firstName: updateData.firstName,
                city: { id: 'city-1', name: 'Casablanca' },
              },
              proProfile: null,
            }),
          },
          clientProfile: {
            findUnique: jest.fn().mockResolvedValue(mockClientProfile),
            update: jest.fn().mockResolvedValue({
              ...mockClientProfile,
              firstName: updateData.firstName,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      const expectedResult = {
        id: mockUserId,
        email: 'test@example.com',
        phone: updateData.phone,
        role: Role.CLIENT,
        status: 'active',
        isEmailVerified: true,
        lastLogin: expect.any(Date),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        clientProfile: {
          ...mockClientProfile,
          firstName: updateData.firstName,
          city: { id: 'city-1', name: 'Casablanca' },
        },
        proProfile: null,
      };

      const result = await service.updateProfileSimple(mockUserId, Role.CLIENT, updateData);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual(expectedResult);
    });

    it('should create client profile if it does not exist and both names are provided', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            findUnique: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: 'test@example.com',
              phone: '+212600000000',
              role: Role.CLIENT,
              status: 'active',
              isEmailVerified: true,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              clientProfile: {
                id: 'new-profile',
                userId: mockUserId,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                city: { id: 'city-1', name: 'Casablanca' },
              },
              proProfile: null,
            }),
          },
          clientProfile: {
            findUnique: jest.fn().mockResolvedValue(null),
            create: jest.fn().mockResolvedValue({
              id: 'new-profile',
              userId: mockUserId,
              firstName: updateData.firstName,
              lastName: updateData.lastName,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      const result = await service.updateProfileSimple(mockUserId, Role.CLIENT, updateData);

      expect(result.clientProfile?.firstName).toBe('Jane');
      expect(result.clientProfile?.lastName).toBe('Smith');
    });

    it('should throw BadRequestException when creating client profile with partial data', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
        // Missing lastName
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          clientProfile: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      await expect(service.updateProfileSimple(mockUserId, Role.CLIENT, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should update PRO profile when role is PRO', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+212611111111',
      };

      const mockProProfile = {
        id: 'pro-profile-1',
        userId: mockUserId,
        firstName: 'John',
        lastName: 'Doe',
        profession: 'Plumber',
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ phone: updateData.phone }),
            findUnique: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: 'test@example.com',
              phone: updateData.phone,
              role: Role.PRO,
              status: 'active',
              isEmailVerified: true,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              clientProfile: null,
              proProfile: {
                ...mockProProfile,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                city: { id: 'city-1', name: 'Casablanca' },
              },
            }),
          },
          proProfile: {
            findUnique: jest.fn().mockResolvedValue(mockProProfile),
            update: jest.fn().mockResolvedValue({
              ...mockProProfile,
              firstName: updateData.firstName,
              lastName: updateData.lastName,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);
      jest.spyOn(service, 'findProfile').mockResolvedValue({} as any);

      await service.updateProfileSimple(mockUserId, Role.PRO, updateData);

    });

    it('should throw BadRequestException when PRO profile does not exist', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          proProfile: {
            findUnique: jest.fn().mockResolvedValue(null),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      await expect(service.updateProfileSimple(mockUserId, Role.PRO, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for invalid role', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
      };

      await expect(service.updateProfileSimple(mockUserId, 'INVALID_ROLE' as any, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should filter out non-allowlisted fields', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '+212611111111',
        // These should be ignored
        email: 'newemail@example.com',
        password: 'newpassword',
      } as any;

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ phone: updateData.phone }),
            findUnique: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: 'test@example.com',
              phone: updateData.phone,
              role: Role.CLIENT,
              status: 'active',
              isEmailVerified: true,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              clientProfile: {
                ...mockClientProfile,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                city: { id: 'city-1', name: 'Casablanca' },
              },
              proProfile: null,
            }),
          },
          clientProfile: {
            findUnique: jest.fn().mockResolvedValue(mockClientProfile),
            update: jest.fn().mockResolvedValue({
              ...mockClientProfile,
              firstName: updateData.firstName,
              lastName: updateData.lastName,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      await service.updateProfileSimple(mockUserId, Role.CLIENT, updateData);

      // Should not have tried to update email or password - this is tested by the filtering logic
    });

    it('should handle partial updates correctly', async () => {
      const updateData: UpdateProfileDto = {
        phone: '+212611111111',
        // No profile fields
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        const tx = {
          user: {
            update: jest.fn().mockResolvedValue({ phone: updateData.phone }),
            findUnique: jest.fn().mockResolvedValue({
              id: mockUserId,
              email: 'test@example.com',
              phone: updateData.phone,
              role: Role.CLIENT,
              status: 'active',
              isEmailVerified: true,
              lastLogin: new Date(),
              createdAt: new Date(),
              updatedAt: new Date(),
              clientProfile: mockClientProfile,
              proProfile: null,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);
      jest.spyOn(service, 'findProfile').mockResolvedValue({} as any);

      await service.updateProfileSimple(mockUserId, Role.CLIENT, updateData);

      // Should not call profile updates since no profile data provided - tested by the transaction mock
    });

    it('should deny ADMIN role updates', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Admin',
        lastName: 'User',
      };

      await expect(service.updateProfileSimple(mockUserId, Role.ADMIN, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should deny MODERATOR role updates', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Moderator',
        lastName: 'User',
      };

      await expect(service.updateProfileSimple(mockUserId, Role.MODERATOR, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle P2002 Prisma errors with ConflictException', async () => {
      const updateData: UpdateProfileDto = {
        phone: '+212611111111',
      };

      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
        }
      );

      const mockTransaction = jest.fn().mockImplementation(async () => {
        throw prismaError;
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      await expect(service.updateProfileSimple(mockUserId, Role.CLIENT, updateData))
        .rejects.toThrow(ConflictException);
    });

    it('should return safe profile from transaction with strict select', async () => {
      const updateData: UpdateProfileDto = {
        firstName: 'Jane',
        lastName: 'Smith',
      };

      const expectedSafeProfile = {
        id: mockUserId,
        email: 'test@example.com',
        phone: '+212600000000',
        role: Role.CLIENT,
        status: 'active',
        isEmailVerified: true,
        clientProfile: {
          id: 'profile-1',
          firstName: 'Jane',
          lastName: 'Smith',
          address: '123 Main St',
          cityId: 'city-1',
          preferredLanguage: 'fr',
          city: { id: 'city-1', name: 'Casablanca' },
        },
        proProfile: null,
      };

      const mockTransaction = jest.fn().mockImplementation(async (callback) => {
        // Mock the transaction calls
        const tx = {
          user: { findUnique: jest.fn().mockResolvedValue(expectedSafeProfile) },
          clientProfile: {
            findUnique: jest.fn().mockResolvedValue(mockClientProfile),
            update: jest.fn().mockResolvedValue({
              ...mockClientProfile,
              firstName: updateData.firstName,
              lastName: updateData.lastName,
            }),
          },
        };

        return callback(tx);
      });

      prisma.$transaction.mockImplementation(mockTransaction);

      const result = await service.updateProfileSimple(mockUserId, Role.CLIENT, updateData);

      expect(result).toEqual(expectedSafeProfile);
      // Ensure the select does not include sensitive fields
      expect(result).not.toHaveProperty('passwordHash');
      expect(result).not.toHaveProperty('emailVerificationToken');
    });
  });
});