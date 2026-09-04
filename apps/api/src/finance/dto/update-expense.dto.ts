import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class UpdateExpenseDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsOptional()
  @IsIn(['maintenance', 'fuel', 'insurance', 'other'])
  category?: 'maintenance' | 'fuel' | 'insurance' | 'other';

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsDateString()
  incurredAt?: string;
}
