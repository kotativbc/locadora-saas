import { IsString, MinLength } from 'class-validator';

export class SubmitMaintenanceReportDto {
  @IsString()
  @MinLength(3)
  description!: string;
}
