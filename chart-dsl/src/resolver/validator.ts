import type { ChartSchemaDefinition } from '../types/index';
import type { ResolutionError } from '../types/resolver';

/**
 * Валидатор конфигураций
 */
export class Validator {
  /**
   * Валидировать схему
   */
  validateSchema(schema: ChartSchemaDefinition): ResolutionError[] {
    const errors: ResolutionError[] = [];

    // Валидация типа графика
    if (schema.type) {
      const validTypes = [
        'bar',
        'line',
        'pie',
        'doughnut',
        'radar',
        'scatter',
        'bubble'
      ];
      if (!validTypes.includes(schema.type)) {
        errors.push({
          message: `Invalid chart type: ${schema.type}. Must be one of: ${validTypes.join(', ')}`,
          property: 'type',
          code: 'INVALID_PROPERTY'
        });
      }
    }

    // Валидация source
    if (schema.source) {
      if (typeof schema.source === 'string') {
        try {
          new URL(schema.source, 'http://localhost');
        } catch {
          // относительный путь допустим
        }
      } else if (typeof schema.source === 'object') {
        const src = schema.source as { type?: string; url?: string; query?: string };
        if (src.type === 'graphql') {
          if (!src.url) {
            errors.push({ message: 'GraphQL source config must have "url" property', property: 'source', code: 'INVALID_PROPERTY' });
          }
          if (typeof src.query !== 'string' || !src.query.trim()) {
            errors.push({ message: 'GraphQL source config must have non-empty "query" property', property: 'source', code: 'INVALID_PROPERTY' });
          }
        } else if (src.type === 'websocket') {
          if (!src.url) {
            errors.push({ message: 'WebSocket source config must have "url" property', property: 'source', code: 'INVALID_PROPERTY' });
          }
        } else {
          if (!src.url) {
            errors.push({ message: 'REST source config must have "url" property', property: 'source', code: 'INVALID_PROPERTY' });
          }
        }
      }
    }

    // Валидация map
    if (schema.map) {
      for (const [key, path] of Object.entries(schema.map)) {
        if (typeof path !== 'string' || !path.startsWith('$.')) {
          errors.push({
            message: `Invalid JSONPath in map.${key}: must start with "$."`,
            property: `map.${key}`,
            code: 'INVALID_PROPERTY'
          });
        }
      }
    }

    return errors;
  }

  /**
   * Валидировать атомизированный ответ
   */
  validateAtomicResponse(response: unknown): ResolutionError[] {
    const errors: ResolutionError[] = [];

    // Проверить обязательные поля
    const res = response as { labels?: unknown; datasets?: unknown[] };
    if (!res.labels || !Array.isArray(res.labels)) {
      errors.push({
        message: 'AtomicChartResponse must have "labels" as an array',
        code: 'INVALID_PROPERTY'
      });
    }

    if (!res.datasets || !Array.isArray(res.datasets)) {
      errors.push({
        message: 'AtomicChartResponse must have "datasets" as an array',
        code: 'INVALID_PROPERTY'
      });
    } else {
      // Валидировать каждый датасет
      res.datasets.forEach((dataset: { label?: unknown; data?: unknown }, index: number) => {
        if (!dataset.label || typeof dataset.label !== 'string') {
          errors.push({
            message: `Dataset[${index}] must have "label" as a string`,
            code: 'INVALID_PROPERTY'
          });
        }

        if (!dataset.data || !Array.isArray(dataset.data)) {
          errors.push({
            message: `Dataset[${index}] must have "data" as an array`,
            code: 'INVALID_PROPERTY'
          });
        }
      });
    }

    return errors;
  }

  /**
   * Валидировать финальный конфиг для Chart.js
   */
  validateChartConfig(config: unknown): ResolutionError[] {
    const errors: ResolutionError[] = [];
    const cfg = config as Record<string, unknown>;

    if (!cfg.type) {
      errors.push({
        message: 'Chart config must have "type" property',
        code: 'INVALID_PROPERTY'
      });
    }

    if (!cfg.data) {
      errors.push({
        message: 'Chart config must have "data" property',
        code: 'INVALID_PROPERTY'
      });
    }

    return errors;
  }
}
