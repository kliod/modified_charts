import { TTLCache } from './cache';
import { JSONPathMapper } from './mapper';
import type { AtomicChartResponse, DataSourceConfig, RestSourceConfig } from '../types/index';

/**
 * Конфигурация REST провайдера
 */
export interface RestProviderConfig {
  baseURL?: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  cacheEnabled?: boolean;
  cacheTTL?: number;
  cacheSize?: number;
  headers?: Record<string, string>;
}

/**
 * REST Data Provider для загрузки данных графиков
 */
export class RestDataProvider {
  private cache: TTLCache<string, AtomicChartResponse>;
  private config: Required<RestProviderConfig>;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor(config: RestProviderConfig = {}) {
    this.config = {
      baseURL: config.baseURL || '',
      timeout: config.timeout || 5000,
      retryCount: config.retryCount || 3,
      retryDelay: config.retryDelay || 1000,
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600000, // 1 час
      cacheSize: config.cacheSize || 50,
      headers: config.headers || {}
    };

    this.cache = new TTLCache(
      this.config.cacheSize,
      this.config.cacheTTL
    );
  }

  /**
   * Загрузить данные из REST API (контракт ChartDataAdapter: принимает DataSourceConfig или строку для обратной совместимости).
   */
  async fetch(
    source: string | DataSourceConfig,
    params?: Record<string, any>,
    mapping?: Record<string, string>
  ): Promise<AtomicChartResponse> {
    const sourceConfig = this.normalizeSource(source, params);
    const cacheKey = this.getCacheKey(sourceConfig);

    // Проверить кэш
    if (this.config.cacheEnabled) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Не прерывать предыдущий запрос при том же cacheKey (дубли из-за двойного вызова эффекта);
    // useChartConfig игнорирует устаревшие ответы по loadId.

    // Выполнить запрос с retry
    let data: AtomicChartResponse;
    try {
      data = await this.fetchWithRetry(sourceConfig, cacheKey);
    } catch (fetchErr) {
      throw fetchErr;
    }

    // Применить маппинг
    let mappedData = data;
    if (mapping && Object.keys(mapping).length > 0) {
      mappedData = this.applyMapping(data, mapping);
    }

    // Кэшировать результат
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, mappedData);
    }

    return mappedData;
  }

  /**
   * Нормализовать источник данных (только REST: строка или RestSourceConfig / DataSourceConfig с type 'rest' или без type).
   */
  private normalizeSource(
    source: string | DataSourceConfig,
    params?: Record<string, any>
  ): RestSourceConfig {
    if (typeof source === 'string') {
      let url = source;
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          url = url.replace(`\${${key}}`, String(value));
          url = url.replace(`{${key}}`, String(value));
        });
      }
      return {
        type: 'rest',
        url: this.config.baseURL + url,
        method: 'GET'
      };
    }
    if ((source as DataSourceConfig).type === 'graphql') {
      throw new Error('RestDataProvider does not support GraphQL source; use GraphQLDataProvider');
    }
    const rest = source as RestSourceConfig;
    let url = rest.url;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url = url.replace(`\${${key}}`, String(value));
        url = url.replace(`{${key}}`, String(value));
      });
    }
    return {
      type: 'rest',
      ...rest,
      url: this.config.baseURL + url
    };
  }

  /**
   * Получить ключ кэша.
   * _cacheBust (не уходит на сервер) меняется при смене типа/настроек источника — даёт свежие данные после переключения API.
   */
  private getCacheKey(source: RestSourceConfig): string {
    const parts = [
      source.method || 'GET',
      source.url,
      JSON.stringify(source.params || {}),
      JSON.stringify(source.body || {})
    ];
    const bust = (source as RestSourceConfig & { _cacheBust?: unknown })._cacheBust;
    if (bust !== undefined) parts.push(String(bust));
    return parts.join('|');
  }

  /**
   * Выполнить запрос с retry логикой
   */
  private async fetchWithRetry(
    source: RestSourceConfig,
    cacheKey: string
  ): Promise<AtomicChartResponse> {
    const controller = new AbortController();
    this.abortControllers.set(cacheKey, controller);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retryCount; attempt++) {
      try {
        const response = await this.executeRequest(source, controller.signal);
        this.abortControllers.delete(cacheKey);
        return response;
      } catch (error) {
        lastError = error as Error;

        // Не повторять при AbortError
        if (error instanceof Error && error.name === 'AbortError') {
          throw error;
        }

        // Последняя попытка - выбросить ошибку
        if (attempt === this.config.retryCount) {
          break;
        }

        // Exponential backoff
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    this.abortControllers.delete(cacheKey);
    throw lastError || new Error('Failed to fetch data');
  }

  /**
   * Выполнить HTTP запрос
   */
  private async executeRequest(
    source: RestSourceConfig,
    signal: AbortSignal
  ): Promise<AtomicChartResponse> {
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(
      () => timeoutController.abort(),
      this.config.timeout
    );

    try {
      const options: RequestInit = {
        method: source.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...this.config.headers,
          ...source.headers
        },
        signal: AbortSignal.any([signal, timeoutController.signal])
      };

      if (source.body && (source.method === 'POST' || source.method === 'PUT')) {
        options.body = JSON.stringify(source.body);
      }

      // Добавить query параметры
      let url = source.url;
      if (source.params) {
        const searchParams = new URLSearchParams();
        Object.entries(source.params).forEach(([key, value]) => {
          searchParams.append(key, String(value));
        });
        url += (url.includes('?') ? '&' : '?') + searchParams.toString();
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Проверить Content-Type перед парсингом
      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        await response.text();
        throw new Error(`Expected JSON response but got ${contentType}`);
      }

      let data: any;
      try {
        data = await response.json();
      } catch (jsonError) {
        throw new Error(`Failed to parse JSON response: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`);
      }
      return data as AtomicChartResponse;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Применить маппинг к данным
   */
  private applyMapping(
    data: any,
    mapping: Record<string, string>
  ): AtomicChartResponse {
    const mapped = JSONPathMapper.map(data, mapping);

    // Построить AtomicChartResponse
    const result: AtomicChartResponse = {
      labels: mapped.labels || data.labels || [],
      datasets: mapped.datasets || data.datasets || [],
      options: mapped.options || data.options,
      meta: mapped.meta || data.meta
    };

    return result;
  }

  /**
   * Очистить кэш
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Утилита для задержки
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
