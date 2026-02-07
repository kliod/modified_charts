import { useChartConfig, ChartRenderer } from '@internal/chart-dsl/react';
import { chartSchema, chartConfig } from '@internal/chart-dsl';

interface ChartProps {
  reportId?: string;
  title?: string;
}

const dynamicChart = chartSchema`
  type: bar;
  source: rest("/api/reports/${(props: ChartProps) => props.reportId}/chart");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

const DynamicChart = chartConfig(dynamicChart)`
  options.plugins.title.display: true;
  options.plugins.title.text: ${(props: ChartProps) => props.title || 'Report'};
`;

interface ReportPageProps {
  reportId: string;
  title?: string;
}

export function ReportPage({ reportId, title }: ReportPageProps) {
  const { config, loading, error } = useChartConfig(DynamicChart, { reportId });

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div>
      <h1>{title || `Report ${reportId}`}</h1>
      {config && <ChartRenderer config={DynamicChart} params={{ reportId, title }} />}
    </div>
  );
}
