import type { ChartSchemaDefinition } from '../types/index';

/**
 * Реестр схем для централизованного управления
 */
export class SchemaRegistry {
  private static schemas: Map<string, ChartSchemaDefinition> = new Map();

  /**
   * Зарегистрировать схему
   */
  static register(name: string, schema: ChartSchemaDefinition): void {
    if (this.schemas.has(name)) {
      console.warn(`Schema "${name}" is already registered. Overwriting...`);
    }
    this.schemas.set(name, schema);
  }

  /**
   * Получить схему по имени
   */
  static get(name: string): ChartSchemaDefinition | undefined {
    return this.schemas.get(name);
  }

  /**
   * Проверить наличие схемы
   */
  static has(name: string): boolean {
    return this.schemas.has(name);
  }

  /**
   * Удалить схему
   */
  static unregister(name: string): boolean {
    return this.schemas.delete(name);
  }

  /**
   * Получить все зарегистрированные схемы
   */
  static getAll(): Map<string, ChartSchemaDefinition> {
    return new Map(this.schemas);
  }

  /**
   * Очистить реестр
   */
  static clear(): void {
    this.schemas.clear();
  }
}
