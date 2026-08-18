import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsString()
  tradeName?: string;

  @IsOptional()
  @IsString()
  cnpj?: string;

  @IsString()
  @MinLength(2)
  adminName!: string;

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @MinLength(8, { message: 'A senha do admin deve ter pelo menos 8 caracteres.' })
  adminPassword!: string;
}
