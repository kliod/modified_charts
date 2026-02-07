# Chart DSL — библиотека

Декларативная настройка графиков на базе Chart.js: схемы через tagged template literals, наследование, темы, REST/GraphQL/WebSocket.

## Зависимости

- **chart.js** ^4.x
- **react**, **react-dom** ^18 || ^19 (peer)

## Установка (в монорепо)

Библиотека подключается по путям из корня проекта (`chart-dsl/src`). Для отдельной публикации соберите: `npm run build` (в папке chart-dsl).

## Быстрый старт

### Схема и конфиг

```typescript
import { chartSchema, chartConfig } from '@internal/chart-dsl';

const baseBar = chartSchema`
  type: bar;
  options.legend.position: bottom;
  options.scales.y.beginAtZero: true;
`;

const salesSchema = chartSchema`
  extends: baseBar;
  source: rest("/api/charts/sales");
  map.labels: $.labels;
  map.datasets: $.datasets;
`;

export const SalesChart = chartConfig(salesSchema)`
  color: "#007aff";
  options.plugins.title.text: "Sales Report";
`;
```

### Рендер в React

```typescript
import { ChartRenderer, ChartProvider } from '@internal/chart-dsl/react';

<ChartProvider theme="dark">
  <ChartRenderer config={SalesChart} loading={<span>Загрузка...</span>} error={<span>Ошибка</span>} />
</ChartProvider>
```

## API

### Ядро (из основного экспорта)

| Функция / класс | Описание |
|-----------------|----------|
| `chartSchema` | Tagged template: создаёт схему графика (type, source, map, options.*). |
| `namedChartSchema` | Схема с именем для наследования. |
| `chartConfig(schema)` | Tagged template: переопределения поверх схемы (color, options.*). |
| `withTheme(config, theme)` | Применить тему (light/dark или объект) к конфигу. |
| `getBuiltInTheme(name)` | Получить встроенную тему по имени. |
| `createTheme(partial)` | Создать кастомную тему. |
| `SchemaRegistry` | Реестр именованных схем (для extends). |
| `ConfigNormalizer` | Нормализация данных и опций под Chart.js. |
| `PIE_DEFAULT_SEGMENT_PALETTE`, `getSegmentColorsForPie` | Палитры для pie/doughnut. |

### React (`@internal/chart-dsl/react`)

| Компонент / хук | Описание |
|-----------------|----------|
| `ChartProvider` | Контекст: тема (light/dark), кэш, таймауты. Пропсы: `theme`, `cacheStrategy`, `maxCacheSize`, `requestTimeout`. |
| `ChartRenderer` | Рендер графика по `ChartConfigDefinition`. Пропсы: `config`, `overrides`, `params`, `loading`, `error`, `onChartReady`, `onDataUpdate`, `onError`. |
| `useChartProvider()` | Доступ к контексту ChartProvider. |
| `useChartConfig(config, params?)` | Разрезолвить конфиг, подгрузить данные; возвращает `{ data, config, loading, error, refetch, isStreaming }`. |

### Типы (экспортируются из основного пакета)

- **Схема и конфиг:** `ChartSchemaDefinition`, `ChartConfigDefinition`, `ChartRendererProps`
- **Данные:** `AtomicChartResponse`, `DatasetConfig`, `DatasetDescriptor`, `ChartMeta`
- **Источники:** `RestSourceConfig`, `GraphQLSourceConfig`, `WebSocketSourceConfig`, `DataSourceConfig`, `ChartDataAdapter`
- **Темы:** `ChartTheme`, `BuiltInTheme`, `ThemeVariables`
- **Chart.js:** `NormalizedChartConfig`, `PluginConfig`, `ChartEventHandlers`

## Источники данных

- **REST:** `source: rest("/api/...")` или объект `{ type: 'rest', url, method?, headers?, body?, params? }`.
- **GraphQL:** `{ type: 'graphql', url, query, variables?, headers? }`.
- **WebSocket:** `{ type: 'websocket', url, refreshIntervalMs? }` (в демо — симуляция обновлений).

Маппинг ответа в `AtomicChartResponse`: в схеме задаётся `map.labels`, `map.datasets` (JSONPath, например `$.labels`, `$.data.chartData.datasets`).

## Темы

Встроенные: `light`, `dark`. В конфиге можно указать `theme: 'light' | 'dark'` или объект `ChartTheme` (colors, typography, spacing). Переменные темы в DSL: `$primary`, `$text` и т.д.

## Структура библиотеки

```
chart-dsl/src/
├── core/         # schema, config, theme, registry, segmentPalette
├── parser/       # лексер и парсер DSL (комментарии, свойства, вызовы rest(...))
├── resolver/     # разрешение extends, переменных, валидация
├── data-provider/ # REST, GraphQL, WebSocket, кэш (TTL), JSONPath-маппинг
├── adapter/      # нормализация под Chart.js, плагины (ChartJSAdapter, ConfigNormalizer)
├── react/        # ChartProvider, ChartRenderer, useChartConfig
└── types/        # типы для схем, конфигов, источников, тем, Chart.js
```

## Тесты

В папке `chart-dsl`:

```bash
npm run test          # vitest
npm run test:coverage # с покрытием
```

Тесты: ConfigNormalizer, ChartJSAdapter, лексер/парсер, кэши, маппинг, RestDataProvider, Resolver, Validator.
