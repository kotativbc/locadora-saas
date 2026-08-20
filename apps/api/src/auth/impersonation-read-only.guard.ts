import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedRequest } from './types';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Roda depois do JwtAuthGuard (precisa de req.user já populado). Se a sessão
 * é de suporte (Super Admin "entrou como" uma empresa), qualquer método que
 * não seja leitura é rejeitado aqui — antes até de checar permissão. Isso
 * garante "somente leitura" de verdade, não é só esconder botão na tela.
 */
@Injectable()
export class ImpersonationReadOnlyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!req.user?.impersonation) {
      return true;
    }
    if (SAFE_METHODS.has(req.method)) {
      return true;
    }
    throw new ForbiddenException(
      'Modo suporte é somente leitura — nenhuma alteração pode ser feita enquanto está "entrando como" esta empresa.',
    );
  }
}
