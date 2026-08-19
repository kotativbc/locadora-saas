import { IsInt, IsOptional, IsString, Min, MinLength } from 'class-validator';

export class CreatePlanDto {
  @IsString()
  @MinLength(2)
  code!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxVehicles?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxUsers?: number;
}
