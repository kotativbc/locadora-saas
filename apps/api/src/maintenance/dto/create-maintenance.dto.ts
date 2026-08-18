import { IsDateString, IsIn, IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateMaintenanceDto {
  @IsUUID()
  vehicleId!: string;

  @IsIn(['preventive', 'corrective'])
  type!: 'preventive' | 'corrective';

  @IsString()
  @MinLength(3)
  description!: string;

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
