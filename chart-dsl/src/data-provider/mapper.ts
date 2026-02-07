/**
 * JSONPath маппер для трансформации данных
 */
export class JSONPathMapper {
  /**
   * Получить значение по JSONPath
   */
  static getValue(obj: unknown, path: string): unknown {
    if (!path.startsWith('$.')) {
      throw new Error(`Invalid JSONPath: must start with "$."`);
    }

    const parts = path.substring(2).split('.');
    let current: unknown = obj;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      const rec = current as Record<string, unknown>;
      // Обработка массивов с индексами [0], [1] и т.д.
      const arrayMatch = part.match(/^(\w+)\[(\d+)\]$/);
      if (arrayMatch) {
        const [, arrayName, index] = arrayMatch;
        current = arrayName ? rec[arrayName] : undefined;
        if (Array.isArray(current)) {
          current = current[parseInt(index ?? '0', 10)];
        } else {
          return undefined;
        }
      } else {
        current = rec[part];
      }
    }

    return current;
  }

  /**
   * Применить маппинг к объекту
   */
  static map(data: unknown, mapping: Record<string, string>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

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
    obj: Record<string, unknown>,
    path: string,
    value: unknown
  ): void {
    const parts = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!(part in current) || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }
}
