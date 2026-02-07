import type { ChartSchemaDefinition } from './index';

/**
 * Результат разрешения конфигурации
 */
export interface ResolvedConfig {
  config: Record<string, any>;
  dependencies: string[];
  errors: ResolutionError[];
}

/**
 * Ошибка разрешения
 */
export interface ResolutionError {
  message: string;
  schema?: string;
  property?: string;
  code: 'CIRCULAR_DEPENDENCY' | 'MISSING_SCHEMA' | 'INVALID_PROPERTY' | 'VARIABLE_NOT_FOUND';
}

/**
 * Контекст разрешения
 */
export interface ResolutionContext {
  schemas: Map<string, ChartSchemaDefinition>;
  variables: Map<string, any>;
  visited: Set<string>;
  path: string[];
}
