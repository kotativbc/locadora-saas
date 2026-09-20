import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { EmptyState } from '../components/EmptyState';

interface SoldVehicle {
  id: string;
  plate: string;
  brand: string;
  model: string;
  soldAt: string;
  acquisitionCost: string | null;
  totalReceived: string;
  totalExpenses: string;
  salePrice: string;
  lifetimeResult: string;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function VehicleSales() {
  const [vehicles, setVehicles] = useState<SoldVehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<SoldVehicle[]>('/vehicles/sold')
      .then(setVehicles)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Erro ao carregar vendas.'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1>Vendas de Veículos</h1>
        <div className="page-header__rule" />
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-muted)', marginTop: -8 }}>
        Veículos que saíram da frota por venda — o comparativo mostra o resultado do ciclo de vida inteiro: quanto
        custou pra adquirir, quanto rendeu enquanto estava locado (recebido + ganho retroativo, menos despesas), e
        por quanto foi vendido no final.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {loading ? (
          <p>Carregando...</p>
        ) : vehicles.length === 0 ? (
          <EmptyState
            title="Nenhum veículo vendido ainda"
            body='Quando marcar um veículo como vendido na tela de Frota, ele aparece aqui com o comparativo completo.'
          />
        ) : (
          <table>
            <thead>
              <tr>
                <th>Veículo</th>
                <th>Vendido em</th>
                <th>Custo de aquisição</th>
                <th>Rendeu (locação)</th>
                <th>Despesas</th>
                <th>Valor da venda</th>
                <th>Resultado total</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    <span className="plate">{v.plate}</span> {v.brand} {v.model}
                  </td>
                  <td>{new Date(v.soldAt).toLocaleDateString('pt-BR')}</td>
                  <td>{v.acquisitionCost ? formatCurrency(v.acquisitionCost) : 'não informado'}</td>
                  <td style={{ color: 'var(--rtv-success)' }}>{formatCurrency(v.totalReceived)}</td>
                  <td style={{ color: 'var(--rtv-danger)' }}>{formatCurrency(v.totalExpenses)}</td>
                  <td>{formatCurrency(v.salePrice)}</td>
                  <td style={{ fontWeight: 700, color: Number(v.lifetimeResult) >= 0 ? 'var(--rtv-success)' : 'var(--rtv-danger)' }}>
                    {formatCurrency(v.lifetimeResult)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
