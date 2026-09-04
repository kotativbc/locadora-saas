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
  @IsIn(['standard', 'monthly_app_driver', 'protected'])
  templateType?: 'standard' | 'monthly_app_driver' | 'protected';

  // Controle manual: o sistema sugere o valor a partir da tarifa (dias x diária,
  // ou o valor mensal cheio), mas quem está criando pode ajustar — útil quando o
  // período não fecha em meses/dias redondos, ou quando o valor foi negociado
  // diferente do que a tarifa calcularia sozinha.
  @IsOptional()
  @IsNumberString()
  totalValueOverride?: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
