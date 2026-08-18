import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PublicSignaturesService } from './public-signatures.service';
import { Public } from '../auth/public.decorator';

@Controller('public/contracts')
@Public()
export class PublicSignaturesController {
  constructor(private readonly publicSignaturesService: PublicSignaturesService) {}

  @Get(':token')
  getPreview(@Param('token') token: string) {
    return this.publicSignaturesService.getPreview(token);
  }

  @Get(':token/pdf')
  async getPdf(@Param('token') token: string, @Res() res: Response) {
    const buffer = await this.publicSignaturesService.getPdf(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="contrato.pdf"');
    res.send(buffer);
  }

  @Post(':token/accept')
  accept(@Param('token') token: string, @Req() req: Request) {
    return this.publicSignaturesService.accept(token, req.ip, req.headers['user-agent']);
  }
}
