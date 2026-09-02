import { IsBoolean, IsDateString, IsNumberString, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class CreateFineDto {
  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  contractId?: string;

  @IsOptional()
  @IsUUID()
  customerId?: string;

  @IsDateString()
  infractionDate!: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsNumberString()
  amount!: string;

  @IsString()
  @MinLength(3)
  description!: string;

  @IsOptional()
  @IsString()
  documentNumber?: string;

  @IsOptional()
  @IsBoolean()
  chargeToCustomer?: boolean;
}
