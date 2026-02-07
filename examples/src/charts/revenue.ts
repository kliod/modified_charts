import { chartSchema, chartConfig } from '@internal/chart-dsl';

const revenueSchema = chartSchema`
  type: line;
  source: rest("/api/charts/revenue");
  map.labels: $.labels;
  map.datasets: $.datasets;
  options.scales.y.beginAtZero: true;
`;

export const RevenueChart = chartConfig(revenueSchema)`
  color: $primary;
  options.plugins.title.text: "Revenue";
`;
