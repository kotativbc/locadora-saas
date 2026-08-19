import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateExpenseDto {
  @IsOptional()
  @IsUUID()
  vehicleId?: string;

  @IsIn(['maintenance', 'fuel', 'insurance', 'other'])
  category!: 'maintenance' | 'fuel' | 'insurance' | 'other';

  @IsString()
  @MinLength(3)
  description!: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsDateString()
  incurredAt?: string;
}
