// Core DSL functions
export { chartSchema, namedChartSchema } from './core/schema';
export { chartConfig } from './core/config';
export { withTheme, getBuiltInTheme, createTheme } from './core/theme';
export { SchemaRegistry } from './core/registry';

// React components and hooks
export {
  ChartRenderer,
  ChartProvider,
  useChartProvider,
  useChartConfig
} from './react';

// Types
export type {
  ChartConfigDefinition,
  ChartSchemaDefinition,
  AtomicChartResponse,
  DatasetConfig,
  DatasetDescriptor,
  ChartMeta,
  RestSourceConfig,
  GraphQLSourceConfig,
  WebSocketSourceConfig,
  DataSourceConfig,
  ChartDataAdapter,
  ChartRendererProps
} from './types/index';

export { ConfigNormalizer } from './adapter/normalizer';
export { PIE_DEFAULT_SEGMENT_PALETTE, getSegmentColorsForPie } from './core/segmentPalette';

export type {
  ChartTheme,
  BuiltInTheme,
  ThemeVariables
} from './types/theme';

export type {
  NormalizedChartConfig,
  PluginConfig,
  ChartEventHandlers
} from './types/chartjs';

// Utilities (lazy export to avoid circular dependencies)
// export { RestDataProvider } from './data-provider/rest';
// export { LRUCache, TTLCache } from './data-provider/cache';
// export { JSONPathMapper } from './data-provider/mapper';
// export { Resolver } from './resolver/resolver';
// export { Validator } from './resolver/validator';
// export { ChartJSAdapter } from './adapter/chartjs';
// export { ConfigNormalizer } from './adapter/normalizer';
