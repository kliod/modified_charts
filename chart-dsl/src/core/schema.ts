import { Parser } from '../parser/parser';
import { SchemaRegistry } from './registry';
import type { ChartSchemaDefinition } from '../types/index';

/**
 * Тип для tagged template literal функции
 */
export type SchemaTemplateTag = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => ChartSchemaDefinition;

/**
 * Создать схему графика из DSL
 */
export function chartSchema(
  strings: TemplateStringsArray,
  ...values: unknown[]
): ChartSchemaDefinition {
  // Объединить строки и значения
  const dsl = strings.reduce((acc, str, i) => {
    const value = values[i] !== undefined ? values[i] : '';
    return acc + str + (typeof value === 'function' ? `\${${value.toString()}}` : String(value));
  }, '');

  // Парсить DSL
  const parser = new Parser();
  const parsed = parser.parse(dsl, values);

  if (parsed.errors.length > 0) {
    console.warn('DSL parsing errors:', parsed.errors);
  }

  // Построить схему из конфига
  const schema: ChartSchemaDefinition = {
    ...parsed.config,
    ...parsed.ast.metadata
  };

  return schema;
}

/**
 * Создать именованную схему (для регистрации в реестре)
 */
export function namedChartSchema(name: string): SchemaTemplateTag {
  return (strings: TemplateStringsArray, ...values: unknown[]) => {
    const schema = chartSchema(strings, ...values);
    SchemaRegistry.register(name, schema);
    return schema;
  };
}
