import { createContext, useContext, useState, useMemo, useEffect } from 'react';
import type { ReactNode } from 'react';
import { getBuiltInTheme } from '../core/theme';
import type { ChartTheme, BuiltInTheme } from '../types/theme';

interface ChartProviderContextValue {
  theme: BuiltInTheme | ChartTheme;
  setTheme: (theme: BuiltInTheme | ChartTheme) => void;
  variables: Record<string, unknown>;
  config: {
    cacheStrategy?: 'lru' | 'fifo';
    maxCacheSize?: number;
    requestTimeout?: number;
  };
}

const ChartProviderContext = createContext<ChartProviderContextValue | undefined>(undefined);

export interface ChartProviderProps {
  children: ReactNode;
  theme?: BuiltInTheme | ChartTheme;
  cacheStrategy?: 'lru' | 'fifo';
  maxCacheSize?: number;
  requestTimeout?: number;
}

/**
 * Провайдер контекста для глобальных настроек графиков
 */
export function ChartProvider({
  children,
  theme: initialTheme = 'light',
  cacheStrategy = 'lru',
  maxCacheSize = 50,
  requestTimeout = 5000
}: ChartProviderProps) {
  const [theme, setTheme] = useState<BuiltInTheme | ChartTheme>(initialTheme);

  // Синхронизировать внутреннюю тему с пропом при переключении темы в конструкторе
  useEffect(() => {
    setTheme(initialTheme);
  }, [initialTheme]);

  const variables = useMemo(() => {
    if (typeof theme === 'string') {
      // Встроенная тема
      const themeConfig = getBuiltInTheme(theme);
      return {
        $primary: themeConfig.colors.primary,
        $secondary: themeConfig.colors.secondary,
        $background: themeConfig.colors.background,
        $text: themeConfig.colors.text,
        $success: themeConfig.colors.success,
        $error: themeConfig.colors.error,
        $warning: themeConfig.colors.warning
      };
    } else {
      // Кастомная тема
      return {
        $primary: theme.colors.primary,
        $secondary: theme.colors.secondary,
        $background: theme.colors.background,
        $text: theme.colors.text,
        $success: theme.colors.success,
        $error: theme.colors.error,
        $warning: theme.colors.warning
      };
    }
  }, [theme]);

  const value = useMemo<ChartProviderContextValue>(
    () => ({
      theme,
      setTheme,
      variables,
      config: {
        cacheStrategy,
        maxCacheSize,
        requestTimeout
      }
    }),
    [theme, variables, cacheStrategy, maxCacheSize, requestTimeout]
  );

  return (
    <ChartProviderContext.Provider value={value}>
      {children}
    </ChartProviderContext.Provider>
  );
}

/**
 * Хук для доступа к контексту ChartProvider
 */
// eslint-disable-next-line react-refresh/only-export-components -- hook is the main export alongside provider
export function useChartProvider(): ChartProviderContextValue {
  const context = useContext(ChartProviderContext);
  if (!context) {
    throw new Error('useChartProvider must be used within ChartProvider');
  }
  return context;
}
