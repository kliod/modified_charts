import type { Chart, ChartType, ChartOptions, Plugin } from 'chart.js';
import type { NormalizedChartConfig, PluginConfig, ChartEventHandlers } from '../types/chartjs';
import type { AtomicChartResponse } from '../types/index';
import { ConfigNormalizer } from './normalizer';

declare global {
  interface Window {
    __chart_dsl_registered?: boolean;
  }
}

// Функция для регистрации Chart.js (вызывается динамически)
let registrationPromise: Promise<void> | null = null;

export async function registerChartJS(): Promise<void> {
  if (registrationPromise) {
    return registrationPromise;
  }

  registrationPromise = (async () => {
    if (typeof window !== 'undefined' && window.__chart_dsl_registered) {
      return;
    }

    const chartModule = await import('chart.js');
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
    } = chartModule;

    const componentsToRegister: (typeof Plugin | unknown)[] = [
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

    Chart.register(...(componentsToRegister.filter(Boolean) as Plugin[]));

    if (typeof window !== 'undefined') {
      window.__chart_dsl_registered = true;
    }
  })();

  return registrationPromise;
}

/**
 * Адаптер для Chart.js
 */
export class ChartJSAdapter {
  /**
   * Создать конфигурацию Chart.js
   */
  static async createConfig(
    type: ChartType,
    data: AtomicChartResponse,
    options?: Partial<ChartOptions>,
    plugins?: PluginConfig,
    events?: ChartEventHandlers
  ): Promise<NormalizedChartConfig> {
    // Убедиться, что Chart.js зарегистрирован
    await registerChartJS();
    
    const normalized = ConfigNormalizer.normalize(type, data, options);

    // Применить плагины
    if (plugins) {
      normalized.plugins = this.injectPlugins(plugins);
    }

    // Применить обработчики событий
    if (events) {
      this.attachEventHandlers(normalized, events);
    }

    return normalized;
  }

  /**
   * Инъекция плагинов
   */
  private static injectPlugins(pluginConfig: PluginConfig): Plugin[] {
    const plugins: Plugin[] = [];

    // Tooltip plugin
    if (pluginConfig.tooltip !== false) {
      plugins.push({
        id: 'tooltip',
        ...(typeof pluginConfig.tooltip === 'object' ? pluginConfig.tooltip : {})
      });
    }

    // Legend plugin
    if (pluginConfig.legend !== false) {
      plugins.push({
        id: 'legend',
        ...(typeof pluginConfig.legend === 'object' ? pluginConfig.legend : {})
      });
    }

    // Title plugin
    if (pluginConfig.title !== false) {
      plugins.push({
        id: 'title',
        ...(typeof pluginConfig.title === 'object' ? pluginConfig.title : {})
      });
    }

    // Дополнительные плагины
    Object.entries(pluginConfig).forEach(([key, value]) => {
      if (!['tooltip', 'legend', 'title'].includes(key) && value !== false) {
        plugins.push({
          id: key,
          ...(typeof value === 'object' ? value : {})
        });
      }
    });

    return plugins;
  }

  /**
   * Прикрепить обработчики событий
   */
  private static attachEventHandlers(
    config: NormalizedChartConfig,
    handlers: ChartEventHandlers
  ): void {
    if (!config.options) {
      config.options = {};
    }

    if (!config.options.onHover) {
      config.options.onHover = (event, elements) => {
        if (handlers.onHover) {
          handlers.onHover(event.native as MouseEvent, elements);
        }
      };
    }

    if (!config.options.onClick) {
      config.options.onClick = (event, elements) => {
        if (handlers.onClick) {
          handlers.onClick(event.native as MouseEvent, elements);
        }
      };
    }

    // Для zoom и pan нужны дополнительные плагины (zoom plugin)
    // Здесь мы только подготавливаем структуру
    if (handlers.onZoom || handlers.onPan) {
      // Требуется chartjs-plugin-zoom
      // Это можно добавить позже как опциональную зависимость
    }
  }

  /**
   * Обновить график
   */
  static async updateChart(
    chart: Chart,
    newData: AtomicChartResponse,
    options?: Partial<ChartOptions>
  ): Promise<void> {
    await registerChartJS();
    
    const normalized = ConfigNormalizer.normalize(
      chart.config.type,
      newData,
      options
    );

    chart.data = normalized.data;
    if (normalized.options) {
      chart.options = { ...chart.options, ...normalized.options };
    }
    chart.update();
  }

  /**
   * Проверить поддержку типа графика
   */
  static isSupportedType(type: string): boolean {
    const supportedTypes: ChartType[] = [
      'bar',
      'line',
      'pie',
      'doughnut',
      'radar',
      'scatter',
      'bubble'
    ];
    return supportedTypes.includes(type as ChartType);
  }
}
