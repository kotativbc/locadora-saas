import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { PrivacyNoticePdfDocument, PrivacyNoticePdfData } from './pdf/privacy-notice-pdf.template';

@Injectable()
export class PrivacyNoticePdfService {
  async render(data: PrivacyNoticePdfData): Promise<Buffer> {
    return renderToBuffer(PrivacyNoticePdfDocument(data));
  }
}
