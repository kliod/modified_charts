import { useEffect, useRef, useState } from 'react';
import { useChartConfig } from './useChartConfig';
import type { ChartRendererProps } from '../types/index';
import type { Chart as ChartInstance, ChartOptions, ChartType } from 'chart.js';

/**
 * Компонент для рендеринга графиков
 */
export function ChartRenderer({
  config,
  overrides,
  params,
  onChartReady,
  onDataUpdate,
  onError,
  className,
  style,
  loading: loadingComponent,
  error: errorComponent,
  retry = 3
}: ChartRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ChartInstance | null>(null);
  const previousTypeRef = useRef<ChartType | null>(null);
  const previousMaintainAspectRatioRef = useRef<boolean | undefined>(undefined);
  const [chartModule, setChartModule] = useState<typeof import('chart.js') | null>(null);
  const { data, config: chartConfig, loading, error, refetch, isStreaming } = useChartConfig(config, params);

  // Нормализовать опции для Chart.js
  const normalizeOptions = (options: Partial<ChartOptions>, type: ChartType): Partial<ChartOptions> => {
    const normalized: Partial<ChartOptions> = { ...options };
    
    // Проверить scales для radar chart
    if (type === 'radar' && normalized.scales) {
      if (normalized.scales.r) {
        const rScale = normalized.scales.r as Record<string, unknown>;
        if (typeof rScale.beginAtZero !== 'undefined' && typeof rScale.beginAtZero !== 'boolean') {
          (normalized.scales as Record<string, unknown>).r = {
            ...rScale,
            beginAtZero: Boolean(rScale.beginAtZero)
          };
        }
      }
    }
    
    // Проверить все опции на наличие неправильных типов
    const checkValue = (value: unknown, path: string = ''): unknown => {
      if (value === null || value === undefined) {
        return value;
      }
      
      // Если это объект, рекурсивно проверить его свойства
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const checked: Record<string, unknown> = {};
        for (const [key, val] of Object.entries(value)) {
          checked[key] = checkValue(val, `${path}.${key}`);
        }
        return checked;
      }
      
      // Если это функция или примитив, вернуть как есть
      return value;
    };
    
    return checkValue(normalized) as Partial<ChartOptions>;
  };

  // Динамический импорт Chart.js (только один раз)
  useEffect(() => {
    let cancelled = false;
    
    import('chart.js').then((module) => {
      if (!cancelled) {
        // Регистрация компонентов
        const {
          Chart,
          CategoryScale,
          LinearScale,
          RadialLinearScale,
          BarElement,
          LineElement,
          PointElement,
          ArcElement,
          BarController,
          LineController,
          PieController,
          DoughnutController,
          RadarController,
          ScatterController,
          BubbleController,
          Title,
          Tooltip,
          Legend,
          Filler
        } = module;
        
        if (typeof window !== 'undefined' && !(window as Window & { __chart_dsl_registered?: boolean }).__chart_dsl_registered) {
          const componentsToRegister: unknown[] = [
            CategoryScale,
            LinearScale,
            RadialLinearScale,
            BarElement,
            LineElement,
            PointElement,
            ArcElement,
            BarController,
            LineController,
            PieController,
            DoughnutController,
            RadarController,
            ScatterController,
            BubbleController,
            Title,
            Tooltip,
            Legend,
            Filler
          ].filter(Boolean);
          Chart.register(...(componentsToRegister as Parameters<typeof Chart.register>));
          (window as Window & { __chart_dsl_registered?: boolean }).__chart_dsl_registered = true;
        }
        
        setChartModule(module);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

      // Создать или обновить график
      useEffect(() => {
        if (!canvasRef.current || !chartConfig || !chartModule) {
          return;
        }

        const { Chart } = chartModule;

    // Применить переопределения
    const finalConfig = overrides
      ? {
          ...chartConfig,
          data: {
            ...chartConfig.data,
            labels: overrides.labels || chartConfig.data.labels,
            datasets: overrides.datasets || chartConfig.data.datasets
          }
        }
      : chartConfig;

    // Проверить и нормализовать опции перед передачей в Chart.js
    const normalizedOptions = finalConfig.options ? normalizeOptions(finalConfig.options, finalConfig.type) : undefined;
    const safeConfig = {
      ...finalConfig,
      options: normalizedOptions || finalConfig.options
    };

    // Если график привязан к другому canvas (например canvas размонтировался при показе loading и смонтирован заново) — пересоздать
    if (chartRef.current && chartRef.current.canvas !== canvasRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    // Проверить, изменился ли тип графика или maintainAspectRatio — тогда пересоздать график (Chart.js не пересчитывает layout при смене maintainAspectRatio)
    const currentType = safeConfig.type;
    const currentMaintainAspectRatio = safeConfig.options?.maintainAspectRatio;
    const typeChanged = previousTypeRef.current !== null && previousTypeRef.current !== currentType;
    const maintainAspectRatioChanged = previousMaintainAspectRatioRef.current !== undefined && previousMaintainAspectRatioRef.current !== currentMaintainAspectRatio;

    if (chartRef.current && (typeChanged || maintainAspectRatioChanged)) {
      chartRef.current.destroy();
      chartRef.current = null;
    }
    previousMaintainAspectRatioRef.current = currentMaintainAspectRatio;

    if (chartRef.current) {
      if (isStreaming && safeConfig.data?.labels && safeConfig.data?.datasets) {
        // Потоковый режим: обновляем данные на месте, чтобы Chart.js анимировал переход от старого значения к новому, а не от нуля
        const chart = chartRef.current;
        chart.data.labels = safeConfig.data.labels;
        const newSets = safeConfig.data.datasets;
        for (let i = 0; i < chart.data.datasets.length && i < newSets.length; i++) {
          const chartDs = chart.data.datasets[i] as Record<string, unknown> & { data: unknown[] };
          const newDs = newSets[i];
          const newData = Array.isArray(newDs.data) ? newDs.data : [];
          const oldData = chartDs.data;
          if (Array.isArray(oldData) && oldData.length === newData.length) {
            for (let j = 0; j < oldData.length; j++) {
              const v = newData[j];
              if (typeof v === 'number') oldData[j] = v;
              else if (v != null && typeof v === 'object') oldData[j] = Array.isArray(oldData[j]) || typeof oldData[j] !== 'object' ? v : { ...(typeof oldData[j] === 'object' && oldData[j] !== null ? (oldData[j] as object) : {}), ...(v as object) };
            }
          } else {
            chartDs.data = newData.map((v) =>
              v == null ? null : (typeof v === 'number' ? v : { ...v })
            );
          }
          if (newDs.label !== undefined) chartDs.label = newDs.label;
          if (newDs.backgroundColor !== undefined) chartDs.backgroundColor = newDs.backgroundColor;
          if (newDs.borderColor !== undefined) chartDs.borderColor = newDs.borderColor;
        }
      } else {
        // Клонируем данные, чтобы Chart.js всегда видел новый объект и перерисовывал (при cache hit иначе ссылка та же и графика может не обновиться)
        const d = safeConfig.data;
        if (d) {
          chartRef.current.data = {
            labels: [...(d.labels || [])],
            datasets: (d.datasets || []).map((ds) => {
              const spreadDs = ds as Record<string, unknown>;
              return {
                ...spreadDs,
                data: Array.isArray(spreadDs.data) ? (spreadDs.data as unknown[]).map((v: unknown) => (typeof v === 'number' ? v : v != null && typeof v === 'object' ? { ...(v as object) } : v)) : spreadDs.data
              };
            })
          } as typeof chartRef.current.data;
        } else {
          chartRef.current.data = d;
        }
      }
      if (safeConfig.options) {
        // Глубокое слияние опций для правильного обновления вложенных объектов
        const deepMergeOptions = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
          const result = { ...target };
          for (const key in source) {
            const srcVal = source[key];
            const tgtVal = target[key];
            if (srcVal && typeof srcVal === 'object' && !Array.isArray(srcVal) && !(srcVal instanceof Date)) {
              result[key] = deepMergeOptions((tgtVal && typeof tgtVal === 'object' && !Array.isArray(tgtVal) ? tgtVal : {}) as Record<string, unknown>, srcVal as Record<string, unknown>);
            } else {
              result[key] = srcVal;
            }
          }
          return result;
        };
        const cleanInternalProps = (obj: unknown): Record<string, unknown> | unknown => {
          if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
            return obj;
          }
          const cleaned: Record<string, unknown> = {};
          const o = obj as Record<string, unknown>;
          for (const key in o) {
            if (key === 'resolver' || key.startsWith('$')) {
              continue;
            }
            const val = o[key];
            if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
              cleaned[key] = cleanInternalProps(val) as Record<string, unknown>;
            } else {
              cleaned[key] = val;
            }
          }
          return cleaned;
        };
        const mergedOptions = deepMergeOptions((chartRef.current.options || {}) as Record<string, unknown>, (safeConfig.options || {}) as Record<string, unknown>);
        const cleanedOptions = cleanInternalProps(mergedOptions) as Record<string, unknown>;
        if (typeof safeConfig.options?.maintainAspectRatio === 'boolean') {
          cleanedOptions.maintainAspectRatio = safeConfig.options.maintainAspectRatio;
        }
        if (typeof safeConfig.options?.responsive === 'boolean') {
          cleanedOptions.responsive = safeConfig.options.responsive;
        }
        if (safeConfig.options?.scales && typeof safeConfig.options.scales === 'object') {
          const scales = (cleanedOptions.scales || {}) as Record<string, unknown>;
          for (const key of Object.keys(safeConfig.options.scales)) {
            const src = safeConfig.options.scales[key];
            if (src && typeof src === 'object') {
              scales[key] = { ...((scales[key] as Record<string, unknown>) || {}), ...src };
            }
          }
          cleanedOptions.scales = scales;
        }
        chartRef.current.options = cleanedOptions as typeof chartRef.current.options;
      }
      // WebSocket/поток: анимация движения баров; иначе — мгновенное обновление
      chartRef.current.update(isStreaming ? undefined : 'none');
      previousTypeRef.current = currentType;
      previousMaintainAspectRatioRef.current = currentMaintainAspectRatio;
    } else {
      chartRef.current = new Chart(canvasRef.current, safeConfig);
      previousTypeRef.current = currentType;
      previousMaintainAspectRatioRef.current = currentMaintainAspectRatio;
      if (onChartReady) {
        onChartReady(chartRef.current);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartConfig, data, chartModule, isStreaming]);

  // Вызвать onDataUpdate при загрузке данных (даже до рендера canvas)
  useEffect(() => {
    if (onDataUpdate && data && !loading && !error) {
      onDataUpdate(data);
    }
  }, [onDataUpdate, data, loading, error]);

  // Обработка ошибок
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // ResizeObserver для адаптивности canvas
  useEffect(() => {
    if (!containerRef.current || !chartRef.current || !chartModule) {
      return;
    }

    const resizeObserver = new ResizeObserver(() => {
      if (chartRef.current) {
        // Использовать requestAnimationFrame для плавного обновления
        requestAnimationFrame(() => {
          if (chartRef.current) {
            chartRef.current.resize();
          }
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [chartConfig, chartModule]);

  // Cleanup при unmount
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, []);

  // Рендер состояний
  if (loading || !chartModule) {
    return loadingComponent ? <>{loadingComponent}</> : <div>Loading...</div>;
  }

  if (error) {
    if (errorComponent) {
      return <>{errorComponent}</>;
    }
    
    return (
      <div>
        <p>Error: {error.message}</p>
        {retry > 0 && (
          <button onClick={() => refetch()}>
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={className} 
      style={{
        width: '100%',
        height: '100%',
        minHeight: 280,
        position: 'relative',
        ...style
      }}
    >
      <canvas ref={canvasRef} />
    </div>
  );
}
