import { JSONPathMapper } from './mapper';
import type { AtomicChartResponse, DataSourceConfig, WebSocketSourceConfig } from '../types/index';

/** Базовые мок-данные для симуляции WebSocket (совместимо с форматом AtomicChartResponse) */
const MOCK_WS_BASE: AtomicChartResponse = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      id: 'ws-1',
      label: 'Stream A',
      data: [40, 55, 60, 72, 65, 80],
      backgroundColor: 'rgba(0, 122, 255, 0.5)',
      borderColor: 'rgba(0, 122, 255, 1)',
      borderWidth: 2
    },
    {
      id: 'ws-2',
      label: 'Stream B',
      data: [30, 45, 55, 58, 62, 70],
      backgroundColor: 'rgba(230, 129, 97, 0.5)',
      borderColor: 'rgba(230, 129, 97, 1)',
      borderWidth: 2
    }
  ],
  meta: { title: 'WebSocket simulation', generatedAt: new Date().toISOString() }
};

/** Небольшая вариация значения для симуляции «живых» обновлений (±8%) */
function vary(value: number): number {
  const delta = value * 0.08 * (Math.random() * 2 - 1);
  return Math.round(Math.max(0, value + delta));
}

/**
 * Провайдер для WebSocket / симуляции потоковых данных.
 * fetch() возвращает мок-данные (при симуляции — с лёгкой вариацией при каждом вызове).
 * В useChartConfig для source.type === 'websocket' можно включить периодический refetch.
 */
export class WebSocketDataProvider {
  async fetch(
    source: DataSourceConfig,
    _params?: Record<string, unknown>,
    mapping?: Record<string, string>
  ): Promise<AtomicChartResponse> {
    if (!source || (source as WebSocketSourceConfig).type !== 'websocket') {
      throw new Error('WebSocketDataProvider expects source.type === "websocket"');
    }

    // Симуляция: генерируем данные с небольшой вариацией при каждом «сообщении»
    const labels = [...MOCK_WS_BASE.labels];
    const datasets = MOCK_WS_BASE.datasets.map((ds) => ({
      ...ds,
      data: (ds.data as number[]).map(vary)
    }));
    const raw = { labels, datasets, meta: { ...MOCK_WS_BASE.meta, generatedAt: new Date().toISOString() } };

    // Обёртка в формате { data: { chartData: ... } } если нужен маппинг $.data.chartData.*
    const wrapped = { data: { chartData: raw } };

    if (mapping && Object.keys(mapping).length > 0) {
      const mapped = JSONPathMapper.map(wrapped, mapping);
      return {
        labels: mapped.labels ?? raw.labels,
        datasets: mapped.datasets ?? raw.datasets,
        options: mapped.options,
        meta: mapped.meta ?? raw.meta
      };
    }
    return raw;
  }
}
