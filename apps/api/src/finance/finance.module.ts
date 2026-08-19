import { Global, Module } from '@nestjs/common';
import { ChargesService } from './charges.service';
import { ChargesController } from './charges.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { ChargeGeneratorService } from './charge-generator.service';

@Global()
@Module({
  controllers: [ChargesController, ExpensesController, ReportsController],
  providers: [ChargesService, ExpensesService, ReportsService, ChargeGeneratorService],
  exports: [ChargeGeneratorService],
})
export class FinanceModule {}
