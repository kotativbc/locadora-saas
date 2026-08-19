import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
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
import { HealthController } from './common/health.controller';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './rbac/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    PrismaModule,
    DocumentsModule,
    FinanceModule,
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
  ],
  controllers: [HealthController],
  providers: [
    // Ordem importa: primeiro autentica (popula req.user), depois checa permissão.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
