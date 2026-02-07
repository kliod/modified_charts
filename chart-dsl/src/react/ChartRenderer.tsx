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
    const normalized: any = { ...options };
    
    // Проверить scales для radar chart
    if (type === 'radar' && normalized.scales) {
      // Убедиться, что scale имеет правильный тип
      if (normalized.scales.r) {
        const rScale = normalized.scales.r;
        // Проверить, что все свойства имеют правильные типы
        if (typeof rScale.beginAtZero !== 'undefined' && typeof rScale.beginAtZero !== 'boolean') {
          normalized.scales.r = {
            ...rScale,
            beginAtZero: Boolean(rScale.beginAtZero)
          };
        }
      }
    }
    
    // Проверить все опции на наличие неправильных типов
    const checkValue = (value: any, path: string = ''): any => {
      if (value === null || value === undefined) {
        return value;
      }
      
      // Если это объект, рекурсивно проверить его свойства
      if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        const checked: any = {};
        for (const [key, val] of Object.entries(value)) {
          checked[key] = checkValue(val, `${path}.${key}`);
        }
        return checked;
      }
      
      // Если это функция или примитив, вернуть как есть
      return value;
    };
    
    return checkValue(normalized);
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
        
        if (typeof window !== 'undefined' && !(window as any).__chart_dsl_registered) {
          const componentsToRegister: any[] = [
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
          ].filter(Boolean); // Убрать undefined компоненты
          
          Chart.register(...componentsToRegister);
          (window as any).__chart_dsl_registered = true;
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
          const chartDs = chart.data.datasets[i] as any;
          const newDs = newSets[i];
          const newData = Array.isArray(newDs.data) ? newDs.data : [];
          const oldData = chartDs.data;
          if (Array.isArray(oldData) && oldData.length === newData.length) {
            for (let j = 0; j < oldData.length; j++) {
              const v = newData[j];
              if (typeof v === 'number') oldData[j] = v;
              else if (v != null && typeof v === 'object') oldData[j] = Array.isArray(oldData[j]) || typeof oldData[j] !== 'object' ? v : { ...oldData[j], ...v };
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
        chartRef.current.data = d
          ? {
              labels: [...(d.labels || [])],
              datasets: (d.datasets || []).map((ds: any) => ({
                ...ds,
                data: Array.isArray(ds.data) ? (ds.data as any[]).map((v: any) => (typeof v === 'number' ? v : { ...v })) : ds.data
              }))
            }
          : d;
      }
      if (safeConfig.options) {
        // Глубокое слияние опций для правильного обновления вложенных объектов
        const deepMergeOptions = (target: any, source: any): any => {
          const result = { ...target };
          for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) && !(source[key] instanceof Date)) {
              result[key] = deepMergeOptions(target[key] || {}, source[key]);
            } else {
              result[key] = source[key];
            }
          }
          return result;
        };
        // Функция для очистки внутренних свойств Chart.js из объекта опций
        const cleanInternalProps = (obj: any): any => {
          if (!obj || typeof obj !== 'object' || Array.isArray(obj) || obj instanceof Date) {
            return obj;
          }
          const cleaned: any = {};
          for (const key in obj) {
            if (key === 'resolver' || key.startsWith('$')) {
              continue;
            }
            if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key]) && !(obj[key] instanceof Date)) {
              cleaned[key] = cleanInternalProps(obj[key]);
            } else {
              cleaned[key] = obj[key];
            }
          }
          return cleaned;
        };
        const mergedOptions = deepMergeOptions(chartRef.current.options || {}, safeConfig.options);
        const cleanedOptions = cleanInternalProps(mergedOptions);
        if (typeof safeConfig.options?.maintainAspectRatio === 'boolean') {
          cleanedOptions.maintainAspectRatio = safeConfig.options.maintainAspectRatio;
        }
        if (typeof safeConfig.options?.responsive === 'boolean') {
          cleanedOptions.responsive = safeConfig.options.responsive;
        }
        if (safeConfig.options?.scales && typeof safeConfig.options.scales === 'object') {
          cleanedOptions.scales = cleanedOptions.scales || {};
          for (const key of Object.keys(safeConfig.options.scales)) {
            const src = safeConfig.options.scales[key];
            if (src && typeof src === 'object') {
              cleanedOptions.scales[key] = { ...(cleanedOptions.scales[key] || {}), ...src };
            }
          }
        }
        chartRef.current.options = cleanedOptions;
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
