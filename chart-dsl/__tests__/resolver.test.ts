import { describe, it, expect } from 'vitest';
import { Resolver } from '../src/resolver/resolver';
import { Validator } from '../src/resolver/validator';
import type { ChartSchemaDefinition } from '../types/index';

describe('Resolver', () => {
  it('should resolve basic schema', () => {
    const resolver = new Resolver();
    const schema: ChartSchemaDefinition = {
      type: 'bar',
      color: '#007aff'
    };

    const result = resolver.resolve(schema);

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('bar');
    expect(result.config.color).toBe('#007aff');
  });

  it('should resolve inheritance', () => {
    const resolver = new Resolver();
    
    const baseSchema: ChartSchemaDefinition = {
      type: 'bar',
      options: {
        legend: {
          position: 'bottom'
        }
      }
    };

    const extendedSchema: ChartSchemaDefinition = {
      extends: 'baseBar',
      color: '#007aff'
    };

    resolver.registerSchema('baseBar', baseSchema);
    const result = resolver.resolve(extendedSchema);

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('bar');
    expect(result.config.color).toBe('#007aff');
    expect(result.config.options.legend.position).toBe('bottom');
    expect(result.dependencies).toContain('baseBar');
  });

  it('should deep merge configurations', () => {
    const resolver = new Resolver();
    
    const baseSchema: ChartSchemaDefinition = {
      options: {
        legend: {
          position: 'bottom',
          display: true
        },
        scales: {
          y: {
            beginAtZero: true
          }
        }
      }
    };

    const extendedSchema: ChartSchemaDefinition = {
      extends: 'base',
      options: {
        legend: {
          position: 'top' // Переопределить
        },
        scales: {
          y: {
            beginAtZero: true // Оставить
          },
          x: {
            display: false // Добавить новое
          }
        }
      }
    };

    resolver.registerSchema('base', baseSchema);
    const result = resolver.resolve(extendedSchema);

    expect(result.errors).toHaveLength(0);
    expect(result.config.options.legend.position).toBe('top');
    expect(result.config.options.legend.display).toBe(true);
    expect(result.config.options.scales.y.beginAtZero).toBe(true);
    expect(result.config.options.scales.x.display).toBe(false);
  });

  it('should detect circular dependencies', () => {
    const resolver = new Resolver();
    
    const schema1: ChartSchemaDefinition = {
      extends: 'schema2',
      type: 'bar'
    };

    const schema2: ChartSchemaDefinition = {
      extends: 'schema1',
      color: 'red'
    };

    resolver.registerSchema('schema1', schema1);
    resolver.registerSchema('schema2', schema2);
    
    const result = resolver.resolve(schema1);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
  });

  it('should resolve variables', () => {
    const resolver = new Resolver();
    resolver.setVariables({
      primary: '#007aff',
      secondary: '#32B8C6'
    });

    const schema: ChartSchemaDefinition = {
      type: 'bar',
      color: '$primary',
      backgroundColor: '$secondary'
    };

    const result = resolver.resolve(schema);

    expect(result.errors).toHaveLength(0);
    expect(result.config.color).toBe('#007aff');
    expect(result.config.backgroundColor).toBe('#32B8C6');
  });

  it('should handle missing variables', () => {
    const resolver = new Resolver();
    
    const schema: ChartSchemaDefinition = {
      type: 'bar',
      color: '$nonexistent'
    };

    const result = resolver.resolve(schema);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.code === 'VARIABLE_NOT_FOUND')).toBe(true);
    expect(result.config.color).toBe('$nonexistent'); // Остается как есть
  });

  it('should handle missing base schema', () => {
    const resolver = new Resolver();
    
    const schema: ChartSchemaDefinition = {
      extends: 'nonexistent',
      type: 'bar'
    };

    const result = resolver.resolve(schema);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.code === 'MISSING_SCHEMA')).toBe(true);
  });

  it('should resolve interpolations with props', () => {
    const resolver = new Resolver();
    
    const schema: ChartSchemaDefinition = {
      type: ((props: any) => props?.chartType || 'bar') as any,
      source: ((props: any) => `/api/charts/${props?.reportId}`) as any
    };

    const result = resolver.resolve(schema, { chartType: 'line', reportId: 'sales-2024' });

    expect(result.errors).toHaveLength(0);
    expect(result.config.type).toBe('line');
    // source может быть функцией или результатом функции
    const sourceValue = typeof result.config.source === 'function' 
      ? result.config.source({ reportId: 'sales-2024' })
      : result.config.source;
    expect(sourceValue).toBe('/api/charts/sales-2024');
  });
});

describe('Validator', () => {
  it('should validate valid schema', () => {
    const validator = new Validator();
    const schema: ChartSchemaDefinition = {
      type: 'bar',
      source: 'rest("/api/charts")'
    };

    const errors = validator.validateSchema(schema);

    expect(errors).toHaveLength(0);
  });

  it('should detect invalid chart type', () => {
    const validator = new Validator();
    const schema: ChartSchemaDefinition = {
      type: 'invalid' as any
    };

    const errors = validator.validateSchema(schema);

    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.property === 'type')).toBe(true);
  });

  it('should validate atomic response', () => {
    const validator = new Validator();
    const response = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'Sales',
          data: [100, 200, 300]
        }
      ]
    };

    const errors = validator.validateAtomicResponse(response);

    expect(errors).toHaveLength(0);
  });

  it('should detect invalid atomic response', () => {
    const validator = new Validator();
    const response = {
      labels: 'not an array',
      datasets: []
    };

    const errors = validator.validateAtomicResponse(response);

    expect(errors.length).toBeGreaterThan(0);
  });
});
