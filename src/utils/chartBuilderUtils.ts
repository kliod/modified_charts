import type { ChartConfigDefinition, ChartSchemaDefinition, DataSourceConfig } from '../../chart-dsl/src/types/index';
import type { ChartType, ChartOptions } from 'chart.js';

/**
 * Индивидуальные стили для одного датасета (переопределяют общие настройки)
 */
export interface DatasetStyleOverride {
  label?: string;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  opacity?: number;
  borderRadius?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  tension?: number;
}

/**
 * Состояние конструктора графиков
 */
export interface BuilderState {
  type: ChartType;
  source: DataSourceConfig | null;
  map: Record<string, string>;
  options: Partial<ChartOptions>;
  theme: 'light' | 'dark';
  color: string;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  borderRadius?: number;
  tension?: number;
  title: string;
  titleDisplay: boolean;
  legendDisplay: boolean;
  legendPosition: 'top' | 'bottom' | 'left' | 'right';
  responsive: boolean;
  maintainAspectRatio: boolean;
  /** Индивидуальные стили по стабильному ключу (id, label или индекс "0", "1", ...) */
  datasetOverrides?: Record<string, DatasetStyleOverride>;
}

/**
 * Нормализовать путь маппинга: если не пусто и не начинается с "$." — добавить "$." в начало.
 * Позволяет вводить "labels" или "data.charts" вместо "$.labels", "$.data.charts".
 */
export function normalizeMapPath(path: string): string {
  const t = path?.trim() ?? '';
  if (!t) return '';
  return t.startsWith('$.') ? t : `$.${t}`;
}

/**
 * Применить цвет с прозрачностью
 */
