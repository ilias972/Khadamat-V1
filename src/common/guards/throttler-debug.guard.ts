import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class ThrottlerDebugGuard extends ThrottlerGuard {

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const classRef = context.getClass();

    // Get route information
    const route = `${request.method} ${request.route?.path || request.url}`;
    console.log(`[THROTTLER DEBUG] Route: ${route}`);

    // Check for @SkipThrottle decorator - try different keys
    const skipThrottle1 = this.reflector.getAllAndOverride('throttler:skip', [handler, classRef]);
    const skipThrottle2 = this.reflector.getAllAndOverride('THROTTLER_SKIP', [handler, classRef]);
    const skipThrottle3 = this.reflector.get('throttler:skip', handler);
    const skipThrottle4 = this.reflector.get('THROTTLER_SKIP', handler);
    console.log(`[THROTTLER DEBUG] SkipThrottle (throttler:skip allAndOverride): ${!!skipThrottle1}`);
    console.log(`[THROTTLER DEBUG] SkipThrottle (THROTTLER_SKIP allAndOverride): ${!!skipThrottle2}`);
    console.log(`[THROTTLER DEBUG] SkipThrottle (throttler:skip handler): ${!!skipThrottle3}`);
    console.log(`[THROTTLER DEBUG] SkipThrottle (THROTTLER_SKIP handler): ${!!skipThrottle4}`);

    // Get throttler name from @Throttle decorator
    const throttlerName1 = this.reflector.getAllAndOverride('throttler:name', [handler, classRef]);
    const throttlerName2 = this.reflector.getAllAndOverride('THROTTLER_NAME', [handler, classRef]);
    const throttlerName = throttlerName1 || throttlerName2 || 'default';
    console.log(`[THROTTLER DEBUG] Throttler name: ${throttlerName}`);

    // Log that we're checking throttling
    console.log(`[THROTTLER DEBUG] Checking throttling for route: ${route}`);

    // Call parent canActivate
    const result = await super.canActivate(context);
    console.log(`[THROTTLER DEBUG] Throttling result: ${result}`);

    return result;
  }
}