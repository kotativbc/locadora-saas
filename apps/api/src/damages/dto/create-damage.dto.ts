import { IsBoolean, IsIn, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateDamageDto {
  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  inspectionId?: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsIn(['minor', 'moderate', 'severe'])
  severity?: 'minor' | 'moderate' | 'severe';

  @IsOptional()
  @IsNumberString()
  estimatedCost?: string;

  @IsOptional()
  @IsBoolean()
  chargeToCustomer?: boolean;
}
