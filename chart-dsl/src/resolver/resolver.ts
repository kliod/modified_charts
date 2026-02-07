import type { ChartSchemaDefinition } from '../types/index';
import type { 
  ResolvedConfig, 
  ResolutionError, 
  ResolutionContext 
} from '../types/resolver';

/**
 * Resolver для разрешения зависимостей и наследования конфигураций
 */
export class Resolver {
  private schemas: Map<string, ChartSchemaDefinition> = new Map();
  private variables: Map<string, any> = new Map();

  /**
   * Зарегистрировать схему
   */
  registerSchema(name: string, schema: ChartSchemaDefinition): void {
    this.schemas.set(name, schema);
  }

  /**
   * Установить переменные
   */
  setVariables(variables: Record<string, any>): void {
    Object.entries(variables).forEach(([key, value]) => {
      this.variables.set(key, value);
    });
  }

  /**
   * Разрешить конфигурацию
   */
  resolve(schema: ChartSchemaDefinition, props?: any): ResolvedConfig {
    const context: ResolutionContext = {
      schemas: this.schemas,
      variables: this.variables,
      visited: new Set(),
      path: []
    };

    const errors: ResolutionError[] = [];
    const dependencies: string[] = [];

    try {
      const config = this.resolveSchema(schema, context, props, dependencies, errors);
      return {
        config,
        dependencies,
        errors
      };
    } catch (error) {
      errors.push({
        message: error instanceof Error ? error.message : 'Unknown error',
        code: 'MISSING_SCHEMA' // Используем существующий код ошибки
      });
      return {
        config: {},
        dependencies,
        errors
      };
    }
  }

  /**
   * Разрешить схему
   */
  private resolveSchema(
    schema: ChartSchemaDefinition,
    context: ResolutionContext,
    props: any,
    dependencies: string[],
    errors: ResolutionError[]
  ): Record<string, any> {
    let config: Record<string, any> = {};

    // Разрешить наследование
    if (schema.extends) {
      const baseSchema = this.schemas.get(schema.extends);
      if (!baseSchema) {
        errors.push({
          message: `Base schema "${schema.extends}" not found`,
          schema: schema.extends,
          code: 'MISSING_SCHEMA'
        });
      } else {
        // Проверить циклические зависимости
        if (context.visited.has(schema.extends)) {
          errors.push({
            message: `Circular dependency detected: ${context.path.join(' -> ')} -> ${schema.extends}`,
            schema: schema.extends,
            code: 'CIRCULAR_DEPENDENCY'
          });
        } else {
          context.visited.add(schema.extends);
          context.path.push(schema.extends);
          dependencies.push(schema.extends);
          
          const baseConfig = this.resolveSchema(
            baseSchema,
            context,
            props,
            dependencies,
            errors
          );
          
          config = this.deepMerge(config, baseConfig);
          context.visited.delete(schema.extends);
          context.path.pop();
        }
      }
    }

    // Применить текущую схему
    const currentConfig = this.processSchema(schema, props);
    config = this.deepMerge(config, currentConfig);

    // Разрешить переменные
    config = this.resolveVariables(config, context, errors);

    return config;
  }

  /**
   * Обработать схему (преобразовать в конфиг)
   */
  private processSchema(
    schema: ChartSchemaDefinition,
    props: any
  ): Record<string, any> {
    const config: Record<string, any> = {};

    for (const [key, value] of Object.entries(schema)) {
      if (key === 'extends' || key === 'map') {
        config[key] = value;
        continue;
      }

      // Обработать source с вызовом функции (например, rest("..."))
      if (key === 'source') {
        if (typeof value === 'object' && value !== null && value.type === 'function') {
          // Преобразовать вызов функции в строку или объект конфигурации
          if (value.name === 'rest' && value.args && value.args.length > 0) {
            config[key] = value.args[0]; // Первый аргумент - URL
          } else {
            config[key] = value; // Оставить как есть для других функций
          }
        } else {
          config[key] = value;
        }
        continue;
      }

      // Обработать функции (интерполяции)
      if (typeof value === 'function') {
        try {
          config[key] = value(props);
        } catch (error) {
          config[key] = value;
        }
      } else {
        config[key] = value;
      }
    }

    return config;
  }

  /**
   * Разрешить переменные в конфиге
   */
  private resolveVariables(
    config: Record<string, any>,
    context: ResolutionContext,
    errors: ResolutionError[],
    skipJsonPath: boolean = false
  ): Record<string, any> {
    const resolved: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      // Специальная обработка для map - все его значения являются JSONPath выражениями
      if (key === 'map') {
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          // Рекурсивно обработать map, но не пытаться разрешать JSONPath как переменные
          resolved[key] = this.resolveVariables(value, context, errors, true);
        } else {
          resolved[key] = value;
        }
        continue;
      }
      
      // Пропустить JSONPath выражения (начинаются с "$.") - они не являются переменными
      // Если skipJsonPath=true, все значения остаются как есть (для map)
      if (skipJsonPath) {
        resolved[key] = value;
        continue;
      }
      
      if (typeof value === 'string' && value.startsWith('$.')) {
        resolved[key] = value;
        continue;
      }
      
      if (typeof value === 'string' && value.startsWith('$')) {
        const varName = value.substring(1);
        if (context.variables.has(varName)) {
          resolved[key] = context.variables.get(varName);
        } else {
          errors.push({
            message: `Variable "${value}" not found`,
            property: key,
            code: 'VARIABLE_NOT_FOUND'
          });
          resolved[key] = value; // Оставить как есть
        }
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        resolved[key] = this.resolveVariables(value, context, errors);
      } else {
        resolved[key] = value;
      }
    }

    return resolved;
  }

  /**
   * Deep merge двух объектов
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        typeof result[key] === 'object' &&
        result[key] !== null &&
        !Array.isArray(result[key])
      ) {
        result[key] = this.deepMerge(result[key], value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Очистить все зарегистрированные схемы
   */
  clear(): void {
    this.schemas.clear();
    this.variables.clear();
  }
}
