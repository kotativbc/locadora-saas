import { IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateMaintenanceDto {
  @IsOptional()
  @IsIn(['preventive', 'corrective'])
  type?: 'preventive' | 'corrective';

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsDateString()
  performedAt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsNumberString()
  cost?: string;

  @IsOptional()
  @IsString()
  vendor?: string;

  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  nextDueKm?: number;
}
