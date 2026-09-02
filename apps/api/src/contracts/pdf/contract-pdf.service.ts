import { Injectable } from '@nestjs/common';
import { renderToBuffer } from '@react-pdf/renderer';
import { ContractPdfDocument, ContractPdfData } from './contract-pdf.template';
import { MonthlyDriverContractPdfDocument, MonthlyDriverContractPdfData } from './monthly-driver-contract-pdf.template';
import { ProtectedContractPdfDocument, ProtectedContractPdfData } from './protected-contract-pdf.template';
import { InvoicePdfDocument, InvoicePdfData } from './invoice-pdf.template';

@Injectable()
export class ContractPdfService {
  async render(data: ContractPdfData): Promise<Buffer> {
    return renderToBuffer(ContractPdfDocument(data));
  }

  async renderMonthlyDriverContract(data: MonthlyDriverContractPdfData): Promise<Buffer> {
    return renderToBuffer(MonthlyDriverContractPdfDocument(data));
  }

  async renderProtectedContract(data: ProtectedContractPdfData): Promise<Buffer> {
    return renderToBuffer(ProtectedContractPdfDocument(data));
  }

  async renderInvoice(data: InvoicePdfData): Promise<Buffer> {
    return renderToBuffer(InvoicePdfDocument(data));
  }
}
