import { Parser } from '../parser/parser';
import type { ChartSchemaDefinition, ChartConfigDefinition } from '../types/index';

/**
 * Тип для tagged template literal функции конфига
 */
export type ConfigTemplateTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => ChartConfigDefinition;

/**
 * Создать конфигурацию графика на основе схемы
 */
export function chartConfig(baseSchema: ChartSchemaDefinition): ConfigTemplateTag {
  return (strings: TemplateStringsArray, ...values: unknown[]): ChartConfigDefinition => {
    // Объединить строки и значения
    const dsl = strings.reduce((acc, str, i) => {
      const value = values[i] !== undefined ? values[i] : '';
      return acc + str + (typeof value === 'function' ? `\${${value.toString()}}` : String(value));
    }, '');

    // Парсить переопределения
    const parser = new Parser();
    const parsed = parser.parse(dsl, values);

    if (parsed.errors.length > 0) {
      console.warn('Config DSL parsing errors:', parsed.errors);
    }

    // Объединить базовую схему с переопределениями
    const overrides: Partial<ChartSchemaDefinition> = {
      ...parsed.config,
      ...parsed.ast.metadata
    };

    return {
      schema: baseSchema,
      overrides
    };
  };
}
