import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { PlansService } from './plans.service';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('plans')
@RequirePermissions(PermissionCode.PLATFORM_MANAGE)
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Post()
  create(@Body() dto: CreatePlanDto, @CurrentUser() actor: RequestUser) {
    return this.plansService.create(dto, actor);
  }

  @Get()
  findAll() {
    return this.plansService.findAll();
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePlanDto, @CurrentUser() actor: RequestUser) {
    return this.plansService.update(id, dto, actor);
  }
}
