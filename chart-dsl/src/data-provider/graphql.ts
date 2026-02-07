import { JSONPathMapper } from './mapper';
import type { AtomicChartResponse, DataSourceConfig, GraphQLSourceConfig } from '../types/index';

/**
 * GraphQL Data Provider — загрузка данных через GraphQL (POST с query/variables).
 * Реализует контракт ChartDataAdapter; маппинг через JSONPath общий с REST.
 */
export class GraphQLDataProvider {
  async fetch(
    source: DataSourceConfig,
    params?: Record<string, any>,
    mapping?: Record<string, string>
  ): Promise<AtomicChartResponse> {
    if (!source || (source as GraphQLSourceConfig).type !== 'graphql') {
      throw new Error('GraphQLDataProvider expects source.type === "graphql"');
    }
    const config = source as GraphQLSourceConfig;
    const url = this.applyParamsToUrl(config.url, params);
    const variables = { ...config.variables };
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        variables[key] = value;
      });
    }
    const body = JSON.stringify({
      query: config.query,
      variables: Object.keys(variables).length ? variables : undefined
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(config.headers || {})
    };
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body
    });
    if (!response.ok) {
      throw new Error(`GraphQL HTTP ${response.status}: ${response.statusText}`);
    }
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but got ${contentType}`);
    }
    let data: any;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(`Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown'}`);
    }
    if (data.errors && Array.isArray(data.errors) && data.errors.length > 0) {
      const msg = data.errors.map((e: any) => e.message || String(e)).join('; ');
      throw new Error(`GraphQL errors: ${msg}`);
    }
    let result: AtomicChartResponse;
    if (mapping && Object.keys(mapping).length > 0) {
      const mapped = JSONPathMapper.map(data, mapping);
      result = {
        labels: mapped.labels ?? data.labels ?? [],
        datasets: mapped.datasets ?? data.datasets ?? [],
        options: mapped.options ?? data.options,
        meta: mapped.meta ?? data.meta
      };
    } else {
      result = {
        labels: data.labels ?? [],
        datasets: data.datasets ?? [],
        options: data.options,
        meta: data.meta
      };
    }
    return result;
  }

  private applyParamsToUrl(url: string, params?: Record<string, any>): string {
    if (!params) return url;
    let out = url;
    Object.entries(params).forEach(([key, value]) => {
      out = out.replace(`\${${key}}`, String(value));
      out = out.replace(`{${key}}`, String(value));
    });
    return out;
  }
}
