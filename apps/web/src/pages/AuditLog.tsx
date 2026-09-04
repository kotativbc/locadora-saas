import { useEffect, useState, type FormEvent, Fragment } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: unknown;
  ip: string | null;
  userAgent: string | null;
  method: string | null;
  path: string | null;
  success: boolean;
  createdAt: string;
  user: { name: string; email: string } | null;
  company: { name: string } | null;
}

interface SearchResult {
  total: number;
  page: number;
  pageSize: number;
  entries: AuditEntry[];
}

interface Company {
  id: string;
  name: string;
}

const ACTION_LABELS: Record<string, string> = {
  'auth.login': 'Login',
  'auth.login_failed': 'Tentativa de login falhou',
  'auth.login_blocked': 'Login bloqueado (empresa suspensa)',
  'auth.access_denied': 'Acesso negado (sem permissão)',
  'auth.refresh': 'Sessão renovada',
  'auth.password_reset_requested': 'Pediu redefinição de senha',
  'auth.password_reset_completed': 'Senha redefinida',
  'company.create': 'Empresa criada',
  'company.update': 'Empresa atualizada',
  'company.logo_upload': 'Logo enviada',
  'company.status_change': 'Estado da empresa alterado',
  'company.plan_change': 'Plano da empresa alterado',
  'company.impersonation_started': 'Modo suporte iniciado',
  'company.permanently_deleted': 'Empresa excluída permanentemente',
  'user.create': 'Usuário criado',
  'user.update': 'Usuário atualizado',
  'user.support_deactivate': 'Usuário desativado (suporte)',
  'user.support_reactivate': 'Usuário reativado (suporte)',
  'user.support_password_reset': 'Senha redefinida (suporte)',
  'vehicle.create': 'Veículo cadastrado',
  'vehicle.update': 'Veículo atualizado',
  'customer.create': 'Cliente cadastrado',
  'customer.update': 'Cliente atualizado',
  'customer.delete': 'Cliente excluído',
  'rate_plan.create': 'Tarifa cadastrada',
  'rate_plan.update': 'Tarifa atualizada',
  'rate_plan.delete': 'Tarifa excluída',
  'contract.create': 'Contrato criado',
  'contract.update_draft': 'Contrato editado (rascunho)',
  'contract.update_operational': 'Contrato editado (operacional)',
  'contract.cancel': 'Contrato cancelado',
  'contract.delete': 'Contrato excluído',
  'contract.signature_link_created': 'Link de assinatura gerado',
  'contract.signed': 'Contrato assinado',
  'contract.delivered': 'Entrega registrada',
  'contract.returned': 'Devolução registrada',
  'contract.rent_installment_added': 'Parcela de aluguel adicionada',
  'contract.maintenance_report_link_created': 'Link de sinalização gerado',
  'contract.maintenance_report_added_by_staff': 'Sinalização registrada pela equipe',
  'contract.maintenance_report_submitted_by_customer': 'Sinalização enviada pelo cliente',
  'contract.invoice_emailed': 'Fatura enviada por e-mail',
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
  'charge.delete': 'Lançamento excluído',
  'expense.create': 'Despesa registrada',
  'plan.create': 'Plano criado',
  'plan.update': 'Plano atualizado',
};

function formatAction(action: string) {
  return ACTION_LABELS[action] ?? action;
}

