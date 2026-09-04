import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateChargeDto {
  @IsOptional()
  @IsIn(['rental', 'damage', 'fine', 'other'])
  type?: 'rental' | 'damage' | 'fine' | 'other';

  @IsOptional()
  @IsString()
  @MinLength(3)
  description?: string;

  @IsOptional()
  @IsNumberString()
  amount?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['pending', 'paid', 'cancelled'])
  status?: 'pending' | 'paid' | 'cancelled';
}
