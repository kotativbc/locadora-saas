import { IsIn, IsInt, IsNumberString, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';

const FUEL_TYPES = ['flex', 'gasolina', 'diesel', 'eletrico', 'hibrido'] as const;

export class CreateVehicleDto {
  @IsString()
  @MinLength(5)
  plate!: string;

  @IsOptional()
  @IsString()
  renavam?: string;

  @IsOptional()
  @IsString()
  chassis?: string;

  @IsString()
  @MinLength(1)
  brand!: string;

  @IsString()
  @MinLength(1)
  model!: string;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  modelYear?: number;

  @IsOptional()
  @IsInt()
  @Min(1950)
  @Max(2100)
  manufactureYear?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsOptional()
  @IsIn(FUEL_TYPES)
  fuelType?: (typeof FUEL_TYPES)[number];

  @IsOptional()
  @IsInt()
  @Min(0)
  odometerKm?: number;

  @IsOptional()
  @IsNumberString()
  fipeValue?: string;

  @IsOptional()
  @IsNumberString()
  acquisitionCost?: string;

  @IsOptional()
  @IsNumberString()
  priorEarnings?: string;

  @IsOptional()
  @IsInt()
  @Min(1000)
  maintenanceIntervalKm?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
