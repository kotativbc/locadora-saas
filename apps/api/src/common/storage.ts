import * as path from 'path';

/**
 * Raiz do storage privado da aplicação. Configurável via env pra facilitar
 * teste local; em produção sempre aponta pra /srv/rental-data (fora da pasta
 * pública servida pelo Caddy). Nada aqui é servido estaticamente — todo
 * arquivo é lido e transmitido pela API depois de checar autenticação/permissão.
 */
export const DATA_ROOT = process.env.DATA_ROOT ?? '/srv/rental-data';
export const UPLOADS_ROOT = path.join(DATA_ROOT, 'uploads');

export function companyLogoDir(companyId: string): string {
  return path.join(UPLOADS_ROOT, 'companies', companyId);
}

export function ownerDocumentsDir(companyId: string, ownerType: 'customers' | 'vehicles', ownerId: string): string {
  return path.join(UPLOADS_ROOT, companyId, ownerType, ownerId);
}
