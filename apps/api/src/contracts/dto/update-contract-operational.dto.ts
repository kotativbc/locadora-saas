import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateContractOperationalDto {
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
