import { ChartRenderer, ChartProvider } from '@internal/chart-dsl/react';
import { SalesReportChart } from '../charts/sales';
import { RevenueChart } from '../charts/revenue';

export function Dashboard() {
  return (
    <ChartProvider theme="dark">
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <ChartRenderer config={SalesReportChart} />
        <ChartRenderer config={RevenueChart} />
      </div>
    </ChartProvider>
  );
}
