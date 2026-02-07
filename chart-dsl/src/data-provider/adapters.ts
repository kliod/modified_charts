import type { DataSourceConfig, RestSourceConfig, ChartDataAdapter } from '../types/index';
import { RestDataProvider } from './rest';
import { GraphQLDataProvider } from './graphql';
import { WebSocketDataProvider } from './websocket';

export interface AdapterProviderConfig {
  baseURL?: string;
  maxCacheSize?: number;
  requestTimeout?: number;
}

let restAdapter: RestDataProvider | null = null;

function getRestAdapter(config: AdapterProviderConfig = {}): RestDataProvider {
  if (!restAdapter) {
    restAdapter = new RestDataProvider({
      cacheEnabled: true,
      cacheSize: config.maxCacheSize ?? 50,
      timeout: config.requestTimeout ?? 5000,
      baseURL: config.baseURL ?? ''
    });
  }
  return restAdapter;
}

/**
 * Нормализовать источник в DataSourceConfig (строка → REST-конфиг для обратной совместимости).
 */
export function normalizeSource(
  source: string | DataSourceConfig,
  baseURL = ''
): DataSourceConfig {
  if (typeof source === 'string') {
    const restMatch = source.match(/rest\(["'](.+?)["']\)/);
    const url = restMatch ? restMatch[1] : source;
    return {
      type: 'rest',
      url: baseURL + url,
      method: 'GET'
    };
  }
  if (source && typeof source === 'object') {
    if (source.type === 'graphql' || source.type === 'websocket') {
      return source;
    }
    const rest = source as RestSourceConfig;
    return {
      type: 'rest',
      ...rest,
      url: rest.url ? baseURL + rest.url : baseURL
    };
  }
  return { type: 'rest', url: baseURL, method: 'GET' };
}

/**
 * Получить адаптер по типу источника.
 */
export function getAdapter(source: DataSourceConfig, config?: AdapterProviderConfig): ChartDataAdapter {
  const type = source.type ?? 'rest';
  if (type === 'graphql') {
    return new GraphQLDataProvider();
  }
  if (type === 'websocket') {
    return new WebSocketDataProvider();
  }
  return getRestAdapter(config);
}
