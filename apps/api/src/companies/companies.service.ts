import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { ChangeCompanyStatusDto } from './dto/change-company-status.dto';
import { RoleCode } from '../rbac/rbac.constants';
import { companyLogoDir } from '../common/storage';
import { RequestUser } from '../auth/types';
import {
  CompanyStatus,
  COMPANY_STATUS_LABELS,
  REASON_REQUIRED_STATUSES,
  isValidStatusTransition,
} from './company-status.constants';

@Injectable()
export class CompaniesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  /** Somente Super Admin: cria a empresa e já cria o primeiro usuário Admin dela. Nasce "Ativa". */
  async create(dto: CreateCompanyDto, actor: RequestUser) {
    const emailInUse = await this.prisma.user.findUnique({ where: { email: dto.adminEmail } });
    if (emailInUse) {
      throw new ConflictException('Já existe um usuário com este e-mail.');
    }
    if (dto.cnpj) {
      const cnpjInUse = await this.prisma.company.findUnique({ where: { cnpj: dto.cnpj } });
      if (cnpjInUse) {
        throw new ConflictException('Já existe uma empresa cadastrada com este CNPJ.');
      }
    }

    const companyAdminRole = await this.prisma.role.findUniqueOrThrow({
      where: { code: RoleCode.COMPANY_ADMIN },
    });
    const passwordHash = await argon2.hash(dto.adminPassword);

    const company = await this.prisma.$transaction(async (tx) => {
      const created = await tx.company.create({
        data: { name: dto.name, tradeName: dto.tradeName, cnpj: dto.cnpj, planId: dto.planId, status: CompanyStatus.ACTIVE },
      });

      await tx.companyStatusEvent.create({
        data: { companyId: created.id, fromStatus: null, toStatus: CompanyStatus.ACTIVE, changedByUserId: actor.id },
      });

      await tx.user.create({
        data: {
          companyId: created.id,
          name: dto.adminName,
          email: dto.adminEmail,
          passwordHash,
          roles: { create: { roleId: companyAdminRole.id } },
        },
      });

      return created;
    });

    await this.auditLog.record({
      action: 'company.create',
      userId: actor.id,
      companyId: company.id,
      entityType: 'Company',
      entityId: company.id,
    });

    return company;
  }

  /** Somente Super Admin. */
  async findAll() {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string, actor: RequestUser) {
    this.assertCanAccess(id, actor);
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    return company;
  }

  async update(id: string, dto: UpdateCompanyDto, actor: RequestUser) {
    this.assertCanAccess(id, actor);
    const company = await this.prisma.company.update({ where: { id }, data: dto });

    await this.auditLog.record({
      action: 'company.update',
      userId: actor.id,
      companyId: id,
      entityType: 'Company',
      entityId: id,
      metadata: dto as Record<string, unknown>,
    });

    return company;
  }

  /**
   * Só Super Admin muda o estado do ciclo de vida de uma empresa — nunca o
   * próprio admin da empresa. Valida a transição contra a única fonte de
   * verdade (company-status.constants.ts), exige motivo pros estados que
   * precisam, e grava tanto o histórico quanto a auditoria.
   */
  async changeStatus(id: string, dto: ChangeCompanyStatusDto, actor: RequestUser) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const fromStatus = company.status as CompanyStatus;
    const toStatus = dto.status;

    if (!isValidStatusTransition(fromStatus, toStatus)) {
      throw new BadRequestException(
        `Não é possível ir de "${COMPANY_STATUS_LABELS[fromStatus]}" para "${COMPANY_STATUS_LABELS[toStatus]}".`,
      );
    }
    if (REASON_REQUIRED_STATUSES.has(toStatus) && !dto.reason?.trim()) {
      throw new BadRequestException(
        `Informe o motivo pra mudar o estado da empresa para "${COMPANY_STATUS_LABELS[toStatus]}".`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const result = await tx.company.update({
        where: { id },
        data: { status: toStatus, statusReason: dto.reason ?? null },
      });

      await tx.companyStatusEvent.create({
        data: {
          companyId: id,
          fromStatus,
          toStatus,
          reason: dto.reason,
          changedByUserId: actor.id,
        },
      });

      return result;
    });

    await this.auditLog.record({
      action: 'company.status_change',
      userId: actor.id,
      companyId: id,
      entityType: 'Company',
      entityId: id,
      metadata: { fromStatus, toStatus, reason: dto.reason },
    });

    return updated;
  }

  async getStatusHistory(id: string, actor: RequestUser) {
    this.assertCanAccess(id, actor);
    return this.prisma.companyStatusEvent.findMany({
      where: { companyId: id },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Números de consumo pra página de detalhe — só contagens leves, nada de listar tudo. */
  async getSummary(id: string, actor: RequestUser) {
    this.assertCanAccess(id, actor);
    const company = await this.prisma.company.findUnique({ where: { id }, include: { plan: true } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }

    const [users, vehicles, customers, contracts, activeContracts] = await Promise.all([
      this.prisma.user.count({ where: { companyId: id } }),
      this.prisma.vehicle.count({ where: { companyId: id } }),
      this.prisma.customer.count({ where: { companyId: id } }),
      this.prisma.contract.count({ where: { companyId: id } }),
      this.prisma.contract.count({ where: { companyId: id, status: 'active' } }),
    ]);

    return { company, consumption: { users, vehicles, customers, contracts, activeContracts } };
  }

  /** Só Super Admin — atribui ou remove o plano de uma empresa. */
  async setPlan(id: string, planId: string | undefined, actor: RequestUser) {
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada.');
    }
    if (planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
      if (!plan) {
        throw new NotFoundException('Plano não encontrado.');
      }
    }

    const updated = await this.prisma.company.update({ where: { id }, data: { planId: planId ?? null } });

    await this.auditLog.record({
      action: 'company.plan_change',
      userId: actor.id,
      companyId: id,
      entityType: 'Company',
      entityId: id,
      metadata: { planId: planId ?? null },
    });

    return updated;
  }

  async saveLogo(id: string, file: Express.Multer.File, actor: RequestUser) {
    this.assertCanAccess(id, actor);

    const dir = companyLogoDir(id);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '.png';
    const filename = `logo${ext}`;
    const destination = path.join(dir, filename);
    await fs.writeFile(destination, file.buffer);

    const relativePath = path.join('companies', id, filename);
    await this.prisma.company.update({ where: { id }, data: { logoPath: relativePath } });

    await this.auditLog.record({
      action: 'company.logo_upload',
      userId: actor.id,
      companyId: id,
      entityType: 'Company',
      entityId: id,
    });

    return { logoPath: relativePath };
  }

  async readLogo(id: string, actor: RequestUser): Promise<{ absolutePath: string; filename: string }> {
    this.assertCanAccess(id, actor);
    const company = await this.prisma.company.findUnique({ where: { id } });
    if (!company?.logoPath) {
      throw new NotFoundException('Esta empresa ainda não tem logo cadastrada.');
    }
    const { UPLOADS_ROOT } = await import('../common/storage');
    return { absolutePath: path.join(UPLOADS_ROOT, company.logoPath), filename: path.basename(company.logoPath) };
  }

  /** Super Admin acessa qualquer empresa; os demais só a própria. */
  private assertCanAccess(companyId: string, actor: RequestUser) {
    const isSuperAdmin = actor.roles.includes(RoleCode.SUPER_ADMIN);
    if (!isSuperAdmin && actor.companyId !== companyId) {
      throw new ForbiddenException('Você não tem acesso a esta empresa.');
    }
  }
}
