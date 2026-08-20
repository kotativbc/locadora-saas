import { IsInt, IsNumberString, IsOptional, IsString, IsUUID, Min, MinLength } from 'class-validator';

export class CreateRatePlanDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsNumberString({}, { message: 'Informe um valor numérico para a diária.' })
  dailyRate!: string;

  @IsOptional()
  @IsNumberString()
  weeklyRate?: string;

  @IsOptional()
  @IsNumberString()
  monthlyRate?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  kmAllowancePerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  kmAllowancePerMonth?: number;

  @IsOptional()
  @IsNumberString()
  extraKmRate?: string;

  @IsOptional()
  @IsNumberString()
  cautionAmount?: string;
}
