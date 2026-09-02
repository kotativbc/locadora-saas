import { Module } from '@nestjs/common';
import { PublicMaintenanceReportsService } from './public-maintenance-reports.service';
import { PublicMaintenanceReportsController } from './public-maintenance-reports.controller';

@Module({
  controllers: [PublicMaintenanceReportsController],
  providers: [PublicMaintenanceReportsService],
})
export class PublicMaintenanceReportsModule {}
