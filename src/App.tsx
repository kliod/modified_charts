import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ChartBuilder } from './components/ChartBuilder';
import { DemoPage } from './pages/DemoPage';
import { setupMockFetch } from './mocks/api';
import { GlobalStyles } from './globalStyles';

const THEME_STORAGE_KEY = 'chart-dsl-theme';

function readStoredTheme(): 'light' | 'dark' {
  try {
    const s = localStorage.getItem(THEME_STORAGE_KEY);
    return s === 'dark' || s === 'light' ? s : 'light';
  } catch {
    return 'light';
  }
}

function App() {
  const [theme, setThemeState] = useState<'light' | 'dark'>(readStoredTheme);

  const setTheme = useCallback((value: 'light' | 'dark') => {
    setThemeState(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const cleanup = setupMockFetch();
    return cleanup;
  }, []);

  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  return (
    <>
      <GlobalStyles />
      <Routes>
        <Route path="/" element={<DemoPage theme={theme} setTheme={setTheme} />} />
        <Route path="/builder" element={<ChartBuilder theme={theme} onThemeChange={setTheme} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default App;
