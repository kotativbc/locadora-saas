import { Module } from '@nestjs/common';
import { LegalController } from './legal.controller';
import { TermsAcceptanceService } from './terms-acceptance.service';
import { PrivacyNoticePdfService } from './privacy-notice-pdf.service';

@Module({
  controllers: [LegalController],
  providers: [TermsAcceptanceService, PrivacyNoticePdfService],
  exports: [PrivacyNoticePdfService],
})
export class LegalModule {}
