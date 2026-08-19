import { Global, Module } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { PlanLimitsService } from './plan-limits.service';

@Global()
@Module({
  controllers: [PlansController],
  providers: [PlansService, PlanLimitsService],
  exports: [PlanLimitsService],
})
export class PlansModule {}
