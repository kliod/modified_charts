/**
 * Переменные темы
 */
export interface ThemeVariables {
  $primary: string;
  $secondary: string;
  $background: string;
  $text: string;
  $success?: string;
  $error?: string;
  $warning?: string;
  [key: string]: string | undefined;
}

/**
 * Полная конфигурация темы
 */
export interface ChartTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
    success?: string;
    error?: string;
    warning?: string;
    [key: string]: string | undefined;
  };
  typography?: {
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
  };
  spacing?: {
    padding?: number;
    margin?: number;
  };
}

/**
 * Встроенные темы
 */
export type BuiltInTheme = 'light' | 'dark';

/**
 * Конфигурация темы для ChartProvider
 */
export interface ThemeConfig {
  theme?: BuiltInTheme | ChartTheme;
  variables?: Partial<ThemeVariables>;
}
