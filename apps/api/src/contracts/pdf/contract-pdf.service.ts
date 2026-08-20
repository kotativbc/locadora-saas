import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPdfDocument, ContractPdfData } from './contract-pdf.template';
import { MonthlyDriverContractPdfDocument, MonthlyDriverContractPdfData } from './monthly-driver-contract-pdf.template';

@Injectable()
export class ContractPdfService {
  async render(data: ContractPdfData): Promise<Buffer> {
    return renderToBuffer(ContractPdfDocument(data));
  }

  async renderMonthlyDriverContract(data: MonthlyDriverContractPdfData): Promise<Buffer> {
    return renderToBuffer(MonthlyDriverContractPdfDocument(data));
  }
}
