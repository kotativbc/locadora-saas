import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, ApiError } from '../api';
import { BrandMark } from '../components/BrandMark';
import { SignaturePad } from '../components/SignaturePad';

interface Preview {
  type: 'delivery' | 'return';
  contractNumber: number | null;
  customer: { name: string; document: string };
  vehicle: { plate: string; brand: string; model: string; odometerKm: number };
  companyName: string;
}

interface ChecklistItemState {
  category: string;
  item: string;
  checked: boolean;
  note: string;
}

const CHECKLIST_TEMPLATE: { category: string; items: string[] }[] = [
  {
    category: 'Exterior',
    items: [
      'Para-choque dianteiro',
      'Para-choque traseiro',
      'Capô',
      'Teto',
      'Porta-malas',
      'Lateral esquerda',
      'Lateral direita',
      'Para-brisa e vidros',
      'Retrovisores',
      'Rodas e pneus',
      'Faróis e lanternas',
    ],
  },
  {
    category: 'Interior',
    items: ['Bancos', 'Painel', 'Volante', 'Tapetes', 'Ar-condicionado', 'Rádio/multimídia', 'Cintos de segurança'],
  },
  {
    category: 'Documentos e equipamentos obrigatórios',
    items: ['CRLV (documento do veículo)', 'Manual do veículo', 'Estepe', 'Macaco', 'Chave de roda', 'Triângulo de sinalização'],
  },
];

const FUEL_OPTIONS = [
  { value: 'cheio', label: 'Cheio' },
  { value: '3/4', label: '3/4' },
  { value: '1/2', label: '1/2' },
  { value: '1/4', label: '1/4' },
  { value: 'reserva', label: 'Reserva' },
];

export function PublicInspection() {
  const { token } = useParams<{ token: string }>();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const [odometerKm, setOdometerKm] = useState('');
  const [fuelLevel, setFuelLevel] = useState('cheio');
  const [exteriorNotes, setExteriorNotes] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItemState[]>([]);
  const [signerName, setSignerName] = useState('');
  const [signatureImage, setSignatureImage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<Preview>(`/public/inspection/${token}`)
      .then((p) => {
        setPreview(p);
        setOdometerKm(String(p.vehicle.odometerKm));
        setChecklist(
          CHECKLIST_TEMPLATE.flatMap((group) =>
            group.items.map((item) => ({ category: group.category, item, checked: false, note: '' })),
          ),
        );
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Link inválido ou expirado.'))
      .finally(() => setLoading(false));
  }, [token]);

  function toggleItem(category: string, item: string) {
    setChecklist((prev) =>
      prev.map((c) => (c.category === category && c.item === item ? { ...c, checked: !c.checked } : c)),
    );
  }

  function setItemNote(category: string, item: string, note: string) {
    setChecklist((prev) => prev.map((c) => (c.category === category && c.item === item ? { ...c, note } : c)));
  }

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    if (!signatureImage) {
      setError('Desenhe a assinatura antes de enviar.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/public/inspection/${token}`, {
        odometerKm: Number(odometerKm.replace(/\D/g, '')),
        fuelLevel,
        exteriorNotes: exteriorNotes || undefined,
        checklistItems: checklist,
        signerName,
        signatureImage,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Não foi possível enviar. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card" style={{ width: 'min(560px, 92vw)' }}>
        <div className="login-brand">
          <BrandMark size={30} />
          <span className="login-brand__word">
            Rent<em>ovix</em>
          </span>
        </div>

        {loading ? (
          <p>Carregando...</p>
        ) : error && !preview ? (
          <div className="error-banner">{error}</div>
        ) : done ? (
          <>
            <h1>Vistoria registrada</h1>
            <p>
              Obrigado, {signerName}. A vistoria de {preview?.type === 'delivery' ? 'entrega' : 'devolução'} foi
              registrada e assinada com sucesso.
            </p>
          </>
        ) : (
          <>
            <h1>Vistoria de {preview?.type === 'delivery' ? 'entrega' : 'devolução'}</h1>
            <p style={{ marginTop: -8 }}>
              {preview?.companyName} — {preview?.vehicle.plate} {preview?.vehicle.brand} {preview?.vehicle.model}
              {preview?.contractNumber ? ` — Contrato nº ${preview.contractNumber}` : ''}
              <br />
              Cliente: {preview?.customer.name}
            </p>
            {error && <div className="error-banner">{error}</div>}

            <div className="field-group">
              <div className="field-group__label">Leitura no momento</div>
              <div className="field">
                <label>Odômetro (km)</label>
                <input
                  required
                  type="text"
                  inputMode="numeric"
                  value={odometerKm}
                  onChange={(e) => setOdometerKm(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Nível de combustível</label>
                <select value={fuelLevel} onChange={(e) => setFuelLevel(e.target.value)}>
                  {FUEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {CHECKLIST_TEMPLATE.map((group) => (
              <div className="field-group" key={group.category}>
                <div className="field-group__label">{group.category}</div>
                {group.items.map((item) => {
                  const state = checklist.find((c) => c.category === group.category && c.item === item);
                  return (
                    <div key={item} style={{ marginBottom: 10 }}>
                      <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 13.5 }}>
                        <input type="checkbox" checked={state?.checked ?? false} onChange={() => toggleItem(group.category, item)} />
                        {item} — conferido, sem avaria
                      </label>
                      {!state?.checked && (
                        <input
                          style={{ marginTop: 4 }}
                          placeholder="Descreva o que foi observado (opcional)"
                          value={state?.note ?? ''}
                          onChange={(e) => setItemNote(group.category, item, e.target.value)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            <div className="field-group">
              <div className="field-group__label">Observações gerais (opcional)</div>
              <div className="field" style={{ marginBottom: 0 }}>
                <textarea rows={3} value={exteriorNotes} onChange={(e) => setExteriorNotes(e.target.value)} />
              </div>
            </div>

            <div className="field-group">
              <div className="field-group__label">Confirmação e assinatura</div>
              <div className="field">
                <label>Nome de quem está assinando</label>
                <input required value={signerName} onChange={(e) => setSignerName(e.target.value)} />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <label>Assinatura</label>
                <SignaturePad onChange={setSignatureImage} />
              </div>
            </div>

            <button className="btn" type="button" onClick={handleSubmit} disabled={submitting} style={{ width: '100%' }}>
              {submitting ? 'Enviando...' : 'Confirmar e assinar vistoria'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
