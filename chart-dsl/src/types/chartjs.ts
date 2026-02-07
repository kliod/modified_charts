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
  tooltip?: boolean | Record<string, any>;
  legend?: boolean | Record<string, any>;
  title?: boolean | Record<string, any>;
  [key: string]: any;
}

/**
 * Обработчики событий
 */
export interface ChartEventHandlers {
  onClick?: (event: MouseEvent, elements: any[]) => void;
  onHover?: (event: MouseEvent, elements: any[]) => void;
  onZoom?: (event: any) => void;
  onPan?: (event: any) => void;
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
