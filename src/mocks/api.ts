/**
 * Моки для REST API endpoints
 */

export interface MockResponse {
  labels?: string[];
  datasets: Array<{
    id?: string;
    label: string;
    data: number[] | Array<{ x: number; y: number }>;
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
  options?: Record<string, unknown>;
  meta?: {
    title?: string;
    generatedAt?: string;
  };
}

// Мок для sales API
export const mockSalesData: MockResponse = {
  labels: ['January', 'February', 'March', 'April', 'May', 'June'],
  datasets: [
    {
      id: 'sales-2024',
      label: 'Sales 2024',
      data: [65000, 78000, 92000, 85000, 95000, 110000],
      backgroundColor: 'rgba(0, 122, 255, 0.5)',
      borderColor: 'rgba(0, 122, 255, 1)',
      borderWidth: 2
    },
    {
      id: 'sales-2023',
      label: 'Sales 2023',
      data: [54000, 61000, 72000, 68000, 75000, 82000],
      backgroundColor: 'rgba(230, 129, 97, 0.5)',
      borderColor: 'rgba(230, 129, 97, 1)',
      borderWidth: 2
    }
  ],
  options: {
    stacked: false,
    scales: {
      y: {
        beginAtZero: true
      }
    }
  },
  meta: {
    title: 'Sales Report Q1-Q2',
    generatedAt: new Date().toISOString()
  }
};

// Мок для revenue API
export const mockRevenueData: MockResponse = {
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  datasets: [
    {
      label: 'Revenue',
      data: [250000, 320000, 280000, 350000],
      backgroundColor: [
        'rgba(50, 184, 198, 0.5)',
        'rgba(50, 184, 198, 0.5)',
        'rgba(50, 184, 198, 0.5)',
        'rgba(50, 184, 198, 0.5)'
      ],
      borderColor: 'rgba(50, 184, 198, 1)',
      borderWidth: 2
    }
  ],
  options: {
    scales: {
      y: {
        beginAtZero: true
      }
    }
  }
};

// Мок для analytics API
export const mockAnalyticsData: MockResponse = {
  labels: ['Desktop', 'Mobile', 'Tablet'],
  datasets: [
    {
      label: 'Traffic Sources',
      data: [45, 35, 20],
      backgroundColor: [
        'rgba(52, 199, 89, 0.5)',
        'rgba(0, 122, 255, 0.5)',
        'rgba(255, 149, 0, 0.5)'
      ],
      borderColor: [
        'rgba(52, 199, 89, 1)',
        'rgba(0, 122, 255, 1)',
        'rgba(255, 149, 0, 1)'
      ],
      borderWidth: 2
    }
  ]
};

// Мок для doughnut chart
export const mockDoughnutData: MockResponse = {
  labels: ['Product A', 'Product B', 'Product C', 'Product D'],
  datasets: [
    {
      label: 'Sales Distribution',
      data: [30, 25, 20, 25],
      backgroundColor: [
        'rgba(255, 99, 132, 0.5)',
        'rgba(54, 162, 235, 0.5)',
        'rgba(255, 206, 86, 0.5)',
        'rgba(75, 192, 192, 0.5)'
      ],
      borderColor: [
        'rgba(255, 99, 132, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(75, 192, 192, 1)'
      ] as string[],
      borderWidth: 2
    }
  ]
};

// Мок для radar chart
export const mockRadarData: MockResponse = {
  labels: ['Speed', 'Reliability', 'Comfort', 'Safety', 'Efficiency', 'Price'],
  datasets: [
    {
      label: 'Product A',
      data: [80, 90, 70, 85, 75, 65],
      backgroundColor: 'rgba(54, 162, 235, 0.2)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2
    },
    {
      label: 'Product B',
      data: [70, 85, 90, 75, 80, 70],
      backgroundColor: 'rgba(255, 99, 132, 0.2)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 2
    }
  ]
};

// Мок для scatter chart
export const mockScatterData: MockResponse = {
  datasets: [
    {
      label: 'Sales vs Marketing',
      data: [
        { x: 10, y: 20 },
        { x: 15, y: 25 },
        { x: 20, y: 30 },
        { x: 25, y: 35 },
        { x: 30, y: 40 },
        { x: 35, y: 45 },
        { x: 40, y: 50 },
        { x: 45, y: 55 }
      ] as Array<{ x: number; y: number }>,
      backgroundColor: 'rgba(75, 192, 192, 0.5)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2
    }
  ]
};

/**
 * Мок fetch для перехвата запросов
 */
let mockFetchInstalled = false;

export function setupMockFetch() {
  // Предотвратить множественную установку
  if (mockFetchInstalled) {
    return () => {};
  }
  
  const originalFetch = window.fetch;
  mockFetchInstalled = true;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.href;
    } else {
      urlString = input.url;
    }
    
    if (urlString.includes('127.0.0.1:7243') || urlString.includes('localhost:7243')) {
      return originalFetch(input, init);
    }
    
    let path: string;
    try {
      const urlObj = new URL(urlString, window.location.origin);
      path = urlObj.pathname;
    } catch {
      path = urlString.startsWith('/') ? urlString : `/${urlString}`;
    }

    const method = (init?.method ?? 'GET').toUpperCase();
    let isGraphQL = false;
    if (method === 'POST' && typeof init?.body === 'string') {
      try {
        const body = JSON.parse(init.body) as { query?: string };
        isGraphQL = Boolean(body && typeof body === 'object' && 'query' in body);
      } catch {
        /* не JSON */
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
    
    let mockData: MockResponse | null = null;
    
    if (path.includes('/api/charts/sales') || path.includes('/api/charts/sales-atomic')) {
      mockData = mockSalesData;
    } else if (path.includes('/api/charts/revenue')) {
      mockData = mockRevenueData;
    } else if (path.includes('/api/charts/analytics')) {
      mockData = mockAnalyticsData;
    } else if (path.includes('/api/charts/doughnut')) {
      mockData = mockDoughnutData;
    } else if (path.includes('/api/charts/radar')) {
      mockData = mockRadarData;
    } else if (path.includes('/api/charts/scatter')) {
      mockData = mockScatterData;
    }
    
    // Для GraphQL (POST с query) на любой путь отдаём ответ в формате { data: { chartData: ... } },
    // чтобы после ввода переменных авто-запрос не падал и график появлялся
    if (isGraphQL) {
      const data = mockData ?? mockSalesData;
      return new Response(JSON.stringify({ data: { chartData: data } }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    if (mockData) {
      return new Response(JSON.stringify(mockData), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    return originalFetch(input, init);
  };
  
  return () => {
    window.fetch = originalFetch;
    mockFetchInstalled = false;
  };
}
