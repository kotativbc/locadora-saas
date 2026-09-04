import { Body, Controller, Delete, Get, Param, Patch, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDraftDto } from './dto/update-contract-draft.dto';
import { UpdateContractOperationalDto } from './dto/update-contract-operational.dto';
import { CreateCautionInstallmentDto } from './dto/create-caution-installment.dto';
import { UpdateCautionInstallmentDto } from './dto/update-caution-installment.dto';
import { CreateRentInstallmentDto } from './dto/create-rent-installment.dto';
import { CreateMaintenanceReportDto } from './dto/create-maintenance-report.dto';
import { UpdateMaintenanceReportDto } from './dto/update-maintenance-report.dto';
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

  @Patch(':id/draft')
  updateDraft(@Param('id') id: string, @Body() dto: UpdateContractDraftDto, @CurrentUser() actor: RequestUser) {
    return this.contractsService.updateDraft(id, dto, actor);
  }

  @Patch(':id/operational')
  updateOperational(
    @Param('id') id: string,
    @Body() dto: UpdateContractOperationalDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.updateOperational(id, dto, actor);
  }

  @Post(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.cancel(id, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.remove(id, actor);
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

  @Get(':id/invoice-pdf')
  async getInvoicePdf(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Res() res: Response) {
    const buffer = await this.contractsService.buildInvoicePdf(id, actor);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="fatura-${id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  }

  @Post(':id/send-invoice')
  sendInvoice(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.sendInvoiceByEmail(id, actor);
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

  // ---------- Parcelas de aluguel (cronograma semanal) ----------

  @Get(':id/rent-installments')
  listRentInstallments(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.listRentInstallments(id, actor);
  }

  @Post(':id/rent-installments')
  addRentInstallment(
    @Param('id') id: string,
    @Body() dto: CreateRentInstallmentDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.addRentInstallment(id, dto, actor);
  }

  @Delete(':id/rent-installments/:installmentId')
  removeRentInstallment(
    @Param('id') id: string,
    @Param('installmentId') installmentId: string,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.removeRentInstallment(id, installmentId, actor);
  }

  // ---------- Sinalização de manutenção ----------

  @Post(':id/maintenance-report-link')
  getOrCreateMaintenanceReportLink(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.getOrCreateMaintenanceReportLink(id, actor);
  }

  @Get(':id/maintenance-reports')
  listMaintenanceReports(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.listMaintenanceReports(id, actor);
  }

  @Post(':id/maintenance-reports')
  addMaintenanceReport(
    @Param('id') id: string,
    @Body() dto: CreateMaintenanceReportDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.addMaintenanceReport(id, dto, actor);
  }

  @Patch(':id/maintenance-reports/:reportId')
  updateMaintenanceReportStatus(
    @Param('id') id: string,
    @Param('reportId') reportId: string,
    @Body() dto: UpdateMaintenanceReportDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.contractsService.updateMaintenanceReportStatus(id, reportId, dto, actor);
  }

  @Post(':id/early-return-penalty')
  chargeEarlyReturnPenalty(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.contractsService.chargeEarlyReturnPenalty(id, actor);
  }
}
