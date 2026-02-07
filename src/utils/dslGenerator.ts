import type { ChartConfigDefinition } from '../../chart-dsl/src/types/index';

/**
 * Генерация DSL кода из конфигурации
 */
export function generateDSL(config: ChartConfigDefinition): string {
  const lines: string[] = [];
  
  // Схема
  lines.push('const schema = chartSchema`');
  
  // Тип графика
  if (config.schema.type) {
    lines.push(`  type: ${config.schema.type};`);
  }
  
  // Наследование
  if (config.schema.extends) {
    lines.push(`  extends: ${config.schema.extends};`);
  }
  
  // Источник данных
  if (config.schema.source) {
    if (typeof config.schema.source === 'string') {
      lines.push(`  source: rest("${config.schema.source}");`);
    } else {
      const src = config.schema.source as { type?: string; url?: string; query?: string };
      if (src.type === 'graphql') {
        const queryEsc = (src.query || '').replace(/\\/g, '\\\\').replace(/`/g, '\\`');
        lines.push(`  source: graphql("${src.url || ''}", \`${queryEsc}\`);`);
      } else {
        lines.push(`  source: rest("${src.url || ''}");`);
      }
    }
  }
  
  // Маппинг
  if (config.schema.map) {
    Object.entries(config.schema.map).forEach(([key, value]) => {
      lines.push(`  map.${key}: ${value};`);
    });
  }
  
  // Опции из схемы
  Object.entries(config.schema).forEach(([key, value]) => {
    if (!['type', 'source', 'extends', 'map'].includes(key) && value !== undefined) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        lines.push(`  ${key}: ${formatValue(value)};`);
      }
    }
  });
  
  lines.push('`;');
  lines.push('');
  
  // Конфигурация
  lines.push('export const Chart = chartConfig(schema)`');
  
  // Цвет
  if (config.overrides?.color) {
    lines.push(`  color: ${config.overrides.color};`);
  }
  
  // Тема
  if (config.theme) {
    lines.push(`  theme: ${config.theme};`);
  }
  
  // Опции из переопределений
  if (config.overrides?.options) {
    const options = config.overrides.options;
    
    // Responsive и maintainAspectRatio
    if (options.responsive !== undefined) {
      lines.push(`  options.responsive: ${formatValue(options.responsive)};`);
    }
    if (options.maintainAspectRatio !== undefined) {
      lines.push(`  options.maintainAspectRatio: ${formatValue(options.maintainAspectRatio)};`);
    }
    
    // Plugins
    if (options.plugins) {
      if (options.plugins.title) {
        if (options.plugins.title.display !== undefined) {
          lines.push(`  options.plugins.title.display: ${formatValue(options.plugins.title.display)};`);
        }
        if (options.plugins.title.text) {
          lines.push(`  options.plugins.title.text: ${formatValue(options.plugins.title.text)};`);
        }
      }
      if (options.plugins.legend) {
        if (options.plugins.legend.display !== undefined) {
          lines.push(`  options.plugins.legend.display: ${formatValue(options.plugins.legend.display)};`);
        }
        if (options.plugins.legend.position) {
          lines.push(`  options.plugins.legend.position: ${formatValue(options.plugins.legend.position)};`);
        }
      }
    }
    
    // Scales
    if (options.scales) {
      Object.entries(options.scales).forEach(([scaleKey, scaleValue]) => {
        if (typeof scaleValue === 'object' && scaleValue !== null) {
          Object.entries(scaleValue).forEach(([propKey, propValue]) => {
            if (propValue !== undefined) {
              lines.push(`  options.scales.${scaleKey}.${propKey}: ${formatValue(propValue)};`);
            }
          });
        }
      });
    }
  }
  
  // Другие переопределения
  if (config.overrides) {
    Object.entries(config.overrides).forEach(([key, value]) => {
      if (!['color', 'theme', 'options'].includes(key) && value !== undefined) {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          lines.push(`  ${key}: ${formatValue(value)};`);
        }
      }
    });
  }
  
  lines.push('`;');
  
  return lines.join('\n');
}

/**
 * Форматирование значения для DSL
 */
function formatValue(value: unknown): string {
  if (typeof value === 'string') {
    // Если строка содержит специальные символы или пробелы, обернуть в кавычки
    if (value.includes(' ') || value.includes('$') || value.includes('.')) {
      return `"${value}"`;
    }
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

/**
 * Экспорт конфигурации в JSON
 */
export function exportToJSON(config: ChartConfigDefinition): string {
  return JSON.stringify(config, null, 2);
}
