import { ThrottlerGuard } from '@nestjs/throttler';

export class ThrottlerIpGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return req.ip || 'unknown';
  }
}