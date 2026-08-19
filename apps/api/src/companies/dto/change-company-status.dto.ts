import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { CompanyStatus } from '../company-status.constants';

export class ChangeCompanyStatusDto {
  @IsEnum(CompanyStatus)
  status!: CompanyStatus;

  @IsOptional()
  @IsString()
  @MinLength(3, { message: 'O motivo precisa ter pelo menos 3 caracteres.' })
  reason?: string;
}