function applyColorWithOpacity(color: string, opacity: number): string {
  // Если цвет уже в формате rgba, извлечь RGB компоненты
  if (color.startsWith('rgba')) {
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
    }
  }
  
  // Конвертировать hex в rgba
  const hex = color.replace('#', '');
  if (hex.length === 3) {
    // Короткий формат #RGB
    const r = parseInt(hex[0] + hex[0], 16);
    const g = parseInt(hex[1] + hex[1], 16);
    const b = parseInt(hex[2] + hex[2], 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  } else if (hex.length === 6) {
    // Полный формат #RRGGBB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
  
  return color;
}

/**
 * Применить параметры визуализации к датасетам
 */
export function applyVisualStylesToDatasets(
  datasets: Array<Record<string, any>>,
  state: BuilderState
): Array<Record<string, any>> {
  return datasets.map(dataset => {
    const updated: Record<string, any> = { ...dataset };
    
    // Применить цвета
    const bgColor = state.backgroundColor || state.color;
    const borderColor = state.borderColor || state.color;
    
    if (bgColor) {
      updated.backgroundColor = state.opacity !== undefined && state.opacity < 1
        ? applyColorWithOpacity(bgColor, state.opacity)
        : bgColor;
    }
    
    if (borderColor) {
      updated.borderColor = borderColor;
    }
    
    // Применить толщину границ
    if (state.borderWidth !== undefined) {
      updated.borderWidth = state.borderWidth;
    }
    
    // Применить стили в зависимости от типа графика
    if (state.type === 'bar' && state.borderRadius !== undefined) {
      updated.borderRadius = state.borderRadius;
    }
    
    if ((state.type === 'line' || state.type === 'scatter') && state.pointRadius !== undefined) {
      updated.pointRadius = state.pointRadius;
    }
    
    if ((state.type === 'line' || state.type === 'scatter') && state.pointHoverRadius !== undefined) {
      updated.pointHoverRadius = state.pointHoverRadius;
    }
    
    if (state.type === 'line' && state.tension !== undefined) {
      updated.tension = state.tension;
    }
    
    return updated;
  });
}

/**
 * Преобразовать состояние конструктора в конфигурацию графика
 */
export function buildChartConfig(state: BuilderState): ChartConfigDefinition {
  const mapNormalized =
    Object.keys(state.map).length > 0
      ? Object.fromEntries(
          Object.entries(state.map)
            .filter(([, v]) => v)
            .map(([k, v]) => [k, normalizeMapPath(v)])
        )
      : undefined;
  const schema: ChartSchemaDefinition = {
    type: state.type,
    ...(state.source && { source: state.source }),
    ...(mapNormalized && Object.keys(mapNormalized).length > 0 && { map: mapNormalized })
  };

  // Построить опции в правильной структуре (responsive всегда true, убран из UI)
  const options: any = {
    ...state.options,
    responsive: true,
    maintainAspectRatio: state.maintainAspectRatio,
    plugins: {
      ...(state.options.plugins || {}),
      title: {
        display: state.titleDisplay,
        text: state.title
      },
      legend: {
        display: state.legendDisplay,
        position: state.legendPosition
      }
    }
  };

  // Добавить настройки шкал, если они есть
  if (state.options.scales) {
    options.scales = state.options.scales;
  }

  const overrides: Partial<ChartSchemaDefinition> = {
    color: state.color,
    options
  };

  return {
    schema,
    overrides,
    theme: state.theme,
    // Сохранить состояние для применения к датасетам позже
    _builderState: state
  } as ChartConfigDefinition & { _builderState?: BuilderState };
}

/**
 * Сохранить конфигурацию в localStorage
 */
export function saveToLocalStorage(name: string, config: ChartConfigDefinition): void {
  try {
    const saved = localStorage.getItem('chart-builder-configs');
    const configs = saved ? JSON.parse(saved) : {};
    configs[name] = {
      config,
      savedAt: new Date().toISOString()
    };
    localStorage.setItem('chart-builder-configs', JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to save configuration:', error);
    throw new Error('Не удалось сохранить конфигурацию');
  }
}

/**
 * Загрузить конфигурацию из localStorage
 */
export function loadFromLocalStorage(name: string): ChartConfigDefinition | null {
  try {
    const saved = localStorage.getItem('chart-builder-configs');
    if (!saved) return null;
    
    const configs = JSON.parse(saved);
    if (!configs[name]) return null;
    
    return configs[name].config;
  } catch (error) {
    console.error('Failed to load configuration:', error);
    return null;
  }
}

/**
 * Получить список всех сохраненных конфигураций
 */
export function listSavedConfigs(): Array<{ name: string; savedAt: string }> {
  try {
    const saved = localStorage.getItem('chart-builder-configs');
    if (!saved) return [];
    
    const configs = JSON.parse(saved);
    return Object.entries(configs).map(([name, data]: [string, any]) => ({
      name,
      savedAt: data.savedAt || ''
    }));
  } catch (error) {
    console.error('Failed to list configurations:', error);
    return [];
  }
}

/**
 * Удалить конфигурацию из localStorage
 */
export function deleteFromLocalStorage(name: string): void {
  try {
    const saved = localStorage.getItem('chart-builder-configs');
    if (!saved) return;
    
    const configs = JSON.parse(saved);
    delete configs[name];
    localStorage.setItem('chart-builder-configs', JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to delete configuration:', error);
    throw new Error('Не удалось удалить конфигурацию');
  }
}

/**
 * Переименовать конфигурацию в localStorage
 */
export function renameInLocalStorage(oldName: string, newName: string): void {
  try {
    const saved = localStorage.getItem('chart-builder-configs');
    if (!saved) return;
    
    const configs = JSON.parse(saved);
    if (!configs[oldName]) return;
    
    configs[newName] = configs[oldName];
    delete configs[oldName];
    localStorage.setItem('chart-builder-configs', JSON.stringify(configs));
  } catch (error) {
    console.error('Failed to rename configuration:', error);
    throw new Error('Не удалось переименовать конфигурацию');
  }
}

/**
 * Значения по умолчанию для конструктора
 */
export const defaultBuilderState: BuilderState = {
  type: 'bar',
  source: {
    type: 'rest',
    url: '/api/charts/sales-atomic',
    method: 'GET'
  },
  map: {
    labels: '$.labels',
    datasets: '$.datasets'
  },
  options: {
    scales: { y: { beginAtZero: true } }
  },
  theme: 'light',
  color: '#007aff',
  backgroundColor: undefined,
  borderColor: undefined,
  borderWidth: 1,
  opacity: 1,
  pointRadius: 3,
  pointHoverRadius: 5,
  borderRadius: 0,
  tension: 0.4,
  title: 'Chart Title',
  titleDisplay: true,
  legendDisplay: true,
  legendPosition: 'top',
  responsive: true,
  maintainAspectRatio: true,
  datasetOverrides: {}
};
