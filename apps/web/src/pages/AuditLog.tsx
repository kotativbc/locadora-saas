import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';
import { useAuth } from '../auth/AuthContext';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  createdAt: string;
  user: { name: string; email: string } | null;
  company: { name: string } | null;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Login',
  'auth.refresh': 'Sessão renovada',
  'company.create': 'Empresa criada',
  'company.update': 'Empresa atualizada',
  'company.logo_upload': 'Logo enviada',
  'user.create': 'Usuário criado',
  'user.update': 'Usuário atualizado',
  'vehicle.create': 'Veículo cadastrado',
  'vehicle.update': 'Veículo atualizado',
  'customer.create': 'Cliente cadastrado',
  'customer.update': 'Cliente atualizado',
  'rate_plan.create': 'Tarifa cadastrada',
  'rate_plan.update': 'Tarifa atualizada',
  'contract.create': 'Contrato criado',
  'contract.signature_link_created': 'Link de assinatura gerado',
  'contract.signed': 'Contrato assinado',
  'contract.delivered': 'Entrega registrada',
  'contract.returned': 'Devolução registrada',
  'document.upload': 'Documento enviado',
  'damage.create': 'Avaria registrada',
  'damage.update': 'Avaria atualizada',
  'maintenance.create': 'Manutenção registrada',
  'claim.create': 'Sinistro registrado',
  'claim.update': 'Sinistro atualizado',
  'fine.create': 'Multa registrada',
  'fine.update': 'Multa atualizada',
  'tracking.position_recorded': 'Posição registrada',
  'charge.create': 'Lançamento criado',
  'charge.auto_created': 'Lançamento automático',
  'charge.update': 'Lançamento atualizado',
  'expense.create': 'Despesa registrada',
};

export function AuditLog() {
  const { hasPermission } = useAuth();
  const isPlatformWide = hasPermission('platform.manage');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AuditEntry[]>('/audit-logs')
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar auditoria.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Auditoria</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        {isPlatformWide
          ? 'Últimos eventos de toda a plataforma (todas as empresas).'
          : 'Últimos eventos da sua empresa.'}
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : entries.length === 0 ? (
          <EmptyState title="Nenhum evento registrado ainda" body="As ações sensíveis do sistema (login, criações, alterações) aparecem aqui." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Quem</th>
                {isPlatformWide && <th>Empresa</th>}
                <th>IP</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                  <td>{ACTION_LABELS[e.action] ?? e.action}</td>
                  <td>{e.user?.name ?? '—'}</td>
                  {isPlatformWide && <td>{e.company?.name ?? '—'}</td>}
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.ip ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
