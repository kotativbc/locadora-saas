import { IsDateString, IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCustomerDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @MinLength(11)
  document!: string;

  @IsOptional()
  @IsIn(['CPF', 'CNPJ'])
  documentType?: 'CPF' | 'CNPJ';

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  driverLicenseNumber?: string;

  @IsOptional()
  @IsString()
  driverLicenseCategory?: string;

  @IsOptional()
  @IsDateString()
  driverLicenseExpiry?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
