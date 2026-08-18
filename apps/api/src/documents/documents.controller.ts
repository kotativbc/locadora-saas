import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { DocumentsService } from './documents.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':id/file')
  async getFile(@Param('id') id: string, @CurrentUser() actor: RequestUser, @Res() res: Response) {
    const { absolutePath, mimeType, label } = await this.documentsService.readFile(id, actor);
    res.setHeader('Content-Type', mimeType);
    res.sendFile(absolutePath, { headers: { 'Content-Disposition': `inline; filename="${label}"` } });
  }
}
