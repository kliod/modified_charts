import type {
  ChartType,
  ChartData,
  ChartOptions,
  Plugin,
  ChartConfiguration
} from 'chart.js';

/**
 * Нормализованная конфигурация Chart.js
 */
export interface NormalizedChartConfig extends ChartConfiguration {
  type: ChartType;
  data: ChartData;
  options: ChartOptions;
  plugins?: Plugin[];
}

/**
 * Конфигурация плагинов
 */
export interface PluginConfig {
  tooltip?: boolean | Record<string, unknown>;
  legend?: boolean | Record<string, unknown>;
  title?: boolean | Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Обработчики событий
 */
export interface ChartEventHandlers {
  onClick?: (event: MouseEvent, elements: unknown[]) => void;
  onHover?: (event: MouseEvent, elements: unknown[]) => void;
  onZoom?: (event: unknown) => void;
  onPan?: (event: unknown) => void;
}

/**
 * Конфигурация адаптера
 */
export interface AdapterConfig {
  responsive?: boolean;
  maintainAspectRatio?: boolean;
  plugins?: PluginConfig;
  events?: ChartEventHandlers;
}
