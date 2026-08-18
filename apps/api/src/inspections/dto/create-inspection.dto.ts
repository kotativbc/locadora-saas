import { IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';

const FUEL_LEVELS = ['cheio', '3/4', '1/2', '1/4', 'reserva'] as const;

export class CreateInspectionDto {
  @IsUUID()
  contractId!: string;

  @IsIn(['delivery', 'return'])
  type!: 'delivery' | 'return';

  @IsInt()
  @Min(0)
  odometerKm!: number;

  @IsIn(FUEL_LEVELS)
  fuelLevel!: (typeof FUEL_LEVELS)[number];

  @IsOptional()
  @IsString()
  exteriorNotes?: string;
}
