import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { VehiclesService } from './vehicles.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { PlanLimitsService } from '../plans/plan-limits.service';
import { RequestUser } from '../auth/types';

/**
 * Isolamento multi-tenant é a garantia mais importante do sistema: usuário
 * da empresa A nunca pode ler ou escrever dado da empresa B, mesmo sabendo o
 * id do registro. Aqui o Prisma é mockado (sem banco de verdade) só pra
 * travar esse comportamento como regressão — se alguém no futuro tirar a
 * checagem de `companyId` por engano num refactor, esse teste quebra.
 */
describe('VehiclesService — isolamento multi-tenant', () => {
  let prisma: { vehicle: { findUnique: jest.Mock; create: jest.Mock } };
  let auditLog: { record: jest.Mock };
  let planLimits: { assertCanAddVehicle: jest.Mock };
  let service: VehiclesService;

  const actorCompanyA: RequestUser = {
    id: 'user-a',
    name: 'Usuário A',
    email: 'a@empresa-a.com',
    companyId: 'company-A',
    roles: ['COMPANY_ADMIN'],
    permissions: [],
  };

  beforeEach(() => {
    prisma = {
      vehicle: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
    };
    auditLog = { record: jest.fn().mockResolvedValue(undefined) };
    planLimits = { assertCanAddVehicle: jest.fn().mockResolvedValue(undefined) };

    service = new VehiclesService(
      prisma as unknown as PrismaService,
      auditLog as unknown as AuditLogService,
      planLimits as unknown as PlanLimitsService,
    );
  });

  it('barra o acesso quando o veículo pertence a outra empresa', async () => {
    prisma.vehicle.findUnique.mockResolvedValue({
      id: 'vehicle-1',
      companyId: 'company-B', // pertence à empresa B
      plate: 'ABC1D23',
    });

    await expect(service.findOne('vehicle-1', actorCompanyA)).rejects.toThrow(ForbiddenException);
  });

  it('devolve o veículo quando ele pertence à mesma empresa do usuário', async () => {
    const vehicle = { id: 'vehicle-1', companyId: 'company-A', plate: 'ABC1D23' };
    prisma.vehicle.findUnique.mockResolvedValue(vehicle);

    await expect(service.findOne('vehicle-1', actorCompanyA)).resolves.toEqual(vehicle);
  });

  it('devolve "não encontrado" (não "acesso negado") quando o veículo simplesmente não existe', async () => {
    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(service.findOne('vehicle-inexistente', actorCompanyA)).rejects.toThrow(NotFoundException);
  });

  it('sempre grava o companyId do ator autenticado, nunca de outro lugar', async () => {
    prisma.vehicle.create.mockResolvedValue({ id: 'new-vehicle', companyId: 'company-A' });
    prisma.vehicle.findUnique.mockResolvedValue(null); // sem placa duplicada

    await service.create(
      { plate: 'xyz9w88', brand: 'Fiat', model: 'Argo' } as any,
      actorCompanyA,
    );

    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ companyId: 'company-A' }) }),
    );
  });
});
