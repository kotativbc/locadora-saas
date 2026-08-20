import { Body, Controller, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { DocumentsService, MAX_DOCUMENT_BYTES } from '../documents/documents.service';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { PermissionCode } from '../rbac/rbac.constants';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('customers')
@RequirePermissions(PermissionCode.CUSTOMERS_MANAGE)
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    private readonly documentsService: DocumentsService,
  ) {}

  @Post()
  create(@Body() dto: CreateCustomerDto, @CurrentUser() actor: RequestUser) {
    return this.customersService.create(dto, actor);
  }

  @Get()
  findAll(@CurrentUser() actor: RequestUser) {
    return this.customersService.findAll(actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.customersService.findOne(id, actor);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto, @CurrentUser() actor: RequestUser) {
    return this.customersService.update(id, dto, actor);
  }

  @Get(':id/documents')
  listDocuments(@Param('id') id: string, @CurrentUser() actor: RequestUser) {
    return this.documentsService.listFor('CUSTOMER', id, actor);
  }

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }))
  async uploadDocument(
    @Param('id') id: string,
    @Body('label') label: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: RequestUser,
  ) {
    await this.customersService.findOne(id, actor); // garante que o cliente é da empresa do ator
    return this.documentsService.upload('CUSTOMER', id, label || 'Documento', file, actor);
  }
}
