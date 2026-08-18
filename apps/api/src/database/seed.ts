import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import {
  PERMISSION_DESCRIPTIONS,
  PermissionCode,
  ROLE_PERMISSIONS,
  RoleCode,
} from '../rbac/rbac.constants';

const prisma = new PrismaClient();

async function main() {
  console.log('Criando permissões...');
  for (const code of Object.values(PermissionCode)) {
    await prisma.permission.upsert({
      where: { code },
      update: { description: PERMISSION_DESCRIPTIONS[code] },
      create: { code, description: PERMISSION_DESCRIPTIONS[code] },
    });
  }

  console.log('Criando papéis e vinculando permissões...');
  for (const roleCode of Object.values(RoleCode)) {
    const role = await prisma.role.upsert({
      where: { code: roleCode },
      update: {},
      create: { code: roleCode, name: roleCode },
    });

    const permissionCodes = ROLE_PERMISSIONS[roleCode];
    for (const permCode of permissionCodes) {
      const permission = await prisma.permission.findUniqueOrThrow({ where: { code: permCode } });
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  const superAdminEmail = process.env.SEED_SUPER_ADMIN_EMAIL;
  const superAdminPassword = process.env.SEED_SUPER_ADMIN_PASSWORD;

  if (superAdminEmail && superAdminPassword) {
    const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });
    if (!existing) {
      console.log(`Criando Super Admin inicial: ${superAdminEmail}`);
      const role = await prisma.role.findUniqueOrThrow({ where: { code: RoleCode.SUPER_ADMIN } });
      const passwordHash = await argon2.hash(superAdminPassword);
      await prisma.user.create({
        data: {
          name: 'Super Admin',
          email: superAdminEmail,
          passwordHash,
          roles: { create: { roleId: role.id } },
        },
      });
    } else {
      console.log('Super Admin já existe, pulando criação.');
    }
  } else {
    console.log(
      'SEED_SUPER_ADMIN_EMAIL / SEED_SUPER_ADMIN_PASSWORD não definidos — nenhum Super Admin criado. ' +
        'Defina essas variáveis no .env e rode "npm run seed" novamente quando quiser criar o primeiro acesso.',
    );
  }

  console.log('Seed concluído.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
