import { Body, Controller, Get, Param, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('contracts')
@RequirePermissions(PermissionCode.CONTRACTS_MANAGE)
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Post()
  create(@Body() dto: CreateContractDto, @CurrentUser() actor: RequestUser) {
    return this.contractsService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.contractsService.findAll(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.findOne(id, actor);
  }

  @Post(':id/signature-link')
  createSignatureLink(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.createSignatureLink(id, actor);
  }

  @Get(':id/pdf')
  async getPdf(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Res() res: Response) {
    const buffer = await this.contractsService.renderPdf(id, actor);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="contrato-${id}.pdf"`);
    res.send(buffer);
  }
}
