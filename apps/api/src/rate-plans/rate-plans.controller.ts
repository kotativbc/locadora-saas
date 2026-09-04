import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { RatePlansService } from './rate-plans.service';
import { CreateRatePlanDto } from './dto/create-rate-plan.dto';
import { UpdateRatePlanDto } from './dto/update-rate-plan.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('rate-plans')
@RequirePermissions(PermissionCode.RATES_MANAGE)
export class RatePlansController {
  constructor(private readonly ratePlansService: RatePlansService) {}

  @Post()
  create(@Body() dto: CreateRatePlanDto, @CurrentUser() actor: RequestUser) {
    return this.ratePlansService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.ratePlansService.findAll(actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateRatePlanDto, @CurrentUser() actor: RequestUser) {
    return this.ratePlansService.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.ratePlansService.remove(id, actor);
  }
}
