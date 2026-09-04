import { IsDateString, IsIn, IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class UpdateContractDraftDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsUUID()
  ratePlanId?: string;

  @IsOptional()
  @IsNumberString()
  dailyRate?: string;

  @IsOptional()
  @IsIn(['standard', 'monthly_app_driver', 'protected'])
  templateType?: 'standard' | 'monthly_app_driver' | 'protected';

  @IsOptional()
  @IsNumberString()
  totalValueOverride?: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
