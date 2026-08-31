import {
  Body,
  Controller,
  Get,
  Ip,
  Param,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ChangeCompanyStatusDto } from './dto/change-company-status.dto';
import { SetUserActiveDto } from './dto/set-user-active.dto';
import { SetCompanyPlanDto } from './dto/set-company-plan.dto';
import { UsersService } from '../users/users.service';
import { AuthService } from '../auth/auth.service';
import { PrivacyNoticePdfService } from '../legal/privacy-notice-pdf.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
    private readonly privacyNoticePdfService: PrivacyNoticePdfService,
  ) {}

  @Post()
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  create(@Body() dto: CreateCompanyDto, @CurrentUser() actor: RequestUser) {
    return this.companiesService.create(dto, actor);
  }

  @Get()
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  findAll() {
    return this.companiesService.findAll();
  }

  @Get('me')
  findMine(@CurrentUser() actor: RequestUser) {
    if (!actor.companyId) {
      return null; // usuário de plataforma (Super Admin) não pertence a uma empresa
    }
    return this.companiesService.findOne(actor.companyId, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.companiesService.findOne(id, actor);
  }

  @Patch(':id')
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE, PermissionCode.PLATFORM_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() actor: RequestUser) {
    return this.companiesService.update(id, dto, actor);
  }

  /** Só Super Admin — muda o estado do ciclo de vida (suspender, reativar, arquivar etc). */
  @Post(':id/status')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  changeStatus(@Param('id') id: string, @Body() dto: ChangeCompanyStatusDto, @CurrentUser() actor: RequestUser) {
    return this.companiesService.changeStatus(id, dto, actor);
  }

  @Get(':id/status-history')
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE, PermissionCode.PLATFORM_MANAGE)
  getStatusHistory(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.companiesService.getStatusHistory(id, actor);
  }

  /** Página de detalhe: dados da empresa + números de consumo (usuários, veículos, clientes, contratos). */
  @Get(':id/summary')
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE, PermissionCode.PLATFORM_MANAGE)
  getSummary(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.companiesService.getSummary(id, actor);
  }

  /** Só Super Admin — troca o plano de uma empresa. */
  @Post(':id/plan')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  setPlan(@Param('id') id: string, @Body() dto: SetCompanyPlanDto, @CurrentUser() actor: RequestUser) {
    return this.companiesService.setPlan(id, dto.planId, actor);
  }

  /**
   * Só Super Admin — gera uma sessão de suporte "somente leitura" pra essa
   * empresa (sem precisar da senha de ninguém). Token curto (10min), sem
   * refresh — o ImpersonationReadOnlyGuard bloqueia qualquer escrita nele
   * globalmente, não é uma promessa da tela.
   */
  @Post(':id/impersonate')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  impersonate(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Ip() ip: string) {
    return this.authService.createImpersonationSession(id, actor, ip);
  }

  // ---------- Suporte: Super Admin agindo sobre usuários de qualquer empresa ----------

  @Get(':id/users')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  listUsers(@Param('id') id: string) {
    return this.usersService.findAllForCompany(id);
  }

  @Patch(':id/users/:userId/active')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  setUserActive(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() dto: SetUserActiveDto,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.usersService.setActiveForSupport(id, userId, dto.active, actor);
  }

  @Post(':id/users/:userId/reset-password')
  @RequirePermissions(PermissionCode.PLATFORM_MANAGE)
  resetUserPassword(@Param('id') id: string, @Param('userId') userId: string, @CurrentUser() actor: RequestUser) {
    return this.usersService.resetPasswordForSupport(id, userId, actor);
  }

  @Post(':id/logo')
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: MAX_LOGO_BYTES },
    }),
  )
  uploadLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ) {
    return this.companiesService.saveLogo(id, file, actor);
  }

  @Get(':id/logo')
  async getLogo(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Res() res: Response) {
    const { absolutePath, filename } = await this.companiesService.readLogo(id, actor);
    res.sendFile(absolutePath, { headers: { 'Content-Disposition': `inline; filename="${filename}"` } });
  }

  /**
   * Aviso de Privacidade (Parte C) gerado automaticamente com os dados desta
   * empresa. Rascunho pra revisão jurídica, não publicação direta — deixa
   * bem marcado no próprio PDF.
   */
  @Get(':id/privacy-notice-pdf')
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE, PermissionCode.PLATFORM_MANAGE)
  async getPrivacyNoticePdf(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Res() res: Response) {
    const company = await this.companiesService.findOne(id, actor);
    const buffer = await this.privacyNoticePdfService.render({ company, generatedAt: new Date() });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="aviso-privacidade-${id.slice(0, 8)}.pdf"`);
    res.send(buffer);
  }
}
