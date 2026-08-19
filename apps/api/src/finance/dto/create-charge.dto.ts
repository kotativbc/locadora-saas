import { IsDateString, IsIn, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateChargeDto {
  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsIn(['rental', 'damage', 'fine', 'other'])
  type!: 'rental' | 'damage' | 'fine' | 'other';

  @IsString()
  @MinLength(3)
  description!: string;

  @IsNumberString()
  amount!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
