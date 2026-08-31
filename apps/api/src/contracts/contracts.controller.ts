import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { CreateCautionInstallmentDto } from './dto/create-caution-installment.dto';
import { UpdateCautionInstallmentDto } from './dto/update-caution-installment.dto';
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

  // ---------- Parcelas de caução ----------

  @Get(':id/caution-installments')
  listCautionInstallments(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.listCautionInstallments(id, actor);
  }

  @Post(':id/caution-installments')
  addCautionInstallment(
    @Param('id') id: string,
    @Body() dto: CreateCautionInstallmentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.addCautionInstallment(id, dto, actor);
  }

  @Patch(':id/caution-installments/:installmentId')
  setCautionInstallmentPaid(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @Body() dto: UpdateCautionInstallmentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.setCautionInstallmentPaid(id, installmentId, dto, actor);
  }

  @Delete(':id/caution-installments/:installmentId')
  removeCautionInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.removeCautionInstallment(id, installmentId, actor);
  }
}
