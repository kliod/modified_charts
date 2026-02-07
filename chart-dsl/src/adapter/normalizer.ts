import type { ChartType, ChartData, ChartOptions } from 'chart.js';
import type { AtomicChartResponse, DatasetConfig, DatasetDescriptor } from '../types/index';
import type { NormalizedChartConfig } from '../types/chartjs';

type ChartDatasetLike = ChartData['datasets'] extends (infer D)[] ? D : never;

/**
 * Нормализатор конфигураций для Chart.js
 */
export class ConfigNormalizer {
  /**
   * Нормализовать конфигурацию для Chart.js
   */
  static normalize(
    type: ChartType,
    data: AtomicChartResponse,
    options?: Partial<ChartOptions>,
    overrides?: Partial<AtomicChartResponse>
  ): NormalizedChartConfig {
    // Применить переопределения
    const finalData = overrides
      ? this.mergeData(data, overrides)
      : data;

    // Построить ChartData (нормализованные датасеты совместимы с Chart.js по структуре)
    const chartData: ChartData = {
      labels: finalData.labels || [],
      datasets: this.normalizeDatasets(finalData.datasets || []) as ChartDatasetLike[]
    };

    // Построить ChartOptions
    const chartOptions: ChartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      ...finalData.options,
      ...options
    };

    return {
      type,
      data: chartData,
      options: chartOptions
    };
  }

  /**
   * Объединить данные с переопределениями
   */
  private static mergeData(
    base: AtomicChartResponse,
    overrides: Partial<AtomicChartResponse>
  ): AtomicChartResponse {
    return {
      labels: overrides.labels || base.labels,
      datasets: overrides.datasets || base.datasets,
      options: {
        ...base.options,
        ...overrides.options
      },
      meta: overrides.meta || base.meta
    };
  }

  /**
   * Нормализовать датасеты
   */
  private static normalizeDatasets(
    datasets: Array<Record<string, any>>
  ): Array<Record<string, any>> {
    return datasets.map(dataset => {
      const normalized: Record<string, any> = {
        label: dataset.label || 'Dataset',
        data: dataset.data || []
      };

      // Копировать все остальные свойства
      Object.keys(dataset).forEach(key => {
        if (key !== 'label' && key !== 'data' && key !== 'id') {
          normalized[key] = dataset[key];
        }
      });

      return normalized;
    });
  }

  /**
   * Получить человекочитаемые дескрипторы датасетов для конструктора
   */
  static getDatasetDescriptors(
    datasets: DatasetConfig[],
    _chartType?: ChartType
  ): DatasetDescriptor[] {
    return (datasets || []).map((ds, index) => {
      const data = ds.data || [];
      const dataFormat: 'numeric' | 'xy' =
        Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null && 'x' in (data[0] as object)
          ? 'xy'
          : 'numeric';
      const count = Array.isArray(data) ? data.length : 0;
      const dataPreview =
        dataFormat === 'numeric'
          ? `${count} значений`
          : `${count} точек`;
      const colorMode: 'single' | 'array' =
        Array.isArray(ds.backgroundColor) ? 'array' : 'single';
      const label = ds.label || `Датасет ${index + 1}`;
      return {
        index,
        label,
        id: ds.id,
        dataFormat,
        colorMode,
        dataPreview,
        dataLength: count
      };
    });
  }

  /**
   * Обновить данные графика без пересоздания
   */
  static updateData(
    currentConfig: NormalizedChartConfig,
    newData: AtomicChartResponse
  ): NormalizedChartConfig {
    return {
      ...currentConfig,
      data: {
        labels: newData.labels || currentConfig.data.labels,
        datasets: this.normalizeDatasets(newData.datasets || []) as ChartDatasetLike[]
      }
    };
  }
}
