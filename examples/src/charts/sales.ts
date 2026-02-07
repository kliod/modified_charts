import { chartSchema, chartConfig } from '@internal/chart-dsl';

// Схема bar chart с REST источником
const salesAtomic = chartSchema`
  type: bar;
  options.legend.position: bottom;
  options.scales.y.beginAtZero: true;
  source: rest("/api/charts/sales-atomic");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

// Экспорт конфигурации
export const SalesReportChart = chartConfig(salesAtomic)`
  color: #007aff;
  options.plugins.title.display: true;
  options.plugins.title.text: "Sales Report";
`;
