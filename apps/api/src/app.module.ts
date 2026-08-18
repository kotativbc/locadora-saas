import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { HealthController } from './common/health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    AuthModule,
    RbacModule,
    CompaniesModule,
    UsersModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: primeiro autentica (popula req.user), depois checa permissão.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
