import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { FinesService } from './fines.service';
import { CreateFineDto } from './dto/create-fine.dto';
import { UpdateFineDto } from './dto/update-fine.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('fines')
@RequirePermissions(PermissionCode.CONTRACTS_MANAGE)
export class FinesController {
  constructor(private readonly finesService: FinesService) {}

  @Post()
  create(@Body() dto: CreateFineDto, @CurrentUser() actor: RequestUser) {
    return this.finesService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.finesService.findAll(actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFineDto, @CurrentUser() actor: RequestUser) {
    return this.finesService.update(id, dto, actor);
  }
}
