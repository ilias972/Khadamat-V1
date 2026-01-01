import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { PrismaService } from '../../common/prisma.service';
import { ThrottlerDebugGuard } from '../../common/guards/throttler-debug.guard';

@Module({
  controllers: [ServicesController],
  providers: [ServicesService, PrismaService, ThrottlerDebugGuard],
})
export class ServicesModule {}
