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
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

const MAX_LOGO_BYTES = 2 * 1024 * 1024; // 2MB

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

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
  @RequirePermissions(PermissionCode.COMPANIES_MANAGE)
  update(@Param('id') id: string, @Body() dto: UpdateCompanyDto, @CurrentUser() actor: RequestUser) {
    return this.companiesService.update(id, dto, actor);
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
