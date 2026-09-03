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
  @IsString()
  identityNumber?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  // Endereço estruturado — obrigatório em cadastro novo. O campo `address`
  // (texto livre) fica só como legado, pra clientes cadastrados antes desta
  // mudança; não é mais preenchido por formulário novo.
  @IsOptional()
  @IsString()
  address?: string;

  @IsString()
  @MinLength(2)
  addressStreet!: string;

  @IsString()
  @MinLength(1)
  addressNumber!: string;

  @IsOptional()
  @IsString()
  addressComplement?: string;

  @IsOptional()
  @IsString()
  addressNeighborhood?: string;

  @IsString()
  @MinLength(2)
  addressCity!: string;

  @IsString()
  @MinLength(2)
  addressState!: string;

  @IsOptional()
  @IsString()
  addressZipCode?: string;

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
  bankName?: string;

  @IsOptional()
  @IsString()
  bankAgency?: string;

  @IsOptional()
  @IsString()
  bankAccount?: string;

  @IsOptional()
  @IsString()
  pixKey?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
