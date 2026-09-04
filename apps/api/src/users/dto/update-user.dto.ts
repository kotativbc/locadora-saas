import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { COMPANY_SCOPED_ROLES } from './create-user.dto';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(COMPANY_SCOPED_ROLES, { message: 'Papel inválido para um usuário de empresa.' })
  roleCode?: (typeof COMPANY_SCOPED_ROLES)[number];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
