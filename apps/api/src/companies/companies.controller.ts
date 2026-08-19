import {
  Body,
  Controller,
  Get,
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
}
