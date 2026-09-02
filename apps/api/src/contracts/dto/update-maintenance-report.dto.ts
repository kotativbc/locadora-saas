import { IsIn } from 'class-validator';

export class UpdateMaintenanceReportDto {
  @IsIn(['open', 'acknowledged', 'resolved'])
  status!: 'open' | 'acknowledged' | 'resolved';
}
