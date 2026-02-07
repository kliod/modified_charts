import { describe, it, expect } from 'vitest';
import { ChartJSAdapter } from '../src/adapter/chartjs';
import { ConfigNormalizer } from '../src/adapter/normalizer';
import type { AtomicChartResponse } from '../types/index';

describe('ConfigNormalizer', () => {
  it('should normalize basic chart data', () => {
    const data: AtomicChartResponse = {
      labels: ['Jan', 'Feb', 'Mar'],
      datasets: [
        {
          label: 'Sales',
          data: [100, 200, 300]
        }
      ]
    };

    const normalized = ConfigNormalizer.normalize('bar', data);

    expect(normalized.type).toBe('bar');
    expect(normalized.data.labels).toEqual(['Jan', 'Feb', 'Mar']);
    expect(normalized.data.datasets).toHaveLength(1);
    expect(normalized.data.datasets[0].label).toBe('Sales');
    expect(normalized.data.datasets[0].data).toEqual([100, 200, 300]);
  });

  it('should merge options', () => {
    const data: AtomicChartResponse = {
      labels: [],
      datasets: [],
      options: {
        responsive: false
      }
    };

    const normalized = ConfigNormalizer.normalize('bar', data, {
      maintainAspectRatio: false
    });

    expect(normalized.options.responsive).toBe(false);
    expect(normalized.options.maintainAspectRatio).toBe(false);
  });

  it('should apply overrides', () => {
    const data: AtomicChartResponse = {
      labels: ['Jan'],
      datasets: []
    };

    const overrides: Partial<AtomicChartResponse> = {
      labels: ['Feb', 'Mar']
    };

    const normalized = ConfigNormalizer.normalize('bar', data, undefined, overrides);

    expect(normalized.data.labels).toEqual(['Feb', 'Mar']);
  });

  it('should get human-readable dataset descriptors', () => {
    const datasets = [
      { id: 'sales-2024', label: 'Sales 2024', data: [100, 200, 300], backgroundColor: 'rgba(0,0,0,0.5)' },
      { label: 'Revenue', data: [{ x: 10, y: 20 }, { x: 15, y: 25 }], backgroundColor: ['red', 'blue'] }
    ];
    const descriptors = ConfigNormalizer.getDatasetDescriptors(datasets as any, 'bar');
    expect(descriptors).toHaveLength(2);
    expect(descriptors[0]).toMatchObject({
      index: 0,
      label: 'Sales 2024',
      id: 'sales-2024',
      dataFormat: 'numeric',
      colorMode: 'single',
      dataPreview: '3 значений'
    });
    expect(descriptors[1]).toMatchObject({
      index: 1,
      label: 'Revenue',
      dataFormat: 'xy',
      colorMode: 'array',
      dataPreview: '2 точек'
    });
  });
});

describe('ChartJSAdapter', () => {
  it('should create config with plugins', async () => {
    const data: AtomicChartResponse = {
      labels: [],
      datasets: []
    };

    const config = await ChartJSAdapter.createConfig(
      'bar',
      data,
      {},
      {
        tooltip: true,
        legend: true,
        title: { display: true, text: 'Test' }
      }
    );

    expect(config.plugins).toBeDefined();
    expect(config.plugins!.length).toBeGreaterThan(0);
  });

  it('should check supported chart types', () => {
    expect(ChartJSAdapter.isSupportedType('bar')).toBe(true);
    expect(ChartJSAdapter.isSupportedType('line')).toBe(true);
    expect(ChartJSAdapter.isSupportedType('pie')).toBe(true);
    expect(ChartJSAdapter.isSupportedType('invalid')).toBe(false);
  });
});
