import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Resolver } from '../resolver/resolver';
import { normalizeSource, getAdapter } from '../data-provider/adapters';
import { ChartJSAdapter } from '../adapter/chartjs';
import { SchemaRegistry } from '../core/registry';
import { getSegmentColorsForPie } from '../core/segmentPalette';
import { useChartProvider } from './ChartProvider';
import type { ChartConfigDefinition, AtomicChartResponse, DataSourceConfig } from '../types/index';
import type { NormalizedChartConfig } from '../types/chartjs';

function colorToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length === 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  if (h.length === 3) {
    const r = parseInt(h[0] + h[0], 16);
    const g = parseInt(h[1] + h[1], 16);
    const b = parseInt(h[2] + h[2], 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  return hex;
}

/** Применить только цвета темы к уже существующим опциям, не перезаписывая scale/plugin целиком (чтобы не сломать callback, display и т.д.) */
function applyThemeColorsToOptions(
  options: Record<string, unknown>,
  variables: Record<string, string>
): Record<string, unknown> {
  const textColor = variables.$text || '#333';
  const gridColor = colorToRgba(textColor, 0.2);
  const out: Record<string, unknown> = { ...options, color: (options.color ?? textColor) as string };
  if (out.scales && typeof out.scales === 'object') {
    out.scales = { ...out.scales };
    for (const key of Object.keys(out.scales)) {
      if (key === 'r') continue; // не трогать radial scale — Chart.js требует полную структуру (callback, display)
      const scale = out.scales[key];
      if (scale && typeof scale === 'object') {
        out.scales[key] = {
          ...scale,
          grid: scale.grid && typeof scale.grid === 'object' ? { ...scale.grid, color: gridColor } : { color: gridColor },
          ticks: scale.ticks && typeof scale.ticks === 'object' ? { ...scale.ticks, color: textColor } : { color: textColor },
        };
      }
    }
  }
  if (out.plugins && typeof out.plugins === 'object') {
    out.plugins = { ...out.plugins };
    if (out.plugins.title) out.plugins.title = { ...out.plugins.title, color: textColor };
    else out.plugins.title = { color: textColor };
    if (out.plugins.legend) {
      out.plugins.legend = {
        ...out.plugins.legend,
        labels: out.plugins.legend.labels ? { ...out.plugins.legend.labels, color: textColor } : { color: textColor },
      };
    } else out.plugins.legend = { labels: { color: textColor } };
  }
  return out;
}

export interface UseChartConfigResult {
  data: AtomicChartResponse | null;
  config: NormalizedChartConfig | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  /** true для источника WebSocket — фиксированная шкала и анимация обновления баров */
  isStreaming: boolean;
}

/**
 * Хук для загрузки и разрешения конфигурации графика
 */
export function useChartConfig(
  chartConfig: ChartConfigDefinition,
  params?: Record<string, unknown>
): UseChartConfigResult {
  const { variables, config: providerConfig } = useChartProvider();
  const [data, setData] = useState<AtomicChartResponse | null>(null);
  const [config, setConfig] = useState<NormalizedChartConfig | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const resolverRef = useRef<Resolver | null>(null);
  /** Для WebSocket фиксируем max шкалы Y при первой загрузке, чтобы ось не прыгала */
  const fixedScaleYMaxRef = useRef<number | null>(null);
  /** Версия источника: при смене типа/URL/запроса инкремент, чтобы REST не отдавал старый кэш и график перезагружал данные */
  const lastSourceFingerprintRef = useRef<string>('');
  const sourceVersionRef = useRef(0);
  /** Игнорировать завершение устаревшего loadChart при быстром переключении источника */
  const loadIdRef = useRef(0);
  /** Текущий configKey — обновляется при каждом рендере; перед setData проверяем, что конфиг не менялся за время загрузки */
  const configKeyRef = useRef<string>('');

  if (!resolverRef.current) {
    resolverRef.current = new Resolver();
    const allSchemas = SchemaRegistry.getAll();
    allSchemas.forEach((schema, name) => {
      resolverRef.current!.registerSchema(name, schema);
    });
  }

  // Обновить переменные resolver при изменении
  useEffect(() => {
    if (resolverRef.current) {
      resolverRef.current.setVariables(variables);
    }
  }, [variables]);

  // Функция для загрузки данных
  const loadingRef = useRef(false);
  
  const loadChart = useCallback(async () => {
    if (!resolverRef.current) {
      return;
    }

    const loadId = ++loadIdRef.current;
    const startConfigKey = configKeyRef.current;
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);

      const resolved = resolverRef.current.resolve(chartConfig.schema, params);
      const sourceForRef = resolved.config?.source ?? chartConfig.schema?.source;
      if (sourceForRef && typeof sourceForRef === 'object' && (sourceForRef as { type?: string }).type !== 'websocket') {
        fixedScaleYMaxRef.current = null;
      }
      if (resolved.errors.length > 0) {
        throw new Error(`Configuration errors: ${resolved.errors.map(e => e.message).join(', ')}`);
      }

      let chartData: AtomicChartResponse | null = null;
      const source = resolved.config.source || chartConfig.schema.source;

      if (source) {
        const baseURL = (providerConfig as { baseURL?: string }).baseURL ?? '';
        const normalized = normalizeSource(source, baseURL);
        const fingerprint = JSON.stringify(source);
        if (fingerprint !== lastSourceFingerprintRef.current) {
          lastSourceFingerprintRef.current = fingerprint;
          sourceVersionRef.current += 1;
        }
        (normalized as DataSourceConfig & { _cacheBust?: number })._cacheBust = sourceVersionRef.current;
        const adapter = getAdapter(normalized, {
          baseURL,
          maxCacheSize: providerConfig.maxCacheSize,
          requestTimeout: providerConfig.requestTimeout
        });
        const mapping = resolved.config.map || chartConfig.schema.map;
        chartData = await adapter.fetch(normalized, params, mapping);
      }

      // Построить финальный конфиг
      const chartType = resolved.config.type || 'bar';
      
      if (!ChartJSAdapter.isSupportedType(chartType)) {
        throw new Error(`Unsupported chart type: ${chartType}`);
      }

      // Применить визуальные стили к датасетам, если они указаны в конфиге
      let finalChartData = chartData || { labels: [], datasets: [] };
      if (chartConfig._builderState && finalChartData.datasets && finalChartData.datasets.length > 0) {
        const builderState = chartConfig._builderState;
        
        // Функция для применения цвета с прозрачностью
        const applyColorWithOpacity = (color: string, opacity: number): string => {
          if (color.startsWith('rgba')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
            if (match) {
              return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${opacity})`;
            }
          }
          const hex = color.replace('#', '');
          if (hex.length === 3) {
            const r = parseInt(hex[0] + hex[0], 16);
            const g = parseInt(hex[1] + hex[1], 16);
            const b = parseInt(hex[2] + hex[2], 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          } else if (hex.length === 6) {
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return `rgba(${r}, ${g}, ${b}, ${opacity})`;
          }
          return color;
        };
        
        const datasetOverrides = builderState.datasetOverrides || {};
        finalChartData = {
          ...finalChartData,
          datasets: finalChartData.datasets.map((dataset: Record<string, unknown>, index: number) => {
            const updated: Record<string, unknown> = { ...dataset };
            // Поиск override по стабильному ключу: id, label, индекс
            const over =
              (dataset.id != null && datasetOverrides[dataset.id]) ??
              (dataset.label != null && datasetOverrides[dataset.label]) ??
              datasetOverrides[String(index)] ??
              datasetOverrides[index as unknown as string];

            // Сначала применить общие настройки
            const bgColor = builderState.backgroundColor || builderState.color;
            const borderColor = builderState.borderColor || builderState.color;
            const opacity = over?.opacity !== undefined ? over.opacity : builderState.opacity;
            
            if (bgColor && over?.backgroundColor === undefined) {
              updated.backgroundColor = opacity !== undefined && opacity < 1
                ? applyColorWithOpacity(bgColor, opacity)
                : bgColor;
            }
            if (over?.backgroundColor !== undefined) {
              if (Array.isArray(over.backgroundColor)) {
                updated.backgroundColor = over.backgroundColor;
              } else {
                updated.backgroundColor = (opacity !== undefined && opacity < 1)
                  ? applyColorWithOpacity(over.backgroundColor, opacity)
                  : over.backgroundColor;
              }
            }

            // Для Pie/Doughnut Chart.js требует массив цветов по одному на сегмент (иначе все сегменты одного цвета)
            const dataLen = Array.isArray(updated.data) ? updated.data.length : 0;
            if ((chartType === 'pie' || chartType === 'doughnut') && dataLen > 0) {
              if (Array.isArray(updated.backgroundColor) && updated.backgroundColor.length >= dataLen) {
                updated.backgroundColor = updated.backgroundColor.slice(0, dataLen);
              } else {
                // Первый сегмент — из «Внешний вид» (цвет фона/основной), остальные — палитра
                const firstColor = (builderState.backgroundColor || builderState.color) && over?.backgroundColor === undefined
                  ? (builderState.opacity !== undefined && builderState.opacity < 1
                      ? applyColorWithOpacity(builderState.backgroundColor || builderState.color, builderState.opacity)
                      : (builderState.backgroundColor || builderState.color))
                  : undefined;
                updated.backgroundColor = getSegmentColorsForPie(dataLen, firstColor);
              }
            }
            
            if (over?.borderColor !== undefined) {
              updated.borderColor = over.borderColor;
            } else if (borderColor) {
              updated.borderColor = borderColor;
            }
            
            if (over?.borderWidth !== undefined) {
              updated.borderWidth = over.borderWidth;
            } else if (builderState.borderWidth !== undefined) {
              updated.borderWidth = builderState.borderWidth;
            }
            
            if (chartType === 'bar') {
              updated.borderRadius = (over?.borderRadius !== undefined ? over.borderRadius : builderState.borderRadius) ?? updated.borderRadius;
            }
            if (chartType === 'line' || chartType === 'scatter' || chartType === 'bubble') {
              updated.pointRadius = over?.pointRadius !== undefined ? over.pointRadius : builderState.pointRadius;
              updated.pointHoverRadius = over?.pointHoverRadius !== undefined ? over.pointHoverRadius : builderState.pointHoverRadius;
            }
            if (chartType === 'line') {
              updated.tension = over?.tension !== undefined ? over.tension : builderState.tension;
            }
            
            if (over?.label !== undefined) {
              updated.label = over.label;
            }
            
            return updated;
          })
        };
      }

      const resolvedOptions = resolved.config.options || {};
      const overridesOptions = chartConfig.overrides?.options || {};
      // Глубокое слияние scales: переопределения из конструктора не должны затирать оси из API/схемы
      const mergeScales = (resolved: Record<string, unknown> | undefined, overrides: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
        if (!overrides || typeof overrides !== 'object') return resolved;
        if (!resolved || typeof resolved !== 'object') return overrides;
        const out = { ...resolved };
        for (const key of Object.keys(overrides)) {
          const r = resolved[key];
          const o = overrides[key];
          if (o && typeof o === 'object' && !Array.isArray(o)) {
            out[key] = { ...(r && typeof r === 'object' ? r : {}), ...o };
          } else {
            out[key] = o;
          }
        }
        return out;
      };
      const baseMerged = { ...resolvedOptions, ...overridesOptions };
      if (resolvedOptions.scales != null || overridesOptions.scales != null) {
        baseMerged.scales = mergeScales(resolvedOptions.scales as Record<string, unknown>, overridesOptions.scales as Record<string, unknown>) as typeof baseMerged.scales;
      }
      let mergedOptions = applyThemeColorsToOptions(
        baseMerged,
        variables
      );
      // Pie/Doughnut не используют Cartesian-шкалы — убираем, иначе рисуется ось Y и ломается layout
      if (chartType === 'pie' || chartType === 'doughnut') {
        mergedOptions = { ...mergedOptions, scales: {} };
      } else {
        const isWebSocketSource = source && typeof source === 'object' && (source as { type?: string }).type === 'websocket';
        if (isWebSocketSource && finalChartData?.datasets?.length) {
          const allValues: number[] = [];
          finalChartData.datasets.forEach((ds) => {
            const d = ds.data;
            if (Array.isArray(d)) d.forEach((v) => (typeof v === 'number' ? allValues.push(v) : (typeof v === 'object' && v != null && typeof (v as { y?: number }).y === 'number' && allValues.push((v as { y: number }).y))));
          });
          const dataMax = allValues.length ? Math.max(...allValues) : 100;
          const suggestedMax = Math.ceil(Math.max(dataMax * 1.2, 10));
          if (fixedScaleYMaxRef.current == null) fixedScaleYMaxRef.current = suggestedMax;
          else fixedScaleYMaxRef.current = Math.max(fixedScaleYMaxRef.current, suggestedMax);
          mergedOptions = {
            ...mergedOptions,
            scales: {
              ...mergedOptions.scales,
              y: {
                ...(mergedOptions.scales as Record<string, unknown>)?.y,
                min: 0,
                max: fixedScaleYMaxRef.current
              }
            }
          };
        }
      }

      const normalizedConfig = await ChartJSAdapter.createConfig(
        chartType,
        finalChartData,
        mergedOptions,
        resolved.config.plugins || chartConfig.overrides?.plugins
      );

      if (loadId !== loadIdRef.current) {
        return;
      }
      if (configKeyRef.current !== startConfigKey) {
        return;
      }
      setError(null);
      setData(finalChartData);
      setConfig(normalizedConfig);
    } catch (err) {
      // Не перезаписывать успешное состояние ошибкой от устаревшего запроса
      if (loadId !== loadIdRef.current) return;
      if (configKeyRef.current !== startConfigKey) return;
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setData(null);
      setConfig(null);
    } finally {
      if (loadId === loadIdRef.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [chartConfig, params, variables]);

  // Загрузить при монтировании и изменении конфига или параметров
  // Используем JSON.stringify для глубокого сравнения, так как объекты могут иметь те же ссылки, но разное содержимое
  const configKey = useMemo(() => {
    return JSON.stringify({
      schema: chartConfig.schema,
      overrides: chartConfig.overrides,
      theme: chartConfig.theme,
      params,
      _builderState: (chartConfig as Record<string, unknown>)._builderState
    });
  }, [chartConfig.schema, chartConfig.overrides, chartConfig.theme, params, (chartConfig as Record<string, unknown>)._builderState]);

  configKeyRef.current = configKey;

  useEffect(() => {
    loadChart();
  }, [configKey, loadChart]);

  // Симуляция WebSocket: периодический refetch для «потокового» обновления графика
  const isWebSocket = !!(
    chartConfig?.schema?.source &&
    typeof chartConfig.schema.source === 'object' &&
    (chartConfig.schema.source as { type?: string }).type === 'websocket'
  );
  const wsIntervalMs =
    isWebSocket && chartConfig?.schema?.source && typeof chartConfig.schema.source === 'object'
      ? (chartConfig.schema.source as { refreshIntervalMs?: number }).refreshIntervalMs ?? 2000
      : 0;
  useEffect(() => {
    if (!isWebSocket || wsIntervalMs <= 0) return;
    const id = setInterval(() => loadChart(), wsIntervalMs);
    return () => clearInterval(id);
  }, [isWebSocket, wsIntervalMs, loadChart]);

  return {
    data,
    config,
    loading,
    error,
    refetch: loadChart,
    isStreaming: isWebSocket
  };
}
