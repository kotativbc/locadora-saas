import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Min, MinLength } from 'class-validator';

const STATUSES = ['available', 'rented', 'maintenance', 'inactive'] as const;

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  brand?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  renavam?: string;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsOptional()
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsNumberString()
  fipeValue?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maintenanceIntervalKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
