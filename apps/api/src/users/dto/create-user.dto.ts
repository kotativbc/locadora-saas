import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { RoleCode } from '../../rbac/rbac.constants';

export const COMPANY_SCOPED_ROLES = [
  RoleCode.COMPANY_ADMIN,
  RoleCode.FLEET_MANAGER,
  RoleCode.AGENT,
  RoleCode.FINANCE,
  RoleCode.CLIENT,
] as const;

export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter pelo menos 8 caracteres.' })
  password!: string;

  @IsEnum(COMPANY_SCOPED_ROLES, { message: 'Papel inválido para um usuário de empresa.' })
  roleCode!: (typeof COMPANY_SCOPED_ROLES)[number];
}
