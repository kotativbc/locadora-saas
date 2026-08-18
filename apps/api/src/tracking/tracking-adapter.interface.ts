/**
 * Contrato que qualquer fonte de rastreamento precisa seguir. Hoje só existe
 * o ManualTrackingAdapter (staff registra a posição manualmente). Quando um
 * rastreador de verdade for contratado, basta criar uma nova classe que
 * implemente essa interface (ex: integrando com a API do fabricante) e
 * trocar o provider no módulo — nada no resto do sistema muda.
 */
export interface VehiclePositionResult {
  latitude: number | null;
  longitude: number | null;
  locationText: string | null;
  recordedAt: Date;
  source: string;
}

export interface TrackingAdapter {
  getLatestPosition(vehicleId: string): Promise<VehiclePositionResult | null>;
  getHistory(vehicleId: string, limit?: number): Promise<VehiclePositionResult[]>;
}

export const TRACKING_ADAPTER = Symbol('TRACKING_ADAPTER');
