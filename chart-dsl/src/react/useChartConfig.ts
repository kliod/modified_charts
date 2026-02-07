import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Resolver } from '../resolver/resolver';
import { normalizeSource, getAdapter } from '../data-provider/adapters';
import { ChartJSAdapter } from '../adapter/chartjs';
import { SchemaRegistry } from '../core/registry';
import { getSegmentColorsForPie } from '../core/segmentPalette';
import { useChartProvider } from './ChartProvider';
import type { ChartConfigDefinition, AtomicChartResponse, DataSourceConfig, DatasetConfig } from '../types/index';
import type { NormalizedChartConfig } from '../types/chartjs';

type DatasetOverride = {
  backgroundColor?: string | string[];
  borderColor?: string;
  borderWidth?: number;
  opacity?: number;
  label?: string;
  borderRadius?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  tension?: number;
};
/** Минимальный тип состояния конструктора для применения стилей к датасетам */
interface BuilderStateLike {
  datasetOverrides?: Record<string, DatasetOverride>;
  backgroundColor?: string;
  borderColor?: string;
  color?: string;
  opacity?: number;
  borderWidth?: number;
  borderRadius?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
  tension?: number;
}

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

/** Применить только цвета темы к уже существующим опциям */
function applyThemeColorsToOptions(
  options: Record<string, unknown>,
  variables: Record<string, unknown>
): Record<string, unknown> {
  const textColor = String(variables.$text ?? '#333');
  const gridColor = colorToRgba(textColor, 0.2);
  const out: Record<string, unknown> = { ...options, color: (options.color ?? textColor) as string };
  const scalesObj = out.scales as Record<string, unknown> | undefined;
  if (scalesObj && typeof scalesObj === 'object' && !Array.isArray(scalesObj)) {
    out.scales = { ...scalesObj };
    const scales = out.scales as Record<string, unknown>;
    for (const key of Object.keys(scales)) {
      if (key === 'r') continue;
      const scale = scales[key];
      if (scale && typeof scale === 'object' && !Array.isArray(scale)) {
        const s = scale as Record<string, unknown>;
        scales[key] = {
          ...s,
          grid: s.grid && typeof s.grid === 'object' ? { ...(s.grid as object), color: gridColor } : { color: gridColor },
          ticks: s.ticks && typeof s.ticks === 'object' ? { ...(s.ticks as object), color: textColor } : { color: textColor },
        };
      }
    }
  }
  const pluginsObj = out.plugins as Record<string, unknown> | undefined;
  if (pluginsObj && typeof pluginsObj === 'object' && !Array.isArray(pluginsObj)) {
    out.plugins = { ...pluginsObj };
    const plugins = out.plugins as Record<string, unknown>;
    plugins.title = plugins.title && typeof plugins.title === 'object' ? { ...(plugins.title as object), color: textColor } : { color: textColor };
    plugins.legend = plugins.legend && typeof plugins.legend === 'object'
      ? { ...(plugins.legend as object), labels: (plugins.legend as Record<string, unknown>).labels && typeof (plugins.legend as Record<string, unknown>).labels === 'object' ? { ...((plugins.legend as Record<string, unknown>).labels as object), color: textColor } : { color: textColor } }
      : { labels: { color: textColor } };
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
      const source = (resolved.config.source ?? chartConfig.schema?.source) as string | DataSourceConfig | undefined;

      if (source && (typeof source === 'string' || (typeof source === 'object' && source !== null && 'url' in source))) {
        const baseURL = (providerConfig as { baseURL?: string }).baseURL ?? '';
        const normalized = normalizeSource(source as string | DataSourceConfig, baseURL);
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
        const mapping = (resolved.config.map ?? chartConfig.schema?.map) as Record<string, string> | undefined;
        chartData = await adapter.fetch(normalized, params, mapping);
      }

      const chartType = (resolved.config.type as string) || 'bar';
      if (!ChartJSAdapter.isSupportedType(chartType)) {
        throw new Error(`Unsupported chart type: ${chartType}`);
      }

      let finalChartData: AtomicChartResponse = chartData || { labels: [], datasets: [] };
      const builderState = (chartConfig as ChartConfigDefinition & { _builderState?: BuilderStateLike })._builderState;
      if (builderState && finalChartData.datasets && finalChartData.datasets.length > 0) {
        
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
          datasets: finalChartData.datasets.map((dataset: DatasetConfig, index: number) => {
            const updated: Record<string, unknown> = { ...dataset };
            const overRaw =
              (dataset.id != null ? datasetOverrides[dataset.id] : undefined) ??
              (dataset.label != null ? datasetOverrides[dataset.label] : undefined) ??
              datasetOverrides[String(index)] ??
              datasetOverrides[index as unknown as string];
            const over: DatasetOverride | undefined = overRaw && typeof overRaw === 'object' ? overRaw : undefined;

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
                const baseColor = builderState.backgroundColor || builderState.color;
                const firstColor = baseColor && over?.backgroundColor === undefined
                  ? (builderState.opacity !== undefined && builderState.opacity < 1 && baseColor
                      ? applyColorWithOpacity(baseColor, builderState.opacity)
                      : baseColor)
                  : undefined;
                updated.backgroundColor = getSegmentColorsForPie(dataLen, firstColor ?? undefined);
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
            return updated as DatasetConfig;
          })
        };
      }

      const resolvedOptions = (resolved.config.options || {}) as Record<string, unknown>;
      const overridesOptions = (chartConfig.overrides?.options || {}) as Record<string, unknown>;
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
        baseMerged as Record<string, unknown>,
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
          const scalesBase = (mergedOptions.scales && typeof mergedOptions.scales === 'object') ? mergedOptions.scales as Record<string, unknown> : {};
          mergedOptions = {
            ...mergedOptions,
            scales: {
              ...scalesBase,
              y: {
                ...(scalesBase.y && typeof scalesBase.y === 'object' ? (scalesBase.y as object) : {}),
                min: 0,
                max: fixedScaleYMaxRef.current
              }
            }
          };
        }
      }

      const plugins = (resolved.config.plugins ?? chartConfig.overrides?.plugins) as import('../types/chartjs').PluginConfig | undefined;
      const normalizedConfig = await ChartJSAdapter.createConfig(
        chartType as import('chart.js').ChartType,
        finalChartData,
        mergedOptions,
        plugins
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- omit providerConfig to avoid unnecessary refetch
  }, [chartConfig, params, variables]);

  // Загрузить при монтировании и изменении конфига или параметров
  const builderState = (chartConfig as Record<string, unknown>)._builderState;
  const configKey = useMemo(() => {
    return JSON.stringify({
      schema: chartConfig.schema,
      overrides: chartConfig.overrides,
      theme: chartConfig.theme,
      params,
      _builderState: builderState
    });
  }, [chartConfig.schema, chartConfig.overrides, chartConfig.theme, params, builderState]);

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
