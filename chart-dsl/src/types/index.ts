import type { CSSProperties, ReactNode } from 'react';
import type { ChartType, ChartOptions } from 'chart.js';
import type { ChartTheme } from './theme';
import type { FunctionCallValue } from './dsl';

/**
 * Атомизированная структура ответа от REST API
 */
export interface AtomicChartResponse {
  // Обязательные поля
  labels: string[];
  datasets: Array<DatasetConfig>;
  
  // Опциональные поля
  options?: Partial<ChartOptions>;
  
  // Метаданные
  meta?: ChartMeta;
}

/**
 * Конфигурация датасета
 */
export interface DatasetConfig {
  id?: string;
  label: string;
  data: number[] | Array<{ x: number; y: number }>;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  [key: string]: unknown;
}

/**
 * Человекочитаемое описание датасета для конструктора
 */
export interface DatasetDescriptor {
  index: number;
  label: string;
  id?: string;
  dataFormat: 'numeric' | 'xy';  // number[] vs {x,y}[]
  colorMode: 'single' | 'array'; // backgroundColor — один цвет или массив
  dataPreview?: string;          // "6 значений", "8 точек"
  dataLength?: number;           // число точек/сегментов
}

/**
 * Метаданные графика
 */
export interface ChartMeta {
  title?: string;
  description?: string;
  generatedAt?: string; // ISO8601
  cacheControl?: 'no-cache' | 'max-age=3600' | string;
}

/**
 * Определение схемы графика
 */
export interface ChartSchemaDefinition {
  type?: ChartType;
  /** URL строка, конфиг источника или вызов функции в DSL (например rest("...")) */
  source?: string | DataSourceConfig | FunctionCallValue;
  extends?: string;
  map?: Record<string, string>; // JSONPath маппинг
  [key: string]: unknown;
}

/**
 * Конфигурация REST источника
 */
export interface RestSourceConfig {
  type?: 'rest';
  url: string;
  method?: 'GET' | 'POST' | 'PUT';
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
}

/**
 * Конфигурация GraphQL источника
 */
export interface GraphQLSourceConfig {
  type: 'graphql';
  url: string;
  query: string;
  variables?: Record<string, unknown>;
  headers?: Record<string, string>;
}

/**
 * Конфигурация WebSocket источника (в т.ч. симуляция — периодическое обновление данных)
 */
export interface WebSocketSourceConfig {
  type: 'websocket';
  url: string;
  /** Интервал обновления в мс (симуляция); по умолчанию 2000 */
  refreshIntervalMs?: number;
}

/**
 * Объединённый тип конфигурации источника данных
 */
export type DataSourceConfig = RestSourceConfig | GraphQLSourceConfig | WebSocketSourceConfig;

/**
 * Контракт адаптера источника данных для графиков
 */
export interface ChartDataAdapter {
  fetch(
    source: DataSourceConfig,
    params?: Record<string, unknown>,
    mapping?: Record<string, string>
  ): Promise<AtomicChartResponse>;
}

/**
 * Определение конфигурации графика
 */
export interface ChartConfigDefinition {
  schema: ChartSchemaDefinition;
  overrides?: Partial<ChartSchemaDefinition>;
  theme?: ChartTheme | string;
  [key: string]: unknown;
}

/**
 * Пропсы для ChartRenderer
 */
export interface ChartRendererProps {
  // Конфигурация (результат chartConfig)
  config: ChartConfigDefinition;
  
  // Переопределение параметров
  overrides?: Partial<AtomicChartResponse>;
  
  // Props для маршрутизации запроса
  params?: Record<string, unknown>;
  
  // Обработчики событий Chart.js
  onChartReady?: (chart: unknown) => void;
  onDataUpdate?: (data: AtomicChartResponse) => void;
  onError?: (error: Error) => void;
  
  // Стили контейнера
  className?: string;
  style?: CSSProperties;
  
  // Опции загрузки
  loading?: ReactNode;
  error?: ReactNode;
  retry?: number;
}
