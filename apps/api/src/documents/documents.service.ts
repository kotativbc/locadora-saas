import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../common/audit-log.service';
import { ownerDocumentsDir, UPLOADS_ROOT } from '../common/storage';
import { RequestUser } from '../auth/types';

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024; // 10MB — exportado pra ser usado também no limite do Multer (FileInterceptor) nos controllers, não só nesta checagem tardia
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'application/pdf']);

export type DocumentOwnerType = 'CUSTOMER' | 'VEHICLE' | 'INSPECTION' | 'CLAIM';

const DIR_KIND: Record<DocumentOwnerType, 'customers' | 'vehicles' | 'inspections' | 'claims'> = {
  CUSTOMER: 'customers',
  VEHICLE: 'vehicles',
  INSPECTION: 'inspections',
  CLAIM: 'claims',
};

const ENTITY_TYPE: Record<DocumentOwnerType, string> = {
  CUSTOMER: 'Customer',
  VEHICLE: 'Vehicle',
  INSPECTION: 'Inspection',
  CLAIM: 'Claim',
};

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async upload(
    ownerType: DocumentOwnerType,
    ownerId: string,
    label: string,
    file: Express.Multer.File,
    actor: RequestUser,
  ) {
    if (!actor.companyId) {
      throw new ForbiddenException('Somente usuários de uma empresa podem anexar documentos.');
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new ForbiddenException('Arquivo maior que o limite de 10MB.');
    }
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      throw new ForbiddenException('Tipo de arquivo não permitido. Envie PDF, JPG, PNG ou WEBP.');
    }

    const dirKind = DIR_KIND[ownerType];
    const dir = ownerDocumentsDir(actor.companyId, dirKind, ownerId);
    await fs.mkdir(dir, { recursive: true });

    const ext = path.extname(file.originalname) || '';
    const filename = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, filename), file.buffer);

    const relativePath = path.join(actor.companyId, dirKind, ownerId, filename);

    const doc = await this.prisma.document.create({
      data: {
        companyId: actor.companyId,
        ownerType,
        customerId: ownerType === 'CUSTOMER' ? ownerId : undefined,
        vehicleId: ownerType === 'VEHICLE' ? ownerId : undefined,
        inspectionId: ownerType === 'INSPECTION' ? ownerId : undefined,
        claimId: ownerType === 'CLAIM' ? ownerId : undefined,
        label,
        filePath: relativePath,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        uploadedByUserId: actor.id,
      },
    });

    await this.auditLog.record({
      action: 'document.upload',
      userId: actor.id,
      companyId: actor.companyId,
      entityType: ENTITY_TYPE[ownerType],
      entityId: ownerId,
      metadata: { documentId: doc.id, label },
    });

    return doc;
  }

  async listFor(ownerType: DocumentOwnerType, ownerId: string, actor: RequestUser) {
    if (!actor.companyId) return [];
    return this.prisma.document.findMany({
      where: {
        companyId: actor.companyId,
        ownerType,
        customerId: ownerType === 'CUSTOMER' ? ownerId : undefined,
        vehicleId: ownerType === 'VEHICLE' ? ownerId : undefined,
        inspectionId: ownerType === 'INSPECTION' ? ownerId : undefined,
        claimId: ownerType === 'CLAIM' ? ownerId : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async readFile(documentId: string, actor: RequestUser) {
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) {
      throw new NotFoundException('Documento não encontrado.');
    }
    // Isolamento de tenant: só quem é da mesma empresa do documento pode baixá-lo.
    if (!actor.companyId || doc.companyId !== actor.companyId) {
      throw new ForbiddenException('Você não tem acesso a este documento.');
    }
    return { absolutePath: path.join(UPLOADS_ROOT, doc.filePath), mimeType: doc.mimeType, label: doc.label };
  }
}
