import type { ChartTheme, BuiltInTheme, ThemeVariables } from '../types/theme';
import type { ChartConfigDefinition } from '../types/index';

/**
 * Встроенные темы
 */
const builtInThemes: Record<BuiltInTheme, ChartTheme> = {
  light: {
    colors: {
      primary: '#007aff',
      secondary: '#32B8C6',
      background: '#ffffff',
      text: '#000000',
      success: '#34c759',
      error: '#ff3b30',
      warning: '#ff9500'
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 14
    }
  },
  dark: {
    colors: {
      primary: '#32B8C6',
      secondary: '#E6815F',
      background: '#1F2121',
      text: '#F5F5F5',
      success: '#30d158',
      error: '#ff453a',
      warning: '#ff9f0a'
    },
    typography: {
      fontFamily: 'system-ui, -apple-system, sans-serif',
      fontSize: 14
    }
  }
};

/**
 * Применить тему к конфигурации
 */
export function withTheme(theme: BuiltInTheme | ChartTheme) {
  return (config: ChartConfigDefinition): ChartConfigDefinition => {
    const themeConfig = typeof theme === 'string' 
      ? builtInThemes[theme] 
      : theme;

    // Применить переменные темы
    const variables: ThemeVariables = {
      $primary: themeConfig.colors.primary,
      $secondary: themeConfig.colors.secondary,
      $background: themeConfig.colors.background,
      $text: themeConfig.colors.text,
      $success: themeConfig.colors.success,
      $error: themeConfig.colors.error,
      $warning: themeConfig.colors.warning
    };

    // Создать новый конфиг с темой
    return {
      ...config,
      theme: themeConfig,
      variables
    };
  };
}

/**
 * Получить встроенную тему
 */
export function getBuiltInTheme(name: BuiltInTheme): ChartTheme {
  return builtInThemes[name];
}

/**
 * Создать кастомную тему
 */
export function createTheme(theme: Partial<ChartTheme>): ChartTheme {
  const base = builtInThemes.light;
  return {
    colors: {
      ...base.colors,
      ...theme.colors
    },
    typography: {
      ...base.typography,
      ...theme.typography
    },
    spacing: {
      ...base.spacing,
      ...theme.spacing
    }
  };
}
