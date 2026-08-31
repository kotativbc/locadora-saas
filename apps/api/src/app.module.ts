import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { RbacModule } from './rbac/rbac.module';
import { CompaniesModule } from './companies/companies.module';
import { UsersModule } from './users/users.module';
import { CommonModule } from './common/common.module';
import { DocumentsModule } from './documents/documents.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { CustomersModule } from './customers/customers.module';
import { RatePlansModule } from './rate-plans/rate-plans.module';
import { ContractsModule } from './contracts/contracts.module';
import { PublicSignaturesModule } from './public-signatures/public-signatures.module';
import { InspectionsModule } from './inspections/inspections.module';
import { DamagesModule } from './damages/damages.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { ClaimsModule } from './claims/claims.module';
import { FinesModule } from './fines/fines.module';
import { TrackingModule } from './tracking/tracking.module';
import { FinanceModule } from './finance/finance.module';
import { AuditModule } from './audit/audit.module';
import { PlansModule } from './plans/plans.module';
import { BackupsModule } from './backups/backups.module';
import { EmailModule } from './email/email.module';
import { LegalModule } from './legal/legal.module';
import { HealthController } from './common/health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { ImpersonationReadOnlyGuard } from './auth/impersonation-read-only.guard';
import { PermissionsGuard } from './rbac/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Limite padrão: 100 req/min por IP — generoso pro uso normal (uma SPA
    // faz várias chamadas por navegação), mas barra abuso. Rotas sensíveis
    // (login, esqueci senha) têm limite mais apertado via @Throttle() no
    // controller — ver auth.controller.ts.
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
    CommonModule,
    PrismaModule,
    EmailModule,
    DocumentsModule,
    FinanceModule,
    PlansModule,
    LegalModule,
    AuthModule,
    RbacModule,
    CompaniesModule,
    UsersModule,
    VehiclesModule,
    CustomersModule,
    RatePlansModule,
    ContractsModule,
    PublicSignaturesModule,
    InspectionsModule,
    DamagesModule,
    MaintenanceModule,
    ClaimsModule,
    FinesModule,
    TrackingModule,
    AuditModule,
    BackupsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: rate limit primeiro (barra abuso antes de gastar
    // esforço checando token) → autentica → bloqueia escrita se for sessão
    // de suporte → checa permissão.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ImpersonationReadOnlyGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
