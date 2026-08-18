import { IsIn, IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

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
  @IsIn(STATUSES)
  status?: (typeof STATUSES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
