import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../api';

interface Vehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
}

interface Position {
  latitude: number | null;
  longitude: number | null;
  locationText: string | null;
  recordedAt: string;
  source: string;
}

interface FleetEntry {
  vehicle: Vehicle;
  position: Position | null;
}

function formatPosition(p: Position) {
  if (p.locationText) return p.locationText;
  if (p.latitude !== null && p.longitude !== null) return `${p.latitude}, ${p.longitude}`;
  return '—';
}

export function Tracking() {
  const [entries, setEntries] = useState<FleetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formVehicle, setFormVehicle] = useState<Vehicle | null>(null);
  const [historyFor, setHistoryFor] = useState<Vehicle | null>(null);
  const [history, setHistory] = useState<Position[]>([]);

  async function load() {
    setLoading(true);
    try {
      setEntries(await api.get<FleetEntry[]>('/tracking/fleet'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar rastreamento.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleShowHistory(vehicle: Vehicle) {
    setHistoryFor(vehicle);
    try {
      setHistory(await api.get<Position[]>(`/tracking/vehicles/${vehicle.id}/history`));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao carregar histórico.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Rastreamento</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Modo manual — sem integração com rastreador. A posição é registrada por quem estiver com o veículo ou
        pela equipe.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Última posição</th>
                <th>Registrado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.vehicle.id}>
                  <td>
                    <span className="plate">{e.vehicle.plate}</span> {e.vehicle.brand} {e.vehicle.model}
                  </td>
                  <td>{e.position ? formatPosition(e.position) : 'Sem registro'}</td>
                  <td>{e.position ? new Date(e.position.recordedAt).toLocaleString('pt-BR') : '—'}</td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                      onClick={() => setFormVehicle(e.vehicle)}
                    >
                      Registrar posição
                    </button>
                    <button
                      className="logout-btn"
                      style={{ color: 'var(--primary)', borderColor: 'var(--border)' }}
                      onClick={() => handleShowHistory(e.vehicle)}
                    >
                      Histórico
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formVehicle && (
        <PositionForm
          vehicle={formVehicle}
          onDone={() => {
            setFormVehicle(null);
            load();
          }}
          onCancel={() => setFormVehicle(null)}
        />
      )}

      {historyFor && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong>Histórico — {historyFor.plate}</strong>
            <button className="logout-btn" style={{ color: 'var(--ink-muted)', borderColor: 'var(--border)' }} onClick={() => setHistoryFor(null)}>
              Fechar
            </button>
          </div>
          {history.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-muted)' }}>Nenhum registro ainda.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Posição</th>
                  <th>Registrado em</th>
                  <th>Origem</th>
                </tr>
              </thead>
              <tbody>
                {history.map((p, i) => (
                  <tr key={i}>
                    <td>{formatPosition(p)}</td>
                    <td>{new Date(p.recordedAt).toLocaleString('pt-BR')}</td>
                    <td>{p.source === 'manual' ? 'Manual' : p.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

function PositionForm({ vehicle, onDone, onCancel }: { vehicle: Vehicle; onDone: () => void; onCancel: () => void }) {
  const [mode, setMode] = useState<'text' | 'coords'>('text');
  const [locationText, setLocationText] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/tracking/positions', {
        vehicleId: vehicle.id,
        locationText: mode === 'text' ? locationText : undefined,
        latitude: mode === 'coords' ? Number(latitude) : undefined,
        longitude: mode === 'coords' ? Number(longitude) : undefined,
      });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Erro ao registrar posição.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card" style={{ borderColor: 'var(--accent)' }} onSubmit={handleSubmit}>
      <h3 style={{ marginTop: 0 }}>Registrar posição — {vehicle.plate}</h3>
      {error && <div className="error-banner">{error}</div>}
      <div className="field">
        <label>Como informar</label>
        <select value={mode} onChange={(e) => setMode(e.target.value as 'text' | 'coords')}>
          <option value="text">Descrição do local</option>
          <option value="coords">Coordenadas (lat/lng)</option>
        </select>
      </div>
      {mode === 'text' ? (
        <div className="field">
          <label>Local</label>
          <input required value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Ex: Pátio da matriz" />
        </div>
      ) : (
        <>
          <div className="field">
            <label>Latitude</label>
            <input required type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input required type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
          </div>
        </>
      )}
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
