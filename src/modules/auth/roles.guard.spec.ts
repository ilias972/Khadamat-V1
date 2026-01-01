import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, Controller, Get } from '@nestjs/common';
import { RolesGuard } from './roles.guard';
import { Roles } from './roles.decorator';
import { Role } from '@prisma/client';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesGuard,
        Reflector,
      ],
    }).compile();

    guard = module.get<RolesGuard>(RolesGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    let mockContext: ExecutionContext;
    let mockHandler: jest.MockedFunction<any>;
    let mockClass: jest.MockedFunction<any>;

    beforeEach(() => {
      mockHandler = jest.fn();
      mockClass = jest.fn();

      mockContext = {
        getHandler: jest.fn().mockReturnValue(mockHandler),
        getClass: jest.fn().mockReturnValue(mockClass),
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn(),
        }),
      } as any;
    });

    it('should allow access when no roles are set', () => {
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should allow access when class-level role is required and user has matching role', () => {
      const requiredRoles = [Role.CLIENT];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.CLIENT } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when class-level role is required and user role does not match', () => {
      const requiredRoles = [Role.PRO];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.CLIENT } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when handler-level role overrides class-level and user has matching role', () => {
      const requiredRoles = [Role.ADMIN]; // Handler-level overrides
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.ADMIN } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when handler-level role overrides class-level and user role does not match', () => {
      const requiredRoles = [Role.ADMIN]; // Handler-level overrides
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.CLIENT } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should deny access when roles are required but user is missing', () => {
      const requiredRoles = [Role.CLIENT];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: undefined };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });

    it('should allow access when user has one of the required roles', () => {
      const requiredRoles = [Role.CLIENT, Role.PRO];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.PRO } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(true);
    });

    it('should deny access when user does not have any of the required roles', () => {
      const requiredRoles = [Role.PRO, Role.ADMIN];
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

      const mockRequest = { user: { role: Role.CLIENT } };
      mockContext.switchToHttp().getRequest.mockReturnValue(mockRequest);

      const result = guard.canActivate(mockContext);

      expect(result).toBe(false);
    });
  });

  describe('real metadata resolution', () => {
    @Controller('test')
    @Roles(Role.PRO)
    class TestController {
      @Get('class-level')
      classLevelEndpoint() {
        return 'class-level';
      }

      @Get('handler-level')
      @Roles(Role.ADMIN)
      handlerLevelEndpoint() {
        return 'handler-level';
      }
    }

    let testController: TestController;

    beforeEach(() => {
      testController = new TestController();
    });

    it('should allow access to class-level protected endpoint when user has PRO role', () => {
      const context = {
        getHandler: () => testController.classLevelEndpoint,
        getClass: () => TestController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: '1', role: Role.PRO } }),
        }),
      } as any as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should deny access to handler-level protected endpoint when user has PRO role but needs ADMIN', () => {
      const context = {
        getHandler: () => testController.handlerLevelEndpoint,
        getClass: () => TestController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: '1', role: Role.PRO } }),
        }),
      } as any as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(false);
    });

    it('should allow access to handler-level protected endpoint when user has ADMIN role', () => {
      const context = {
        getHandler: () => testController.handlerLevelEndpoint,
        getClass: () => TestController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: '1', role: Role.ADMIN } }),
        }),
      } as any as ExecutionContext;

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });
  });
});