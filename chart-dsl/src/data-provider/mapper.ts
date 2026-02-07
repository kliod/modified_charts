/**
 * JSONPath маппер для трансформации данных
 */
export class JSONPathMapper {
  /**
   * Получить значение по JSONPath
   */
  static getValue(obj: any, path: string): any {
    if (!path.startsWith('$.')) {
      throw new Error(`Invalid JSONPath: must start with "$."`);
    }

    const parts = path.substring(2).split('.');
    let current = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      // Обработка массивов с индексами [0], [1] и т.д.
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = current[arrayName];
        if (Array.isArray(current)) {
          current = current[parseInt(index, 10)];
        } else {
          return undefined;
        }
      } else {
        current = current[part];
      }
    }

    return current;
  }

  /**
   * Применить маппинг к объекту
   */
  static map(data: any, mapping: Record<string, string>): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [targetPath, sourcePath] of Object.entries(mapping)) {
      const value = this.getValue(data, sourcePath);
      
      if (value !== undefined) {
        this.setNestedValue(result, targetPath, value);
      }
    }

    return result;
  }

  /**
   * Установить вложенное значение по пути
   */
  private static setNestedValue(
    obj: Record<string, any>,
    path: string,
    value: any
  ): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }

    current[parts[parts.length - 1]] = value;
  }
}
