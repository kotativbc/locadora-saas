import { Controller, Get, Ip, Post } from '@nestjs/common';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { RequestUser } from '../auth/types';

@Controller('legal')
export class LegalController {
  constructor(private readonly termsAcceptanceService: TermsAcceptanceService) {}

  @Get('terms-status')
  getStatus(@CurrentUser() actor: RequestUser) {
    return this.termsAcceptanceService.getStatus(actor);
  }

  @Post('terms-accept')
  accept(@CurrentUser() actor: RequestUser, @Ip() ip: string) {
    return this.termsAcceptanceService.accept(actor, ip);
  }
}
