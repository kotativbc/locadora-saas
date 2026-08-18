import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ClaimsService } from './claims.service';
import { CreateClaimDto } from './dto/create-claim.dto';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('claims')
@RequirePermissions(PermissionCode.CONTRACTS_MANAGE)
export class ClaimsController {
  constructor(private readonly claimsService: ClaimsService) {}

  @Post()
  create(@Body() dto: CreateClaimDto, @CurrentUser() actor: RequestUser) {
    return this.claimsService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.claimsService.findAll(actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateClaimDto, @CurrentUser() actor: RequestUser) {
    return this.claimsService.update(id, dto, actor);
  }
}
