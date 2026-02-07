# Chart DSL — демо и конструктор

Монорепозиторий: библиотека декларативной настройки графиков на Chart.js и демо-приложение с конструктором.

## Содержимое

| Часть | Описание |
|-------|----------|
| **chart-dsl/** | Библиотека: DSL-схемы, парсер, резолвер, React-компоненты, источники данных (REST, GraphQL, WebSocket). |
| **src/** | Демо-приложение: страница с примерами графиков и конструктор (настройка типа, источника, опций, сохранение/загрузка). |
| **examples/** | Отдельные примеры использования библиотеки (Dashboard, Reports). |

## Стек

- React 19, TypeScript, Vite 7
- Chart.js 4, styled-components 6
- React Router 7

## Скрипты

```bash
npm install
npm run dev      # dev-сервер (Vite)
npm run build    # проверка типов + сборка
npm run lint     # ESLint
npm run test     # тесты библиотеки (chart-dsl)
npm run preview  # превью собранного приложения
```

## Маршруты приложения

- **/** — демо-страница с несколькими графиками (bar, line, pie, doughnut, radar, scatter).
- **/builder** — конструктор: выбор типа графика, источника данных (REST/GraphQL/WebSocket), маппинг, опции Chart.js, сохранение и загрузка конфигов, экспорт DSL.

Данные на демо-странице и в конструкторе отдаются моком (`src/mocks/api.ts`), без бэкенда.

## Структура репозитория

```
modified_charts/
├── chart-dsl/          # библиотека @internal/chart-dsl
│   ├── src/
│   │   ├── core/       # schema, config, theme, registry
│   │   ├── parser/     # лексер и парсер DSL
│   │   ├── resolver/   # наследование схем, переменные
│   │   ├── data-provider/  # REST, GraphQL, WebSocket, кэш, маппинг
│   │   ├── adapter/    # нормализация под Chart.js
│   │   ├── react/      # ChartRenderer, ChartProvider, useChartConfig
│   │   └── types/
│   └── __tests__/
├── src/                # демо-приложение
│   ├── components/    # ChartBuilder, ChartBuilderPanel, ChartPreview, модалки
│   ├── pages/          # DemoPage
│   ├── mocks/          # мок API
│   └── utils/          # chartBuilderUtils, dslGenerator
├── examples/           # примеры использования библиотеки
└── .github/workflows/  # CI (lint, test, build)
```

Подробнее про API и использование библиотеки — в [chart-dsl/README.md](chart-dsl/README.md).
