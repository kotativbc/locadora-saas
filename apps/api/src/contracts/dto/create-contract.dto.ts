import { IsDateString, IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class CreateContractDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  ratePlanId?: string;

  // Obrigatório se ratePlanId não for informado — permite negociar uma diária avulsa.
  @IsOptional()
  @IsNumberString()
  dailyRate?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