export function AuditLog() {
  const [result, setResult] = useState<SearchResult | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [successFilter, setSuccessFilter] = useState<'' | 'true' | 'false'>('');
  const [ip, setIp] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (companyId) params.set('companyId', companyId);
      if (userSearch) params.set('userSearch', userSearch);
      if (action) params.set('action', action);
      if (entityType) params.set('entityType', entityType);
      if (successFilter) params.set('success', successFilter);
      if (ip) params.set('ip', ip);
      if (dateFrom) params.set('dateFrom', new Date(dateFrom).toISOString());
      if (dateTo) params.set('dateTo', new Date(dateTo).toISOString());
      params.set('page', String(page));
      params.set('pageSize', '50');

      const res = await api.get<SearchResult>(`/audit-logs?${params.toString()}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar auditoria.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    api.get<Company[]>('/companies').then(setCompanies).catch(() => undefined);
    api.get<string[]>('/audit-logs/actions').then(setActions).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function handleClearFilters() {
    setCompanyId('');
    setUserSearch('');
    setAction('');
    setEntityType('');
    setSuccessFilter('');
    setIp('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
    setTimeout(load, 0);
  }

  const totalPages = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <div>
      <div className="page-header">
        <h1>Auditoria</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Registro detalhado de toda a plataforma — todas as empresas, incluindo tentativas que falharam (login
        errado, acesso negado). Acesso restrito ao administrador da plataforma.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form className="card" onSubmit={handleFilterSubmit}>
        <strong style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>Filtros</strong>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label>Empresa</label>
            <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
              <option value="">Todas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label>Usuário (nome ou e-mail)</label>
            <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)} placeholder="Buscar..." />
          </div>
          <div className="field" style={{ flex: '1 1 220px' }}>
            <label>Ação</label>
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Todas</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {formatAction(a)}
                </option>
              ))}
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label>Tipo de registro</label>
            <input value={entityType} onChange={(e) => setEntityType(e.target.value)} placeholder="Ex: Contract" />
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label>Resultado</label>
            <select value={successFilter} onChange={(e) => setSuccessFilter(e.target.value as typeof successFilter)}>
              <option value="">Todos</option>
              <option value="true">Só bem-sucedidos</option>
              <option value="false">Só falhas/negados</option>
            </select>
          </div>
          <div className="field" style={{ flex: '1 1 160px' }}>
            <label>IP</label>
            <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="Ex: 189.1" />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label>De</label>
            <input type="datetime-local" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 180px', marginBottom: 0 }}>
            <label>Até</label>
            <input type="datetime-local" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button className="btn btn--accent" type="submit">
            Filtrar
          </button>
          <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={handleClearFilters}>
            Limpar filtros
          </button>
        </div>
      </form>

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : !result || result.entries.length === 0 ? (
          <EmptyState title="Nenhum evento encontrado" body="Ajuste os filtros ou aguarde novas ações no sistema." />
        ) : (
          <>
            <p style={{ fontSize: 12.5, color: 'var(--ink-muted)', marginTop: 0 }}>
              {result.total} evento(s) encontrado(s) — página {result.page} de {totalPages}
            </p>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Quando</th>
                  <th>Ação</th>
                  <th>Quem</th>
                  <th>Empresa</th>
                  <th>IP</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((e) => (
                  <Fragment key={e.id}>
                    <tr>
                      <td>
                        {e.success ? (
                          <span style={{ color: 'var(--rtv-success)' }}>●</span>
                        ) : (
                          <span style={{ color: 'var(--rtv-danger)' }} title="Falhou/negado">
                            ●
                          </span>
                        )}
                      </td>
                      <td>{new Date(e.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{formatAction(e.action)}</td>
                      <td>{e.user ? `${e.user.name} (${e.user.email})` : '—'}</td>
                      <td>{e.company?.name ?? '—'}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{e.ip ?? '—'}</td>
                      <td>
                        <button
                          type="button"
                          className="logout-btn"
                          style={{ color: 'var(--primary)', borderColor: 'var(--border)', padding: '2px 10px' }}
                          onClick={() => setExpandedId(expandedId === e.id ? null : e.id)}
                        >
                          {expandedId === e.id ? 'Ocultar' : 'Detalhes'}
                        </button>
                      </td>
                    </tr>
                    {expandedId === e.id && (
                      <tr>
                        <td colSpan={7} style={{ background: 'var(--rtv-surface-alt)' }}>
                          <div style={{ padding: '10px 4px', fontSize: 12.5 }}>
                            <div>
                              <strong>Rota:</strong> {e.method ?? '—'} {e.path ?? '—'}
                            </div>
                            <div>
                              <strong>Navegador/dispositivo:</strong> {e.userAgent ?? '—'}
                            </div>
                            <div>
                              <strong>Tipo/ID do registro:</strong> {e.entityType ?? '—'} {e.entityId ? `— ${e.entityId}` : ''}
                            </div>
                            {!!e.metadata && (
                              <div style={{ marginTop: 6 }}>
                                <strong>Detalhes adicionais:</strong>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, background: '#fff', padding: 8, borderRadius: 6, border: '1px solid var(--border)', marginTop: 4 }}>
                                  {JSON.stringify(e.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <button
                type="button"
                className="logout-btn"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Anterior
              </button>
              <span style={{ fontSize: 12.5, color: 'var(--ink-muted)' }}>
                Página {page} de {totalPages}
              </span>
              <button
                type="button"
                className="logout-btn"
                style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Próxima →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
