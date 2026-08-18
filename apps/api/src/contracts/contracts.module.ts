import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { ContractPdfService } from './pdf/contract-pdf.service';

@Module({
  controllers: [ContractsController],
  providers: [ContractsService, ContractPdfService],
  exports: [ContractsService],
})
export class ContractsModule {}
