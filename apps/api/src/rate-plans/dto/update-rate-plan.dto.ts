import { IsBoolean, IsInt, IsNumberString, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class UpdateRatePlanDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsNumberString()
  dailyRate?: string;

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

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
