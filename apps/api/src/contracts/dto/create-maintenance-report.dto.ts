import { IsString, MinLength } from 'class-validator';

export class CreateMaintenanceReportDto {
  @IsString()
  @MinLength(3)
  description!: string;
}
