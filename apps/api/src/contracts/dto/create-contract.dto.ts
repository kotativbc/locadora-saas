import { IsDateString, IsIn, IsNumberString, IsOptional, IsUUID } from 'class-validator';

export class CreateContractDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsUUID()
  ratePlanId?: string;

  // Obrigatório se ratePlanId não for informado — permite negociar uma diária avulsa.
  // Só se aplica ao tipo "standard"; motorista de app sempre usa tarifa cadastrada
  // (precisa dos campos de KM/caução, que não existem numa diária avulsa).
  @IsOptional()
  @IsNumberString()
  dailyRate?: string;

  @IsOptional()
  @IsIn(['standard', 'monthly_app_driver'])
  templateType?: 'standard' | 'monthly_app_driver';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
