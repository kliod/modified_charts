import { useState, useMemo, useCallback, useLayoutEffect, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

import { ChartProvider } from '../../chart-dsl/src/react/index';
import { ChartBuilderPanel } from './ChartBuilderPanel';
import { ChartPreview } from './ChartPreview';
import { ChartBuilderHeader } from './ChartBuilderHeader';
import { SavedConfigsModal } from './SavedConfigsModal';
import { DSLExportModal } from './DSLExportModal';
import {
  buildChartConfig,
  defaultBuilderState,
  type BuilderState,
  loadFromLocalStorage,
  saveToLocalStorage
} from '../utils/chartBuilderUtils';
import { generateDSL, exportToJSON } from '../utils/dslGenerator';
import type { ChartConfigDefinition, AtomicChartResponse } from '../../chart-dsl/src/types/index';
import { ConfigNormalizer } from '../../chart-dsl/src/adapter/normalizer';
import styled from 'styled-components';
import { themeColors, type ThemeName } from '../constants/themeColors';

const StyledChartBuilder = styled.div<{ $theme: ThemeName }>`
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${(p) => themeColors[p.$theme].bg};
  color: ${(p) => themeColors[p.$theme].text};
  font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
`;

const StyledChartBuilderContent = styled.div`
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;

  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const PANEL_WIDTH_MIN = 280;
const PANEL_WIDTH_MAX = 600;
const PANEL_WIDTH_DEFAULT = 400;

const StyledPanelWrapper = styled.div<{ $theme: ThemeName; $width: number }>`
  width: ${(p) => p.$width}px;
  min-width: ${PANEL_WIDTH_MIN}px;
  max-width: ${PANEL_WIDTH_MAX}px;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: ${(p) => themeColors[p.$theme].cardBg};
  border-right: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  display: flex;
  flex-direction: column;
  flex-shrink: 0;

  @media (max-width: 768px) {
    width: 100%;
    max-width: 100%;
    max-height: 50vh;
    height: 50vh;
  }
`;

const ResizeHandle = styled.div<{ $theme: ThemeName }>`
  width: 6px;
  min-width: 6px;
  cursor: col-resize;
  background: ${(p) => themeColors[p.$theme].borderColor};
  flex-shrink: 0;
  &:hover {
    background: ${(p) => themeColors[p.$theme].primary};
  }
  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledPreviewWrapper = styled.div<{ $theme: ThemeName }>`
  flex: 1;
  height: 100%;
  overflow: hidden;
  padding: 1rem;
  background: ${(p) => themeColors[p.$theme].bg};
  color: ${(p) => themeColors[p.$theme].text};
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;

  @media (max-width: 768px) {
    padding: 1rem;
    height: 50vh;
  }
`;

export interface ChartBuilderProps {
  onBack?: () => void;
  /** Тема из App — единый источник правды при навигации главная ↔ конструктор */
  theme?: ThemeName;
  onThemeChange?: (theme: ThemeName) => void;
}

export function ChartBuilder({ onBack, theme: themeFromApp, onThemeChange }: ChartBuilderProps = {}) {
  const navigate = useNavigate();
  const [state, setState] = useState<BuilderState>(defaultBuilderState);
  const [resolvedData, setResolvedData] = useState<AtomicChartResponse | null>(null);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [showDSLModal, setShowDSLModal] = useState(false);
  const [dslCode, setDslCode] = useState('');
  const [panelWidth, setPanelWidth] = useState(PANEL_WIDTH_DEFAULT);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(PANEL_WIDTH_DEFAULT);

  const isThemeControlled = themeFromApp !== undefined && onThemeChange !== undefined;
  const effectiveTheme: ThemeName = isThemeControlled ? themeFromApp : state.theme;

  useLayoutEffect(() => {
    if (!isThemeControlled) {
      document.documentElement.setAttribute('data-theme', state.theme);
    }
  }, [isThemeControlled, state.theme]);

  useEffect(() => {
    if (isThemeControlled && themeFromApp !== undefined && state.theme !== themeFromApp) {
      setState(prev => ({ ...prev, theme: themeFromApp }));
    }
  }, [isThemeControlled, themeFromApp]);

  const chartConfig = useMemo(() => {
    const config = buildChartConfig(state);
    if (isThemeControlled) {
      return { ...config, theme: effectiveTheme };
    }
    return config;
  }, [state, isThemeControlled, effectiveTheme]);

  const updateState = useCallback((updates: Partial<BuilderState>) => {
    if (isThemeControlled && updates.theme !== undefined) {
      onThemeChange!(updates.theme);
    }
    setState(prev => {
      const isSourceOrMapChange = updates.source != null || updates.map != null;
      const next = { ...prev, ...updates };
      if (isSourceOrMapChange) {
        next.datasetOverrides = {};
      }
      return next;
    });
  }, [isThemeControlled, onThemeChange]);

  // Сброс к значениям по умолчанию
  const handleReset = useCallback(() => {
    setState(defaultBuilderState);
  }, []);

  // Сохранение конфигурации
  const handleSave = useCallback((name: string) => {
    try {
      saveToLocalStorage(name, chartConfig);
      alert(`Конфигурация "${name}" сохранена`);
    } catch (error) {
      alert(`Ошибка сохранения: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
  }, [chartConfig]);

  // Загрузка конфигурации
  const handleThemeChange = useCallback((newTheme: ThemeName) => {
    if (isThemeControlled) {
      onThemeChange!(newTheme);
      setState(prev => ({ ...prev, theme: newTheme }));
    } else {
      setState(prev => ({ ...prev, theme: newTheme }));
    }
  }, [isThemeControlled, onThemeChange]);

  const handleDataUpdate = useCallback((data: AtomicChartResponse) => {
    setResolvedData(data);
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    resizeStartX.current = e.clientX;
    resizeStartWidth.current = panelWidth;
    const onMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - resizeStartX.current;
      const next = Math.min(PANEL_WIDTH_MAX, Math.max(PANEL_WIDTH_MIN, resizeStartWidth.current + dx));
      setPanelWidth(next);
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }, [panelWidth]);

  const handleLoad = useCallback((name: string) => {
    const loaded = loadFromLocalStorage(name);
    if (loaded) {
      // Восстановить состояние из конфигурации
      const options = loaded.overrides?.options || {};
      const plugins = options.plugins || {};
      
      const loadedBuilder = (loaded as ChartConfigDefinition & { _builderState?: BuilderState })._builderState;
      const loadedTheme = (loaded.theme as 'light' | 'dark') || undefined;
      setState(prev => ({
        ...prev,
        type: loaded.schema.type || prev.type,
        source: typeof loaded.schema.source === 'object' 
          ? loaded.schema.source 
          : loaded.schema.source 
            ? { url: loaded.schema.source as string, method: 'GET' as const }
            : null,
        map: loaded.schema.map || prev.map,
        theme: loadedTheme ?? prev.theme,
        color: loaded.overrides?.color || prev.color,
        title: plugins.title?.text || prev.title,
        titleDisplay: plugins.title?.display ?? prev.titleDisplay,
        legendDisplay: plugins.legend?.display ?? prev.legendDisplay,
        legendPosition: plugins.legend?.position || prev.legendPosition,
        responsive: options.responsive ?? prev.responsive,
        maintainAspectRatio: options.maintainAspectRatio ?? prev.maintainAspectRatio,
        datasetOverrides: loadedBuilder?.datasetOverrides ?? prev.datasetOverrides,
        options: {
          ...prev.options,
          scales: options.scales || prev.options.scales
        }
      }));
      setShowSavedModal(false);
      if (loadedTheme !== undefined && isThemeControlled) {
        onThemeChange!(loadedTheme);
      }
    }
  }, [isThemeControlled, onThemeChange]);

  // Экспорт DSL
  const handleExportDSL = useCallback(() => {
    const dsl = generateDSL(chartConfig);
    setDslCode(dsl);
    setShowDSLModal(true);
  }, [chartConfig]);

  // Экспорт JSON
  const handleExportJSON = useCallback(() => {
    const json = exportToJSON(chartConfig);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chart-config-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [chartConfig]);

  return (
    <ChartProvider theme={effectiveTheme}>
      <StyledChartBuilder $theme={effectiveTheme} data-theme={effectiveTheme}>
        <ChartBuilderHeader
          theme={effectiveTheme}
          onThemeChange={handleThemeChange}
          onSave={() => {
            const name = prompt('Введите имя конфигурации:');
            if (name) handleSave(name);
          }}
          onLoad={() => setShowSavedModal(true)}
          onExportDSL={handleExportDSL}
          onExportJSON={handleExportJSON}
          onReset={handleReset}
          onBack={onBack ?? (() => navigate('/'))}
        />

        <StyledChartBuilderContent>
          <StyledPanelWrapper $theme={effectiveTheme} $width={panelWidth}>
            <ChartBuilderPanel
              state={state}
              onUpdate={updateState}
              theme={effectiveTheme}
              datasets={ConfigNormalizer.getDatasetDescriptors(
                resolvedData?.datasets ?? [],
                state.type
              )}
              resolvedData={resolvedData}
            />
          </StyledPanelWrapper>
          <ResizeHandle $theme={effectiveTheme} onMouseDown={handleResizeStart} aria-label="Изменить ширину панели" />

          <StyledPreviewWrapper $theme={effectiveTheme}>
            <ChartPreview
              config={chartConfig}
              theme={effectiveTheme}
              onDataUpdate={handleDataUpdate}
            />
          </StyledPreviewWrapper>
        </StyledChartBuilderContent>

        {showSavedModal && (
          <SavedConfigsModal
            onClose={() => setShowSavedModal(false)}
            onLoad={handleLoad}
          />
        )}

        {showDSLModal && (
          <DSLExportModal
            code={dslCode}
            onClose={() => setShowDSLModal(false)}
          />
        )}
      </StyledChartBuilder>
    </ChartProvider>
  );
}
