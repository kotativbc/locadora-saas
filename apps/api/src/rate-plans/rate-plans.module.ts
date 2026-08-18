import { Module } from '@nestjs/common';
import { RatePlansService } from './rate-plans.service';
import { RatePlansController } from './rate-plans.controller';

@Module({
  controllers: [RatePlansController],
  providers: [RatePlansService],
})
export class RatePlansModule {}
