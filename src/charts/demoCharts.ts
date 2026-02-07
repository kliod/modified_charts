import { chartSchema, chartConfig, SchemaRegistry } from '../../chart-dsl/src/index';

// Базовая схема bar chart
const baseBar = chartSchema`
  type: bar;
  options.legend.position: bottom;
  options.scales.y.beginAtZero: true;
  options.responsive: true;
  options.maintainAspectRatio: true;
`;

// Зарегистрировать базовую схему для использования в extends
SchemaRegistry.register('baseBar', baseBar);

// Sales chart с REST источником
const salesAtomic = chartSchema`
  extends: baseBar;
  source: rest("/api/charts/sales-atomic");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

export const SalesChart = chartConfig(salesAtomic)`
  color: #007aff;
  options.plugins.title.display: true;
  options.plugins.title.text: "Sales Report";
  options.plugins.title.font.size: 18;
`;

// Revenue line chart
const revenueSchema = chartSchema`
  type: line;
  source: rest("/api/charts/revenue");
  map.labels: $.labels;
  map.datasets: $.datasets;
  options.scales.y.beginAtZero: true;
  options.elements.line.tension: 0.4;
`;

export const RevenueChart = chartConfig(revenueSchema)`
  color: $primary;
  options.plugins.title.display: true;
  options.plugins.title.text: "Revenue by Quarter";
  options.plugins.legend.display: true;
`;

// Analytics pie chart
const analyticsSchema = chartSchema`
  type: pie;
  source: rest("/api/charts/analytics");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

export const AnalyticsChart = chartConfig(analyticsSchema)`
  options.plugins.title.display: true;
  options.plugins.title.text: "Traffic Sources";
  options.plugins.legend.position: right;
`;

// Doughnut chart
const doughnutSchema = chartSchema`
  type: doughnut;
  source: rest("/api/charts/doughnut");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

export const DoughnutChart = chartConfig(doughnutSchema)`
  options.plugins.title.display: true;
  options.plugins.title.text: "Sales Distribution";
  options.plugins.legend.position: right;
`;

// Radar chart
const radarSchema = chartSchema`
  type: radar;
  source: rest("/api/charts/radar");
  map.labels: $.labels;
  map.datasets: $.datasets;
  options.scales.r.type: radialLinear;
  options.scales.r.beginAtZero: true;
`;

export const RadarChart = chartConfig(radarSchema)`
  options.plugins.title.display: true;
  options.plugins.title.text: "Product Comparison";
  options.plugins.legend.position: top;
`;

// Scatter chart
const scatterSchema = chartSchema`
  type: scatter;
  source: rest("/api/charts/scatter");
  map.datasets: $.datasets;
  options.scales.x.title.display: true;
  options.scales.x.title.text: "Marketing Spend";
  options.scales.y.title.display: true;
  options.scales.y.title.text: "Sales";
`;

export const ScatterChart = chartConfig(scatterSchema)`
  options.plugins.title.display: true;
  options.plugins.title.text: "Sales vs Marketing";
  options.plugins.legend.display: true;
`;
