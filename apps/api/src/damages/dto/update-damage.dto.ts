import { IsBoolean, IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateDamageDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsIn(['minor', 'moderate', 'severe'])
  severity?: 'minor' | 'moderate' | 'severe';

  @IsOptional()
  @IsNumberString()
  estimatedCost?: string;

  @IsOptional()
  @IsBoolean()
  chargeToCustomer?: boolean;

  @IsOptional()
  @IsIn(['open', 'resolved'])
  status?: 'open' | 'resolved';
}
