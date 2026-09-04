import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError, fetchFileUrl, copyToClipboard } from '../api';
import { StatusBadge, type BadgeVariant } from '../components/StatusBadge';
import { EmptyState } from '../components/EmptyState';

interface Customer {
  id: string;
  name: string;
  document: string;
}

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  status: string;
}

interface RatePlan {
  id: string;
  name: string;
  dailyRate: string;
  monthlyRate: string | null;
  kmAllowancePerMonth: number | null;
  extraKmRate: string | null;
  cautionAmount: string | null;
}

interface Contract {
  id: string;
  status: string;
  templateType: string;
  startDate: string;
  endDate: string;
  totalValue: string;
  deliveredAt: string | null;
  returnedAt: string | null;
  customer: { name: string; document: string };
  vehicle: { plate: string; brand: string; model: string };
  signature: { signedAt: string | null; expiresAt: string; token: string } | null;
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Rascunho',
  awaiting_signature: 'Aguardando assinatura',
  active: 'Ativo',
  completed: 'Concluído',
  cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, BadgeVariant> = {
  draft: 'neutral',
  awaiting_signature: 'warning',
  active: 'success',
  completed: 'info',
  cancelled: 'danger',
};

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [ratePlans, setRatePlans] = useState<RatePlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState<{ contractId: string; url: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [inspectionTarget, setInspectionTarget] = useState<{ contract: Contract; type: 'delivery' | 'return' } | null>(
    null,
  );
  const [installmentsTarget, setInstallmentsTarget] = useState<Contract | null>(null);
  const [rentScheduleTarget, setRentScheduleTarget] = useState<Contract | null>(null);
  const [reportsTarget, setReportsTarget] = useState<Contract | null>(null);
  const [sendingInvoiceId, setSendingInvoiceId] = useState<string | null>(null);
  const [invoiceSentMessage, setInvoiceSentMessage] = useState<string | null>(null);
  const [editDraftTarget, setEditDraftTarget] = useState<Contract | null>(null);
  const [editOperationalTarget, setEditOperationalTarget] = useState<Contract | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [c, cu, v, r] = await Promise.all([
        api.get<Contract[]>('/contracts'),
        api.get<Customer[]>('/customers'),
        api.get<Vehicle[]>('/vehicles'),
        api.get<RatePlan[]>('/rate-plans'),
      ]);
      setContracts(c);
      setCustomers(cu);
      setVehicles(v.filter((veh) => veh.status !== 'maintenance' && veh.status !== 'inactive'));
      setRatePlans(r);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar contratos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleGenerateLink(contractId: string) {
    setError(null);
    setCopyStatus('idle');
    try {
      const { token } = await api.post<{ token: string; expiresAt: string }>(
        `/contracts/${contractId}/signature-link`,
      );
      const publicUrl = `${window.location.origin}/assinar/${token}`;
      setLinkInfo({ contractId, url: publicUrl });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar link de assinatura.');
    }
  }

  async function handleCopyLink() {
    if (!linkInfo) return;
    const ok = await copyToClipboard(linkInfo.url);
    setCopyStatus(ok ? 'copied' : 'failed');
    setTimeout(() => setCopyStatus('idle'), 2500);
  }

  async function handleViewPdf(contractId: string) {
    setError(null);
    try {
      const url = await fetchFileUrl(`/contracts/${contractId}/pdf`);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao abrir o PDF.');
    }
  }

  async function handleViewInvoice(contractId: string) {
    setError(null);
    try {
      const url = await fetchFileUrl(`/contracts/${contractId}/invoice-pdf`);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao abrir a fatura.');
    }
  }

  async function handleSendInvoice(contractId: string) {
    setError(null);
    setSendingInvoiceId(contractId);
    try {
      const result = await api.post<{ sent: boolean; to: string }>(`/contracts/${contractId}/send-invoice`);
      setInvoiceSentMessage(`Fatura enviada para ${result.to}.`);
      setTimeout(() => setInvoiceSentMessage(null), 4000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao enviar a fatura por e-mail.');
    } finally {
      setSendingInvoiceId(null);
    }
  }

  async function handleCancelContract(contract: Contract) {
    if (!window.confirm(`Cancelar o contrato de ${contract.customer.name}? O histórico fica guardado, mas ele sai das listas ativas.`)) {
      return;
    }
    setError(null);
    try {
      await api.post(`/contracts/${contract.id}/cancel`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao cancelar o contrato.');
    }
  }

  async function handleDeleteContract(contract: Contract) {
    if (
      !window.confirm(
        `Excluir DEFINITIVAMENTE o contrato de ${contract.customer.name}? Isso não pode ser desfeito. Só é permitido porque ele nunca foi assinado.`,
      )
    ) {
      return;
    }
    setError(null);
    try {
      await api.delete(`/contracts/${contract.id}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao excluir o contrato.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contratos</h1>
        <div className="page-header__rule" />
      </div>

      {error && <div className="error-banner">{error}</div>}
      {invoiceSentMessage && (
        <div style={{ fontSize: 13, color: 'var(--rtv-success)', marginBottom: 12 }}>{invoiceSentMessage}</div>
      )}

      {linkInfo && (
        <div className="card" style={{ borderColor: 'var(--accent)' }}>
          <strong>Link de assinatura gerado</strong>
          <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>
            Mostre este link pro cliente assinar (válido por 48h, uso único):
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={linkInfo.url} style={{ flex: 1, padding: 8, fontFamily: 'var(--font-mono)', fontSize: 12 }} />
            <button className="btn" onClick={handleCopyLink}>
              {copyStatus === 'copied' ? 'Copiado ✓' : 'Copiar'}
            </button>
          </div>
          {copyStatus === 'failed' && (
            <p style={{ fontSize: 12, color: 'var(--danger)', marginTop: 8, marginBottom: 0 }}>
              Não consegui copiar automaticamente — selecione o texto no campo acima e copie manualmente
              (Ctrl+C ou tocar e segurar no celular).
            </p>
          )}
          <button
            className="logout-btn"
            style={{ marginTop: 10, color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
            onClick={() => setLinkInfo(null)}
          >
            Fechar
          </button>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong>{contracts.length} contrato(s)</strong>
          <button className="btn btn--accent" onClick={() => setFormOpen((v) => !v)}>
            {formOpen ? 'Cancelar' : '+ Novo contrato'}
          </button>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : contracts.length === 0 ? (
          <EmptyState title="Nenhum contrato ainda" body="Crie um contrato depois de cadastrar cliente, veículo e tarifa." />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Veículo</th>
                <th>Período</th>
                <th>Valor</th>
                <th>Status</th>
                <th>Entrega/Devolução</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {contracts.map((c) => (
                <tr key={c.id}>
                  <td>{c.customer.name}</td>
                  <td>
                    <span className="plate">{c.vehicle.plate}</span> {c.vehicle.brand} {c.vehicle.model}
                  </td>
                  <td>
                    {new Date(c.startDate).toLocaleDateString('pt-BR')} a{' '}
                    {new Date(c.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td>{formatCurrency(c.totalValue)}</td>
                  <td>
                    <StatusBadge label={STATUS_LABELS[c.status] ?? c.status} variant={STATUS_VARIANT[c.status] ?? 'neutral'} />
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    {c.returnedAt
                      ? `Devolvido em ${new Date(c.returnedAt).toLocaleDateString('pt-BR')}`
                      : c.deliveredAt
                        ? `Entregue em ${new Date(c.deliveredAt).toLocaleDateString('pt-BR')}`
                        : '—'}
                  </td>
                  <td style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} onClick={() => handleViewPdf(c.id)}>
                      PDF
                    </button>
                    {(c.status === 'active' || c.status === 'completed') && (
                      <>
                        <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} onClick={() => handleViewInvoice(c.id)}>
                          Fatura
                        </button>
                        <button
                          className="logout-btn"
                          style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                          disabled={sendingInvoiceId === c.id}
                          onClick={() => handleSendInvoice(c.id)}
                        >
                          {sendingInvoiceId === c.id ? 'Enviando...' : 'Enviar fatura por e-mail'}
                        </button>
                      </>
                    )}
                    {c.status === 'draft' && (
                      <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} onClick={() => handleGenerateLink(c.id)}>
                        Gerar link
                      </button>
                    )}
                    {c.status === 'active' && !c.deliveredAt && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setInspectionTarget({ contract: c, type: 'delivery' })}
                      >
                        Registrar entrega
                      </button>
                    )}
                    {c.status === 'active' && c.deliveredAt && !c.returnedAt && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setInspectionTarget({ contract: c, type: 'return' })}
                      >
                        Registrar devolução
                      </button>
                    )}
                    {c.templateType === 'protected' && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setInstallmentsTarget(c)}
                      >
                        Parcelas da caução
                      </button>
                    )}
                    {c.templateType === 'monthly_app_driver' && c.status === 'draft' && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setRentScheduleTarget(c)}
                      >
                        Cronograma de pagamento
                      </button>
                    )}
                    {c.templateType === 'monthly_app_driver' && c.status === 'active' && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
                        disabled
                        title="Contrato já assinado — o cronograma não pode mais ser alterado"
                      >
                        Cronograma (assinado)
                      </button>
                    )}
                    {(c.status === 'active' || c.status === 'completed') && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setReportsTarget(c)}
                      >
                        Sinalizações
                      </button>
                    )}
                    {(c.status === 'draft' || c.status === 'awaiting_signature') && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setEditDraftTarget(c)}
                      >
                        Editar
                      </button>
                    )}
                    {(c.status === 'active' || c.status === 'completed') && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                        onClick={() => setEditOperationalTarget(c)}
                      >
                        Editar
                      </button>
                    )}
                    {c.status !== 'cancelled' && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--rtv-warning)', borderColor: 'var(--border)' }}
                        onClick={() => handleCancelContract(c)}
                      >
                        Cancelar
                      </button>
                    )}
                    {(c.status === 'draft' || c.status === 'awaiting_signature') && (
                      <button
                        className="logout-btn"
                        style={{ color: 'var(--rtv-danger)', borderColor: 'var(--border)' }}
                        onClick={() => handleDeleteContract(c)}
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editDraftTarget && (
        <EditDraftContractForm
          contract={editDraftTarget}
          customers={customers}
          vehicles={vehicles}
          ratePlans={ratePlans}
          onSaved={() => { setEditDraftTarget(null); load(); }}
          onCancel={() => setEditDraftTarget(null)}
        />
      )}

      {editOperationalTarget && (
        <EditOperationalContractForm
          contract={editOperationalTarget}
          onSaved={() => { setEditOperationalTarget(null); load(); }}
          onCancel={() => setEditOperationalTarget(null)}
        />
      )}

      {inspectionTarget && (
        <InspectionForm
          contract={inspectionTarget.contract}
          type={inspectionTarget.type}
          onDone={() => {
            setInspectionTarget(null);
            load();
          }}
          onCancel={() => setInspectionTarget(null)}
        />
      )}

      {installmentsTarget && (
        <CautionInstallmentsPanel contract={installmentsTarget} onClose={() => setInstallmentsTarget(null)} />
      )}

      {rentScheduleTarget && (
        <RentInstallmentsPanel contract={rentScheduleTarget} onClose={() => setRentScheduleTarget(null)} />
      )}

      {reportsTarget && (
        <MaintenanceReportsPanel contract={reportsTarget} onClose={() => setReportsTarget(null)} />
      )}

      {formOpen && (
        <NewContractForm
          customers={customers}
          vehicles={vehicles}
          ratePlans={ratePlans}
          onCreated={() => {
            setFormOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NewContractForm({
  customers,
  vehicles,
  ratePlans,
  onCreated,
}: {
  customers: Customer[];
  vehicles: Vehicle[];
  ratePlans: RatePlan[];
  onCreated: () => void;
}) {
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '');
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ?? '');
  const [templateType, setTemplateType] = useState<'' | 'standard' | 'monthly_app_driver' | 'protected'>('');
  const monthlyPlans = ratePlans.filter((r) => r.monthlyRate);
  const protectedPlans = ratePlans.filter((r) => r.cautionAmount && r.kmAllowancePerMonth && r.extraKmRate);
  const [rateMode, setRateMode] = useState<'plan' | 'manual'>(ratePlans.length ? 'plan' : 'manual');
  const [ratePlanId, setRatePlanId] = useState(ratePlans[0]?.id ?? '');
  const [dailyRate, setDailyRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selectedMonthlyPlan = monthlyPlans.find((r) => r.id === ratePlanId);
  const selectedProtectedPlan = protectedPlans.find((r) => r.id === ratePlanId);

  function handleTemplateTypeChange(value: '' | 'standard' | 'monthly_app_driver' | 'protected') {
    setTemplateType(value);
    if (value === 'monthly_app_driver') {
      setRateMode('plan');
      setRatePlanId(monthlyPlans[0]?.id ?? '');
    } else if (value === 'protected') {
      setRateMode('plan');
      setRatePlanId(protectedPlans[0]?.id ?? '');
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!templateType) {
      setError('Escolha o tipo de contrato antes de continuar — esse campo não tem valor padrão de propósito.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/contracts', {
        customerId,
        vehicleId,
        templateType,
        ratePlanId: templateType !== 'standard' || rateMode === 'plan' ? ratePlanId : undefined,
        dailyRate: templateType === 'standard' && rateMode === 'manual' ? dailyRate : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao criar contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  if (customers.length === 0 || vehicles.length === 0) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>
          Cadastre pelo menos um cliente e um veículo disponível antes de criar um contrato.
        </p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Novo contrato</h3>
      {error && <div className="error-banner">{error}</div>}

      <div className="field-group">
        <div className="field-group__label">Tipo de contrato</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <select
            required
            value={templateType}
            onChange={(e) => handleTemplateTypeChange(e.target.value as typeof templateType)}
            style={!templateType ? { borderColor: 'var(--rtv-danger)' } : undefined}
          >
            <option value="" disabled>— Escolha o tipo, não tem valor pré-selecionado —</option>
            <option value="standard">Padrão (diária/semanal/mensal)</option>
            <option value="protected">Padrão com Proteção Total (caução, KM controlado, telemetria)</option>
            <option value="monthly_app_driver">Motorista de aplicativo (mensal, com caução e KM controlado)</option>
          </select>
        </div>
        {templateType && (
          <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--rtv-teal-600)', marginTop: 8, marginBottom: 0 }}>
            ✓ Tipo selecionado: {templateType === 'standard' ? 'Padrão' : templateType === 'protected' ? 'Padrão com Proteção Total' : 'Motorista de aplicativo'}
          </p>
        )}
      </div>

      <div className="field-group">
        <div className="field-group__label">Cliente e veículo</div>
        <div className="field">
          <label>Cliente</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.document}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Veículo</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {templateType === 'monthly_app_driver' ? (
        <div className="field-group">
          <div className="field-group__label">Tarifa (motorista de aplicativo)</div>
          {monthlyPlans.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--rtv-danger)', marginTop: 0 }}>
              Nenhuma tarifa com valor mensal cadastrada. Vá em Tarifas e cadastre uma com valor mensal, limite de
              KM e caução antes de criar este tipo de contrato.
            </p>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Plano de tarifa</label>
                <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
                  {monthlyPlans.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {formatCurrency(r.monthlyRate!)}/mês
                    </option>
                  ))}
                </select>
              </div>
              {selectedMonthlyPlan && (
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 10, marginBottom: 0 }}>
                  Limite de KM: {selectedMonthlyPlan.kmAllowancePerMonth ?? 'não definido'} km/mês · KM excedente:{' '}
                  {selectedMonthlyPlan.extraKmRate ? formatCurrency(selectedMonthlyPlan.extraKmRate) : 'não definido'}{' '}
                  · Caução: {selectedMonthlyPlan.cautionAmount ? formatCurrency(selectedMonthlyPlan.cautionAmount) : 'não definida'}
                </p>
              )}
            </>
          )}
        </div>
      ) : templateType === 'protected' ? (
        <div className="field-group">
          <div className="field-group__label">Tarifa (com proteção total)</div>
          {protectedPlans.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--rtv-danger)', marginTop: 0 }}>
              Nenhuma tarifa com caução, limite de KM e KM excedente cadastrados. Vá em Tarifas e preencha esses
              três campos antes de criar este tipo de contrato.
            </p>
          ) : (
            <>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Plano de tarifa</label>
                <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
                  {protectedPlans.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} — {formatCurrency(r.dailyRate)}/dia
                    </option>
                  ))}
                </select>
              </div>
              {selectedProtectedPlan && (
                <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 10, marginBottom: 0 }}>
                  Limite de KM: {selectedProtectedPlan.kmAllowancePerMonth} km/mês · KM excedente:{' '}
                  {formatCurrency(selectedProtectedPlan.extraKmRate!)} · Caução:{' '}
                  {formatCurrency(selectedProtectedPlan.cautionAmount!)}
                </p>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="field-group">
          <div className="field-group__label">Tarifa</div>
          <div className="field">
            <label>Como cobrar</label>
            <select value={rateMode} onChange={(e) => setRateMode(e.target.value as 'plan' | 'manual')}>
              {ratePlans.length > 0 && <option value="plan">Usar tarifa cadastrada</option>}
              <option value="manual">Diária avulsa</option>
            </select>
          </div>
          {rateMode === 'plan' ? (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Plano de tarifa</label>
              <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
                {ratePlans.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {formatCurrency(r.dailyRate)}/dia
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Diária (R$)</label>
              <input required type="number" step="0.01" inputMode="decimal" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </div>
          )}
        </div>
      )}

      <div className="field-group">
        <div className="field-group__label">Período</div>
        <div className="field">
          <label>Data e hora de retirada</label>
          <input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Data e hora de devolução prevista{templateType === 'monthly_app_driver' ? ' (fim do ciclo atual)' : ''}</label>
          <input required type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <button
        className="btn"
        type="submit"
        disabled={submitting || !templateType || (templateType === 'monthly_app_driver' && monthlyPlans.length === 0)}
        style={{ marginTop: 4 }}
      >
        {submitting ? 'Criando...' : 'Criar contrato (rascunho)'}
      </button>
    </form>
  );
}

const FUEL_LEVELS = ['cheio', '3/4', '1/2', '1/4', 'reserva'];

interface CautionInstallment {
  id: string;
  dueDate: string;
  amount: string;
  paidAt: string | null;
}

function MaintenanceReportsPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const [reports, setReports] = useState<
    { id: string; description: string; status: string; reportedByCustomer: boolean; reportedAt: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [link, setLink] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setReports(await api.get(`/contracts/${contract.id}/maintenance-reports`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar sinalizações.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  async function handleGenerateLink() {
    setGeneratingLink(true);
    setError(null);
    try {
      const result = await api.post<{ token: string }>(`/contracts/${contract.id}/maintenance-report-link`);
      setLink(`${window.location.origin}/sinalizar/${result.token}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar o link.');
    } finally {
      setGeneratingLink(false);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/contracts/${contract.id}/maintenance-reports`, { description });
      setDescription('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar sinalização.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(reportId: string, status: string) {
    try {
      await api.patch(`/contracts/${contract.id}/maintenance-reports/${reportId}`, { status });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar status.');
    }
  }

  const STATUS_LABELS: Record<string, string> = { open: 'Aberta', acknowledged: 'Vista', resolved: 'Resolvida' };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Sinalizações de manutenção — {contract.customer.name}</h3>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        O cliente pode avisar diretamente pelo link público, sem precisar logar — ou você registra manualmente se
        ele avisar por telefone/mensagem.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ marginBottom: 16 }}>
        {link ? (
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Link pro cliente</label>
            <input readOnly value={link} onClick={(e) => (e.target as HTMLInputElement).select()} />
          </div>
        ) : (
          <button className="logout-btn" style={{ color: 'var(--primary)', borderColor: 'var(--border)' }} disabled={generatingLink} onClick={handleGenerateLink}>
            {generatingLink ? 'Gerando...' : 'Gerar link público pro cliente'}
          </button>
        )}
      </div>

      {loading ? (
        <p>Carregando...</p>
      ) : reports.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--ink-muted)' }}>Nenhuma sinalização registrada ainda.</p>
      ) : (
        <table style={{ marginBottom: 16 }}>
          <thead>
            <tr>
              <th>Quando</th>
              <th>Origem</th>
              <th>Descrição</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td>{new Date(r.reportedAt).toLocaleString('pt-BR')}</td>
                <td>{r.reportedByCustomer ? 'Cliente' : 'Equipe'}</td>
                <td>{r.description}</td>
                <td>
                  <select value={r.status} onChange={(e) => handleStatusChange(r.id, e.target.value)}>
                    {Object.entries(STATUS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div className="field" style={{ marginBottom: 0, flex: 1 }}>
          <label>Registrar manualmente (cliente avisou por telefone/mensagem)</label>
          <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que o cliente relatou" />
        </div>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Registrar'}
        </button>
      </form>
    </div>
  );
}

function RentInstallmentsPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const [installments, setInstallments] = useState<{ id: string; dueDate: string; amount: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setInstallments(await api.get(`/contracts/${contract.id}/rent-installments`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar cronograma.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/contracts/${contract.id}/rent-installments`, { dueDate, amount });
      setDueDate('');
      setAmount('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar parcela.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(installmentId: string) {
    try {
      await api.delete(`/contracts/${contract.id}/rent-installments/${installmentId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover parcela.');
    }
  }

  const total = installments.reduce((sum, i) => sum + Number(i.amount), 0);
  const contractValue = Number(contract.totalValue);
  const totalMatches = installments.length === 0 || Math.abs(total - contractValue) < 0.01;

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>Cronograma de pagamento — {contract.customer.name}</h3>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Define em quais datas o aluguel mensal ({formatCurrency(contract.totalValue)}) será cobrado, em vez de um
        único lançamento no vencimento. Só pode ser alterado <strong>antes de assinar</strong> — na assinatura, os
        lançamentos são gerados de acordo com o que estiver aqui.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          {installments.length > 0 && (
            <table style={{ marginBottom: 12 }}>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i) => (
                  <tr key={i.id}>
                    <td>{new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td>{formatCurrency(i.amount)}</td>
                    <td>
                      <button
                        type="button"
                        className="logout-btn"
                        style={{ color: 'var(--rtv-danger)', borderColor: 'var(--border)', padding: '2px 10px' }}
                        onClick={() => handleRemove(i.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {installments.length > 0 && (
            <p style={{ fontSize: 13, marginBottom: 16, color: totalMatches ? 'var(--ink-900)' : 'var(--rtv-danger)' }}>
              <strong>
                Total do cronograma: {formatCurrency(total.toFixed(2))} {!totalMatches && `(contrato: ${formatCurrency(contract.totalValue)} — não bate!)`}
              </strong>
            </p>
          )}

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Vencimento</label>
              <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Valor (R$)</label>
              <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Adicionando...' : '+ Adicionar parcela'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

function CautionInstallmentsPanel({ contract, onClose }: { contract: Contract; onClose: () => void }) {
  const [installments, setInstallments] = useState<CautionInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [dueDate, setDueDate] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setInstallments(await api.get<CautionInstallment[]>(`/contracts/${contract.id}/caution-installments`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar parcelas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contract.id]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post(`/contracts/${contract.id}/caution-installments`, { dueDate, amount });
      setDueDate('');
      setAmount('');
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao adicionar parcela.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleTogglePaid(installment: CautionInstallment) {
    try {
      await api.patch(`/contracts/${contract.id}/caution-installments/${installment.id}`, {
        paid: !installment.paidAt,
      });
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao atualizar parcela.');
    }
  }

  async function handleRemove(installmentId: string) {
    try {
      await api.delete(`/contracts/${contract.id}/caution-installments/${installmentId}`);
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao remover parcela.');
    }
  }

  const total = installments.reduce((sum, i) => sum + Number(i.amount), 0);

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <h3 style={{ margin: 0 }}>
          Parcelas da caução — {contract.customer.name}
        </h3>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 0, marginBottom: 14 }}>
        Cronograma manual — cada parcela pode ter valor diferente. Aparece no Anexo II do contrato (PDF) só quando
        houver pelo menos uma parcela cadastrada; sem nenhuma, o PDF mostra a caução como pagamento único.
      </p>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <>
          {installments.length > 0 && (
            <table style={{ marginBottom: 16 }}>
              <thead>
                <tr>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {installments.map((i) => (
                  <tr key={i.id}>
                    <td>{new Date(i.dueDate).toLocaleDateString('pt-BR')}</td>
                    <td>{formatCurrency(i.amount)}</td>
                    <td>
                      <button
                        type="button"
                        className="logout-btn"
                        style={{
                          color: i.paidAt ? 'var(--rtv-success)' : 'var(--ink-muted)',
                          borderColor: 'var(--border)',
                          padding: '2px 10px',
                        }}
                        onClick={() => handleTogglePaid(i)}
                      >
                        {i.paidAt ? `Pago em ${new Date(i.paidAt).toLocaleDateString('pt-BR')}` : 'Marcar como pago'}
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="logout-btn"
                        style={{ color: 'var(--rtv-danger)', borderColor: 'var(--border)', padding: '2px 10px' }}
                        onClick={() => handleRemove(i.id)}
                      >
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {installments.length > 0 && (
            <p style={{ fontSize: 13, marginBottom: 16 }}>
              <strong>Total parcelado: {formatCurrency(total.toFixed(2))}</strong>
            </p>
          )}

          <form onSubmit={handleAdd} style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Vencimento</label>
              <input required type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Valor (R$)</label>
              <input required type="number" step="0.01" inputMode="decimal" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={submitting}>
              {submitting ? 'Adicionando...' : '+ Adicionar parcela'}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

interface FullContract {
  id: string;
  customerId: string;
  vehicleId: string;
  ratePlanId: string | null;
  templateType: string;
  startDate: string;
  endDate: string;
  dailyRateSnapshot: string;
  notes: string | null;
}

function EditDraftContractForm({
  contract,
  customers,
  vehicles,
  ratePlans,
  onSaved,
  onCancel,
}: {
  contract: Contract;
  customers: Customer[];
  vehicles: Vehicle[];
  ratePlans: RatePlan[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [full, setFull] = useState<FullContract | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [templateType, setTemplateType] = useState<'standard' | 'monthly_app_driver' | 'protected'>('standard');
  const [rateMode, setRateMode] = useState<'plan' | 'manual'>('plan');
  const [ratePlanId, setRatePlanId] = useState('');
  const [dailyRate, setDailyRate] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const monthlyPlans = ratePlans.filter((r) => r.monthlyRate);
  const protectedPlans = ratePlans.filter((r) => r.cautionAmount && r.kmAllowancePerMonth && r.extraKmRate);

  useEffect(() => {
    api
      .get<FullContract>(`/contracts/${contract.id}`)
      .then((c) => {
        setFull(c);
        setCustomerId(c.customerId);
        setVehicleId(c.vehicleId);
        setTemplateType(c.templateType as 'standard' | 'monthly_app_driver' | 'protected');
        setRatePlanId(c.ratePlanId ?? '');
        setRateMode(c.ratePlanId ? 'plan' : 'manual');
        setDailyRate(c.dailyRateSnapshot);
        setStartDate(c.startDate.slice(0, 16));
        setEndDate(c.endDate.slice(0, 16));
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar contrato.'));
  }, [contract.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/contracts/${contract.id}/draft`, {
        customerId,
        vehicleId,
        templateType,
        ratePlanId: templateType !== 'standard' || rateMode === 'plan' ? ratePlanId : undefined,
        dailyRate: templateType === 'standard' && rateMode === 'manual' ? dailyRate : undefined,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar o contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="card">
        <div className="error-banner">{loadError}</div>
      </div>
    );
  }
  if (!full) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Carregando...</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit} style={{ borderColor: 'var(--rtv-amber-500)' }}>
      <h3 style={{ marginTop: 0 }}>Editar contrato (ainda não assinado) — {contract.customer.name}</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: -8 }}>
        Como este contrato ainda não foi assinado, dá pra mudar qualquer coisa aqui. Depois de assinado, isso deixa
        de ser possível — só data de devolução e observações continuam editáveis.
      </p>
      {error && <div className="error-banner">{error}</div>}

      <div className="field-group">
        <div className="field-group__label">Tipo de contrato</div>
        <div className="field" style={{ marginBottom: 0 }}>
          <select value={templateType} onChange={(e) => setTemplateType(e.target.value as typeof templateType)}>
            <option value="standard">Padrão (diária/semanal/mensal)</option>
            <option value="protected">Padrão com Proteção Total (caução, KM controlado, telemetria)</option>
            <option value="monthly_app_driver">Motorista de aplicativo (mensal, com caução e KM controlado)</option>
          </select>
        </div>
      </div>

      <div className="field-group">
        <div className="field-group__label">Cliente e veículo</div>
        <div className="field">
          <label>Cliente</label>
          <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.document}
              </option>
            ))}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Veículo</label>
          <select value={vehicleId} onChange={(e) => setVehicleId(e.target.value)}>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plate} — {v.brand} {v.model}
              </option>
            ))}
          </select>
        </div>
      </div>

      {templateType === 'monthly_app_driver' ? (
        <div className="field-group">
          <div className="field-group__label">Tarifa (motorista de aplicativo)</div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Plano de tarifa</label>
            <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              {monthlyPlans.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {formatCurrency(r.monthlyRate!)}/mês
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : templateType === 'protected' ? (
        <div className="field-group">
          <div className="field-group__label">Tarifa (com proteção total)</div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Plano de tarifa</label>
            <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
              {protectedPlans.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} — {formatCurrency(r.dailyRate)}/dia
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="field-group">
          <div className="field-group__label">Tarifa</div>
          <div className="field">
            <label>Como cobrar</label>
            <select value={rateMode} onChange={(e) => setRateMode(e.target.value as 'plan' | 'manual')}>
              {ratePlans.length > 0 && <option value="plan">Usar tarifa cadastrada</option>}
              <option value="manual">Diária avulsa</option>
            </select>
          </div>
          {rateMode === 'plan' ? (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Plano de tarifa</label>
              <select value={ratePlanId} onChange={(e) => setRatePlanId(e.target.value)}>
                {ratePlans.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} — {formatCurrency(r.dailyRate)}/dia
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field" style={{ marginBottom: 0 }}>
              <label>Diária (R$)</label>
              <input required type="number" step="0.01" inputMode="decimal" min="0" value={dailyRate} onChange={(e) => setDailyRate(e.target.value)} />
            </div>
          )}
        </div>
      )}

      <div className="field-group">
        <div className="field-group__label">Período</div>
        <div className="field">
          <label>Data e hora de retirada</label>
          <input required type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </div>
        <div className="field" style={{ marginBottom: 0 }}>
          <label>Data e hora de devolução prevista</label>
          <input required type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function EditOperationalContractForm({
  contract,
  onSaved,
  onCancel,
}: {
  contract: Contract;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [full, setFull] = useState<FullContract | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [endDate, setEndDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<FullContract>(`/contracts/${contract.id}`)
      .then((c) => {
        setFull(c);
        setEndDate(c.endDate.slice(0, 16));
        setNotes(c.notes ?? '');
      })
      .catch((err) => setLoadError(err instanceof ApiError ? err.message : 'Erro ao carregar contrato.'));
  }, [contract.id]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.patch(`/contracts/${contract.id}/operational`, {
        endDate: new Date(endDate).toISOString(),
        notes: notes || undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao salvar o contrato.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="card">
        <div className="error-banner">{loadError}</div>
      </div>
    );
  }
  if (!full) {
    return (
      <div className="card">
        <p style={{ margin: 0 }}>Carregando...</p>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Editar contrato assinado — {contract.customer.name}</h3>
      <p style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: -8 }}>
        Este contrato já foi assinado, então só dá pra ajustar informações operacionais — não os termos que o
        cliente aceitou (cliente, veículo, valores). Se precisar mudar algo maior, cancele este contrato e crie um
        novo.
      </p>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Data e hora de devolução prevista</label>
        <input required type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
      </div>
      <div className="field" style={{ marginBottom: 0 }}>
        <label>Observações (opcional)</label>
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Salvar alterações'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function InspectionForm({
  contract,
  type,
  onDone,
  onCancel,
}: {
  contract: Contract;
  type: 'delivery' | 'return';
  onDone: () => void;
  onCancel: () => void;
}) {
  const [odometerKm, setOdometerKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState('cheio');
  const [exteriorNotes, setExteriorNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [earlyReturn, setEarlyReturn] = useState<{ daysRemaining: number; suggestedPenalty: string } | null>(null);
  const [chargingPenalty, setChargingPenalty] = useState(false);

  const lateDays =
    type === 'return'
      ? Math.ceil((Date.now() - new Date(contract.endDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const result = await api.post<{ earlyReturn: { daysRemaining: number; suggestedPenalty: string } | null }>(
        '/inspections',
        {
          contractId: contract.id,
          type,
          odometerKm: Number(odometerKm),
          fuelLevel,
          exteriorNotes: exteriorNotes || undefined,
        },
      );
      if (result.earlyReturn) {
        // Devolução antecipada — mostra a sugestão de multa em vez de fechar direto.
        setEarlyReturn(result.earlyReturn);
      } else {
        onDone();
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar vistoria.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChargePenalty(charge: boolean) {
    if (!charge) {
      onDone();
      return;
    }
    setChargingPenalty(true);
    setError(null);
    try {
      await api.post(`/contracts/${contract.id}/early-return-penalty`);
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao gerar a cobrança da multa.');
      setChargingPenalty(false);
    }
  }

  if (earlyReturn) {
    return (
      <div className="card" style={{ borderColor: 'var(--accent)' }}>
        <h3 style={{ marginTop: 0 }}>Devolução antecipada — {contract.vehicle.plate}</h3>
        {error && <div className="error-banner">{error}</div>}
        <p style={{ fontSize: 13.5 }}>
          O veículo foi devolvido {earlyReturn.daysRemaining} dia(s) antes da data prevista no contrato. A cláusula
          de devolução antecipada prevê multa de 10% sobre o valor proporcional aos dias não usados:
        </p>
        <p style={{ fontSize: 18, fontWeight: 700, margin: '4px 0 16px' }}>
          {formatCurrency(earlyReturn.suggestedPenalty)}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn" disabled={chargingPenalty} onClick={() => handleChargePenalty(true)}>
            {chargingPenalty ? 'Gerando...' : 'Cobrar esta multa'}
          </button>
          <button
            type="button"
            className="logout-btn"
            style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }}
            disabled={chargingPenalty}
            onClick={() => handleChargePenalty(false)}
          >
            Não cobrar
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="card" style={{ borderColor: 'var(--accent)' }} onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>
        {type === 'delivery' ? 'Registrar entrega' : 'Registrar devolução'} — {contract.vehicle.plate}
      </h3>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Cliente: {contract.customer.name}
      </p>
      {error && <div className="error-banner">{error}</div>}
      {type === 'return' && lateDays > 0 && (
        <div className="error-banner" style={{ background: '#fff4e0', color: '#8a5a00', borderColor: '#f0d8a0' }}>
          Devolução {lateDays} {lateDays === 1 ? 'dia' : 'dias'} após a data prevista ({new Date(contract.endDate).toLocaleDateString('pt-BR')}).
        </div>
      )}
      <div className="field">
        <label>Odômetro (km)</label>
        <input required type="number" min="0" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} />
      </div>
      <div className="field">
        <label>Nível de combustível</label>
        <select value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}>
          {FUEL_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Observações (opcional)</label>
        <input value={exteriorNotes} onChange={(e) => setExteriorNotes(e.target.value)} placeholder="Estado da lataria, itens, etc." />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? 'Salvando...' : 'Confirmar'}
        </button>
        <button type="button" className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
