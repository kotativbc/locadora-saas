import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  ip: string | null;
  userAgent: string | null;
  method: string;
  path: string;
}

/**
 * Guarda dados da requisição HTTP atual (IP, navegador, rota) num contexto que
 * qualquer serviço, em qualquer profundidade da chamada, consegue ler — sem
 * precisar passar isso manualmente por parâmetro em cada função. Populado uma
 * vez por requisição (ver RequestContextMiddleware) e lido pelo AuditLogService
 * automaticamente, então os 40+ lugares que já chamam `record()` no sistema
 * ganham IP/navegador de graça, sem precisar editar nenhum deles.
 */
@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextData>();

  run(data: RequestContextData, callback: () => void) {
    this.storage.run(data, callback);
  }

  get(): RequestContextData | undefined {
    return this.storage.getStore();
  }
}
