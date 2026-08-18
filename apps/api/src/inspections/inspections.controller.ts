import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('inspections')
@RequirePermissions(PermissionCode.CONTRACTS_MANAGE)
export class InspectionsController {
  constructor(private readonly inspectionsService: InspectionsService) {}

  @Post()
  create(@Body() dto: CreateInspectionDto, @CurrentUser() actor: RequestUser) {
    return this.inspectionsService.create(dto, actor);
  }

  @Get('by-contract/:contractId')
  findAllForContract(@Param('contractId') contractId: string, @CurrentUser() actor: RequestUser) {
    return this.inspectionsService.findAllForContract(contractId, actor);
  }
}
