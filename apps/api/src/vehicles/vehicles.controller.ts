import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { DocumentsService } from '../documents/documents.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('vehicles')
@RequirePermissions(PermissionCode.FLEET_MANAGE)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateVehicleDto, @CurrentUser() actor: RequestUser) {
    return this.vehiclesService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.vehiclesService.findAll(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.vehiclesService.findOne(id, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateVehicleDto, @CurrentUser() actor: RequestUser) {
    return this.vehiclesService.update(id, dto, actor);
  }

  @Get(':id/documents')
  listDocuments(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.documentsService.listFor('VEHICLE', id, actor);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') id: string,
    @Body('label') label: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ) {
    await this.vehiclesService.findOne(id, actor); // garante que o veículo é da empresa do ator
    return this.documentsService.upload('VEHICLE', id, label || 'Documento', file, actor);
  }
}
