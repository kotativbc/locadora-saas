import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { PublicSignaturesService } from './public-signatures.service';
import { Public } from '../auth/public.decorator';

// Token tem entropia alta (32 bytes aleatórios — ver contracts.service.ts),
// mas o limite global (100/min/IP) sozinho não é pensado pra proteger um
// endpoint que aceita um segredo pela URL. Limite dedicado aqui é defesa em
// profundidade, mesmo padrão usado no link de redefinição de senha.
@Controller('public/contracts')
@Public()
export class PublicSignaturesController {
  constructor(private readonly publicSignaturesService: PublicSignaturesService) {}

  @Get(':token')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  getPreview(@Param('token') token: string) {
    return this.publicSignaturesService.getPreview(token);
  }

  @Get(':token/pdf')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async getPdf(@Param('token') token: string, @Res() res: Response) {
    const buffer = await this.publicSignaturesService.getPdf(token);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="contrato.pdf"');
    res.send(buffer);
  }

  @Post(':token/accept')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  accept(@Param('token') token: string, @Req() req: Request) {
    return this.publicSignaturesService.accept(token, req.ip, req.headers['user-agent']);
  }
}
