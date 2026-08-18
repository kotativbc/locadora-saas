import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPdfDocument, ContractPdfData } from './contract-pdf.template';

@Injectable()
export class ContractPdfService {
  async render(data: ContractPdfData): Promise<Buffer> {
    return renderToBuffer(ContractPdfDocument(data));
  }
}
