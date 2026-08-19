import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';
import { StatusBadge } from '../components/StatusBadge';

interface BackupRun {
  timestamp: string;
  createdAt: string;
  dbFile: { name: string; sizeBytes: number } | null;
  uploadsFile: { name: string; sizeBytes: number } | null;
}

interface BackupStatus {
  status: 'ok' | 'stale' | 'never';
  lastBackupAt: string | null;
  hoursSinceLastBackup: number | null;
  runs: BackupRun[];
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function Backups() {
  const [data, setData] = useState<BackupStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<BackupStatus>('/backups/status')
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar status dos backups.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Backups</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Rodam sozinhos todo dia às 03:01 (systemd timer no servidor). Aqui é só a visão de que estão acontecendo.
      </p>

      {error && <div className="error-banner">{error}</div>}
      {loading && <p>Carregando...</p>}

      {data && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            {data.status === 'never' && (
              <>
                <StatusBadge label="Nenhum backup ainda" variant="warning" />
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
                  Se o servidor já está rodando há mais de um dia, vale conferir se o timer está ativo.
                </p>
              </>
            )}
            {data.status === 'ok' && (
              <>
                <StatusBadge label="Em dia" variant="success" />
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
                  Último backup há {data.hoursSinceLastBackup}h ({new Date(data.lastBackupAt!).toLocaleString('pt-BR')})
                </p>
              </>
            )}
            {data.status === 'stale' && (
              <>
                <StatusBadge label="Atrasado" variant="danger" />
                <p style={{ marginTop: 10, marginBottom: 0, fontSize: 13, color: 'var(--ink-muted)' }}>
                  Último backup há {data.hoursSinceLastBackup}h ({new Date(data.lastBackupAt!).toLocaleString('pt-BR')}) —
                  esperado a cada ~24h. Vale checar o timer no servidor.
                </p>
              </>
            )}
          </div>

          <div className="card">
            <strong style={{ display: 'block', marginBottom: 10 }}>Histórico</strong>
            {data.runs.length === 0 ? (
              <EmptyState title="Nenhum backup encontrado" />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Quando</th>
                    <th>Banco de dados</th>
                    <th>Arquivos</th>
                  </tr>
                </thead>
                <tbody>
                  {data.runs.map((r) => (
                    <tr key={r.timestamp}>
                      <td>{new Date(r.createdAt).toLocaleString('pt-BR')}</td>
                      <td>{r.dbFile ? formatBytes(r.dbFile.sizeBytes) : '—'}</td>
                      <td>{r.uploadsFile ? formatBytes(r.uploadsFile.sizeBytes) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
