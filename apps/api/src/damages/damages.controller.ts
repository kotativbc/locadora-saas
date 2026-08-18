import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { DamagesService } from './damages.service';
import { CreateDamageDto } from './dto/create-damage.dto';
import { UpdateDamageDto } from './dto/update-damage.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('damages')
@RequirePermissions(PermissionCode.FLEET_MANAGE)
export class DamagesController {
  constructor(private readonly damagesService: DamagesService) {}

  @Post()
  create(@Body() dto: CreateDamageDto, @CurrentUser() actor: RequestUser) {
    return this.damagesService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.damagesService.findAll(actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateDamageDto, @CurrentUser() actor: RequestUser) {
    return this.damagesService.update(id, dto, actor);
  }
}
