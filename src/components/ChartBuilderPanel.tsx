import { useCallback, useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import type { BuilderState, DatasetStyleOverride } from '../utils/chartBuilderUtils';
import { normalizeMapPath } from '../utils/chartBuilderUtils';
import type { ChartType } from 'chart.js';
import type { DatasetDescriptor, AtomicChartResponse, RestSourceConfig, GraphQLSourceConfig, WebSocketSourceConfig } from '../../chart-dsl/src/types/index';
import { getSegmentColorsForPie } from '../../chart-dsl/src/core/segmentPalette';
import { themeColors, type ThemeName } from '../constants/themeColors';
import { ResponseStructureTree } from './ResponseStructureTree';

const MAX_DATASETS_IN_DROPDOWN = 10;
const COLOR_PICKER_DEBOUNCE_MS = 120;

/** URL и запрос для предзаполнения GraphQL (совместимо с src/mocks/api.ts) */
const GRAPHQL_MOCK_URL = '/api/graphql';
const GRAPHQL_MOCK_QUERY = 'query ChartData { chartData { labels datasets } }';

/** Debounce для color picker — уменьшает нагрузку при перетаскивании ползунка */
function useDebouncedCallback<T extends readonly unknown[]>(fn: (...args: T) => void, delay: number): (...args: T) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);
  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);
  return useCallback(
    (...args: T) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
        timeoutRef.current = null;
      }, delay);
    },
    [delay]
  );
}

/** Стабильный ключ датасета: id ?? label ?? index */
function getDatasetKey(ds: DatasetDescriptor): string {
  return ds.id ?? ds.label ?? String(ds.index);
}

const StyledPanel = styled.div`
  padding: 1.5rem;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
`;

const StyledPanelH2 = styled.h2<{ $theme: ThemeName }>`
  margin: 0 0 1.5rem 0;
  font-size: 1.5rem;
  color: ${(p) => themeColors[p.$theme].text};
`;

const StyledSection = styled.div<{ $theme: ThemeName }>`
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid ${(p) => themeColors[p.$theme].borderColor};

  &:last-child {
    border-bottom: none;
  }
`;

const StyledSectionTitle = styled.h3<{ $theme: ThemeName }>`
  margin: 0 0 1rem 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: ${(p) => themeColors[p.$theme].text};
`;

const StyledLabel = styled.label<{ $theme: ThemeName }>`
  display: block;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  font-weight: 500;
  color: ${(p) => themeColors[p.$theme].textSecondary};
`;

const StyledInput = styled.input<{ $theme: ThemeName }>`
  width: 100%;
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: ${(p) => themeColors[p.$theme].primary};
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
  }
`;

const StyledSelect = styled.select<{ $theme: ThemeName }>`
  width: 100%;
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  margin-bottom: 1rem;

  &:focus {
    outline: none;
    border-color: ${(p) => themeColors[p.$theme].primary};
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
  }
`;

const StyledTextarea = styled.textarea<{ $theme: ThemeName }>`
  width: 100%;
  min-height: 100px;
  padding: 0.5rem;
  font-size: 0.85rem;
  font-family: inherit;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  margin-bottom: 1rem;
  resize: vertical;

  &:focus {
    outline: none;
    border-color: ${(p) => themeColors[p.$theme].primary};
    box-shadow: 0 0 0 2px rgba(0, 122, 255, 0.1);
  }
`;

const StyledColorGroup = styled.div`
  margin-bottom: 1.5rem;

  ${StyledLabel} {
    margin-top: 0.75rem;
  }
  ${StyledLabel}:first-child {
    margin-top: 0;
  }
`;

const StyledColorInput = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const StyledColorPicker = styled.input<{ $theme: ThemeName }>`
  width: 60px;
  height: 40px;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  cursor: pointer;
  background: ${(p) => themeColors[p.$theme].cardBg};
`;

const StyledColorText = styled(StyledInput)`
  flex: 1;
  margin-bottom: 0;
`;

const StyledSlider = styled.input<{ $theme: ThemeName }>`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${(p) => themeColors[p.$theme].borderColor};
  outline: none;
  margin-bottom: 1rem;
  -webkit-appearance: none;
  appearance: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(p) => themeColors[p.$theme].primary};
    cursor: pointer;
    border: 2px solid ${(p) => themeColors[p.$theme].cardBg};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  &::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: ${(p) => themeColors[p.$theme].primary};
    cursor: pointer;
    border: 2px solid ${(p) => themeColors[p.$theme].cardBg};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
`;

const StyledToggle = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const StyledToggleBtn = styled.button<{ $theme: ThemeName; $active?: boolean }>`
  flex: 1;
  padding: 0.5rem;
  font-size: 0.9rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(p) => themeColors[p.$theme].bg};
  }

  ${(p) =>
    p.$active &&
    `
    background: ${themeColors[p.$theme].primary};
    color: white;
    border-color: ${themeColors[p.$theme].primary};
  `}
`;

const StyledCheckboxLabel = styled.label<{ $theme: ThemeName }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  margin-bottom: 1rem;
  color: ${(p) => themeColors[p.$theme].text};
`;

const StyledCheckbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
`;

const StyledNumberInput = styled(StyledInput)`
  width: 100%;
  margin-bottom: 1rem;
`;

const StyledDatasetOverrides = styled.div<{ $theme: ThemeName }>`
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid ${(p) => themeColors[p.$theme].borderColor};
`;

const StyledSegmentColorsGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
`;

const StyledMockPrefillBtn = styled.button<{ $theme: ThemeName }>`
  margin-bottom: 0.75rem;
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].textSecondary};
  cursor: pointer;
  &:hover {
    background: ${(p) => themeColors[p.$theme].bg};
    color: ${(p) => themeColors[p.$theme].text};
  }
`;

const StyledDatasetReset = styled.div<{ $theme: ThemeName }>`
  margin-top: 1rem;

  button {
    padding: 0.4rem 0.75rem;
    font-size: 0.85rem;
    border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
    border-radius: 4px;
    background: ${(p) => themeColors[p.$theme].cardBg};
    color: ${(p) => themeColors[p.$theme].textSecondary};
    cursor: pointer;
  }

  button:hover {
    background: ${(p) => themeColors[p.$theme].bg};
    color: ${(p) => themeColors[p.$theme].text};
  }
`;

interface ChartBuilderPanelProps {
  state: BuilderState;
  onUpdate: (updates: Partial<BuilderState>) => void;
  theme: ThemeName;
  datasets?: DatasetDescriptor[];
  resolvedData?: AtomicChartResponse | null;
}

export function ChartBuilderPanel({ state, onUpdate, theme, datasets = [], resolvedData }: ChartBuilderPanelProps) {
  const [selectedDatasetKey, setSelectedDatasetKey] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<unknown>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [selectedStructurePath, setSelectedStructurePath] = useState<string | null>(null);
  const [variablesText, setVariablesText] = useState('');

  const sourceType: 'rest' | 'graphql' | 'websocket' =
    state.source?.type === 'graphql' ? 'graphql' : state.source?.type === 'websocket' ? 'websocket' : 'rest';
  const graphqlVariables = sourceType === 'graphql' ? (state.source as GraphQLSourceConfig)?.variables : undefined;
  useEffect(() => {
    if (sourceType !== 'graphql') return;
    if (graphqlVariables != null) {
      try {
        setVariablesText(JSON.stringify(graphqlVariables, null, 2));
      } catch {
        setVariablesText('');
      }
    } else {
      setVariablesText('');
    }
  }, [sourceType, graphqlVariables]);

  const handleChange = useCallback((field: keyof BuilderState, value: unknown) => {
    onUpdate({ [field]: value });
  }, [onUpdate]);

  // Debounce для color picker — при перетаскивании ползунка сотни onChange/сек
  const handleColorChangeDebounced = useDebouncedCallback(
    (field: 'color' | 'backgroundColor' | 'borderColor', value: string) => {
      onUpdate({ [field]: value });
    },
    COLOR_PICKER_DEBOUNCE_MS
  );

  /** Предзаполнение полей GraphQL из мока (совместимо с src/mocks/api.ts) */
  const handleGraphQLMockPrefill = useCallback(() => {
    onUpdate({
      source: {
        type: 'graphql',
        url: GRAPHQL_MOCK_URL,
        query: GRAPHQL_MOCK_QUERY,
        variables: undefined
      },
      map: {
        labels: '$.data.chartData.labels',
        datasets: '$.data.chartData.datasets'
      }
    });
    setVariablesText('');
  }, [onUpdate]);

  const handleSourceChange = useCallback((field: 'url' | 'method' | 'query' | 'variables' | 'sourceType' | 'refreshIntervalMs', value: string | Record<string, unknown> | number | undefined) => {
    if (field === 'sourceType') {
      const type = value as 'rest' | 'graphql' | 'websocket';
      const prev = state.source;
      const prevUrl = prev && 'url' in prev ? prev.url : '';
      if (type === 'graphql') {
        onUpdate({
          source: {
            type: 'graphql',
            url: prevUrl || '',
            query: (prev && 'query' in prev ? (prev as GraphQLSourceConfig).query : '') || '',
            variables: (prev && 'query' in prev ? (prev as GraphQLSourceConfig).variables : undefined)
          },
          map: {
            labels: '$.data.chartData.labels',
            datasets: '$.data.chartData.datasets'
          }
        });
      } else if (type === 'websocket') {
        onUpdate({
          source: {
            type: 'websocket',
            url: prevUrl || '/api/charts/ws-sim',
            refreshIntervalMs: 2000
          },
          map: {
            labels: '$.labels',
            datasets: '$.datasets'
          }
        });
      } else {
        onUpdate({
          source: {
            type: 'rest',
            url: prevUrl || '',
            method: (prev && 'method' in prev ? (prev as RestSourceConfig).method : undefined) || 'GET'
          },
          map: {
            labels: '$.labels',
            datasets: '$.datasets'
          }
        });
      }
      return;
    }
    const current = state.source;
    if (sourceType === 'graphql') {
      const g = (current && current.type === 'graphql' ? current : { type: 'graphql' as const, url: '', query: '', variables: undefined }) as GraphQLSourceConfig;
      if (field === 'variables') {
        let parsed: Record<string, unknown> | undefined;
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          parsed = value as Record<string, unknown>;
        } else {
          try {
            parsed = typeof value === 'string' && value.trim() ? JSON.parse(value) : undefined;
          } catch {
            parsed = undefined;
          }
        }
        onUpdate({ source: { ...g, variables: parsed } });
      } else {
        onUpdate({ source: { ...g, [field]: value } });
      }
    } else if (sourceType === 'websocket') {
      const w = (current && current.type === 'websocket' ? current : { type: 'websocket' as const, url: '/api/charts/ws-sim', refreshIntervalMs: 2000 }) as WebSocketSourceConfig;
      onUpdate({ source: { ...w, [field]: value } });
    } else {
      const r = (current && current.type !== 'graphql' && current?.type !== 'websocket' ? current : { type: 'rest' as const, url: '', method: 'GET' as const }) as RestSourceConfig;
      onUpdate({ source: { ...r, [field]: value } });
    }
  }, [state.source, sourceType, onUpdate]);

  const handleMapChange = useCallback((key: string, value: string) => {
    onUpdate({
      map: {
        ...state.map,
        [key]: normalizeMapPath(value)
      }
    });
  }, [state.map, onUpdate]);

  const handleShowStructure = useCallback(async () => {
    const src = state.source;
    const url = src && 'url' in src ? src.url?.trim() : '';
    if (!url) {
      setStructureError('Сначала укажите URL источника');
      setRawResponse(null);
      return;
    }
    setStructureError(null);
    setStructureLoading(true);
    setRawResponse(null);
    try {
      if (src?.type === 'websocket') {
        setRawResponse({
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          datasets: [
            { id: 'ws-1', label: 'Stream A', data: [40, 55, 60, 72, 65, 80] },
            { id: 'ws-2', label: 'Stream B', data: [30, 45, 55, 58, 62, 70] }
          ]
        });
      } else if (src?.type === 'graphql') {
        const g = src as GraphQLSourceConfig;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: g.query || '', variables: g.variables })
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const ct = res.headers.get('content-type');
        if (ct && !ct.includes('application/json')) throw new Error('Ответ не JSON');
        const data = await res.json();
        setRawResponse(data.data ?? data);
      } else {
        const method = (src as RestSourceConfig)?.method || 'GET';
        const res = await fetch(url, { method });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const ct = res.headers.get('content-type');
        if (ct && !ct.includes('application/json')) throw new Error('Ответ не JSON');
        const data = await res.json();
        setRawResponse(data);
      }
    } catch (err) {
      setStructureError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setStructureLoading(false);
    }
  }, [state.source]);

  const applySelectedPathTo = useCallback(
    (field: 'labels' | 'datasets') => {
      if (selectedStructurePath != null) {
        handleMapChange(field, selectedStructurePath);
        setSelectedStructurePath(null);
      }
    },
    [selectedStructurePath, handleMapChange]
  );

  const handleOptionChange = useCallback((path: string, value: unknown) => {
    const newOptions = { ...state.options } as Record<string, unknown>;
    const keys = path.split('.');
    let current: Record<string, unknown> = newOptions;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]] as Record<string, unknown>;
    }
    
    current[keys[keys.length - 1]] = value;
    onUpdate({ options: newOptions });
  }, [state.options, onUpdate]);

  const datasetOverrides = state.datasetOverrides || {};
  const datasetOverridesRef = useRef(datasetOverrides);
  datasetOverridesRef.current = datasetOverrides;
  const handleDatasetOverrideChange = useCallback((key: string, field: keyof DatasetStyleOverride, value: string | number | string[] | undefined) => {
    const next = { ...datasetOverridesRef.current };
    const current = next[key] || {};
    if (value === undefined || value === '') {
      const { [field]: _, ...rest } = current;
      if (Object.keys(rest).length === 0) {
        delete next[key];
      } else {
        next[key] = rest as DatasetStyleOverride;
      }
    } else {
      next[key] = { ...current, [field]: value };
    }
    onUpdate({ datasetOverrides: next });
  }, [onUpdate]);
  const handleDatasetColorChangeDebounced = useDebouncedCallback(
    (pickerKey: string, field: 'backgroundColor' | 'borderColor', value: string | string[]) => {
      handleDatasetOverrideChange(pickerKey, field, value);
    },
    COLOR_PICKER_DEBOUNCE_MS
  );
  // Debounce для всех изменений палитры датасета (сегменты, текст hex)
  const handleDatasetOverrideChangeDebounced = useDebouncedCallback(
    (key: string, field: keyof DatasetStyleOverride, value: string | number | string[] | undefined) => {
      handleDatasetOverrideChange(key, field, value);
    },
    COLOR_PICKER_DEBOUNCE_MS
  );

  const selectedDescriptor = datasets.find((d) => getDatasetKey(d) === selectedDatasetKey);
  const selectedOverride = selectedDatasetKey !== null ? datasetOverrides[selectedDatasetKey] : null;

  return (
    <StyledPanel>
      <StyledPanelH2 $theme={theme}>Настройки графика</StyledPanelH2>

      {/* Тип графика */}
      <StyledSection $theme={theme}>
        <StyledLabel $theme={theme}>Тип графика</StyledLabel>
        <StyledSelect
          $theme={theme}
          value={state.type}
          onChange={(e) => handleChange('type', e.target.value as ChartType)}
        >
          <option value="bar">Bar (Столбчатая)</option>
          <option value="line">Line (Линейная)</option>
          <option value="pie">Pie (Круговая)</option>
          <option value="doughnut">Doughnut (Кольцевая)</option>
          <option value="radar">Radar (Радарная)</option>
          <option value="scatter">Scatter (Точечная)</option>
          <option value="bubble">Bubble (Пузырьковая)</option>
        </StyledSelect>
      </StyledSection>

      {/* Источник данных */}
      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Источник данных</StyledSectionTitle>
        <StyledLabel $theme={theme}>Тип источника</StyledLabel>
        <StyledSelect
          $theme={theme}
          value={sourceType}
          onChange={(e) => handleSourceChange('sourceType', e.target.value as 'rest' | 'graphql' | 'websocket')}
        >
          <option value="rest">REST</option>
          <option value="graphql">GraphQL</option>
          <option value="websocket">WebSocket (симуляция)</option>
        </StyledSelect>
        <StyledLabel $theme={theme}>
          {sourceType === 'graphql' ? 'Endpoint URL' : sourceType === 'websocket' ? 'URL (симуляция)' : 'REST URL'}
        </StyledLabel>
        <StyledInput
          $theme={theme}
          type="text"
          value={state.source && 'url' in state.source ? state.source.url || '' : ''}
          onChange={(e) => handleSourceChange('url', e.target.value)}
          placeholder={sourceType === 'graphql' ? 'https://api.example.com/graphql' : sourceType === 'websocket' ? '/api/charts/ws-sim' : '/api/charts/sales-atomic'}
        />
        {sourceType === 'websocket' && (
          <StyledLabel $theme={theme} style={{ fontSize: '0.85rem', color: themeColors[theme].textSecondary, marginTop: '-0.25rem' }}>
            Данные обновляются каждые 2 с (симуляция потока)
          </StyledLabel>
        )}
        {sourceType === 'rest' && (
          <>
            <StyledLabel $theme={theme}>Метод</StyledLabel>
            <StyledSelect
              $theme={theme}
              value={(state.source as RestSourceConfig)?.method || 'GET'}
              onChange={(e) => handleSourceChange('method', e.target.value)}
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
            </StyledSelect>
          </>
        )}
        {sourceType === 'graphql' && (
          <>
            <StyledMockPrefillBtn
              $theme={theme}
              type="button"
              onClick={handleGraphQLMockPrefill}
              title="Подставить URL, запрос и маппинг под мок (sales)"
            >
              Предзаполнить из мока
            </StyledMockPrefillBtn>
            <StyledLabel $theme={theme}>Запрос (query)</StyledLabel>
            <StyledTextarea
              $theme={theme}
              value={(state.source as GraphQLSourceConfig)?.query || ''}
              onChange={(e) => handleSourceChange('query', e.target.value)}
              placeholder={'query { chartData { labels datasets } }'}
            />
            <StyledLabel $theme={theme}>Переменные (JSON, опционально)</StyledLabel>
            <StyledTextarea
              $theme={theme}
              value={variablesText}
              onChange={(e) => setVariablesText(e.target.value)}
              onBlur={() => {
                const raw = variablesText.trim();
                if (!raw) {
                  handleSourceChange('variables', undefined);
                  return;
                }
                try {
                  handleSourceChange('variables', JSON.parse(raw));
                } catch {
                  handleSourceChange('variables', undefined);
                }
              }}
              placeholder='{ "id": "1" }'
            />
          </>
        )}
      </StyledSection>

      {/* Маппинг */}
      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Пути к данным в ответе API</StyledSectionTitle>
        <StyledLabel $theme={theme}>Подписи (labels)</StyledLabel>
        <StyledInput
          $theme={theme}
          type="text"
          value={state.map.labels || ''}
          onChange={(e) => handleMapChange('labels', e.target.value)}
          placeholder="labels или data.months"
        />
        <StyledLabel $theme={theme}>Серии (datasets)</StyledLabel>
        <StyledInput
          $theme={theme}
          type="text"
          value={state.map.datasets || ''}
          onChange={(e) => handleMapChange('datasets', e.target.value)}
          placeholder="datasets или data.charts"
        />
        <StyledLabel $theme={theme} style={{ marginTop: '1rem' }}>
          Обзор структуры ответа
        </StyledLabel>
        <StyledToggle>
          <StyledToggleBtn
            $theme={theme}
            type="button"
            onClick={handleShowStructure}
            disabled={structureLoading}
          >
            {structureLoading ? 'Загрузка…' : 'Показать структуру ответа'}
          </StyledToggleBtn>
        </StyledToggle>
        {structureError && (
          <div style={{ fontSize: '0.85rem', color: '#ff3b30', marginBottom: '0.5rem' }}>{structureError}</div>
        )}
        {rawResponse != null && !structureLoading && (
          <>
            {selectedStructurePath != null && (
              <div style={{ marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                <span style={{ color: themeColors[theme].textSecondary }}>Выбран путь: </span>
                <code style={{ background: themeColors[theme].borderColor, padding: '0 4px', borderRadius: 4 }}>
                  {selectedStructurePath}
                </code>
                <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.5rem' }}>
                  <StyledToggleBtn
                    $theme={theme}
                    type="button"
                    $active={false}
                    onClick={() => applySelectedPathTo('labels')}
                  >
                    Подставить в Подписи
                  </StyledToggleBtn>
                  <StyledToggleBtn
                    $theme={theme}
                    type="button"
                    $active={false}
                    onClick={() => applySelectedPathTo('datasets')}
                  >
                    Подставить в Серии
                  </StyledToggleBtn>
                </div>
              </div>
            )}
            <ResponseStructureTree
              data={rawResponse}
              theme={theme}
              onSelectPath={setSelectedStructurePath}
            />
          </>
        )}
      </StyledSection>

      {/* Внешний вид — значения по умолчанию для всех серий; для одной серии — «Стили датасетов» */}
      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Внешний вид</StyledSectionTitle>
        <StyledLabel $theme={theme} style={{ fontWeight: 400, fontSize: '0.85rem', marginBottom: '1rem' }}>
          Значения по умолчанию для всех серий. У круговых первый сегмент — из полей ниже, остальные — в «Стили датасетов» → «Цвета по сегментам».
        </StyledLabel>
        <StyledColorGroup>
          <StyledLabel $theme={theme}>Основной цвет</StyledLabel>
          <StyledColorInput>
            <StyledColorPicker
              $theme={theme}
              type="color"
              value={state.color}
              onChange={(e) => handleColorChangeDebounced('color', e.target.value)}
            />
            <StyledColorText
              $theme={theme}
              type="text"
              value={state.color}
              onChange={(e) => handleChange('color', e.target.value)}
              placeholder="#007aff"
            />
          </StyledColorInput>
          <StyledLabel $theme={theme}>Цвет фона элементов</StyledLabel>
          <StyledColorInput>
            <StyledColorPicker
              $theme={theme}
              type="color"
              value={state.backgroundColor || state.color}
              onChange={(e) => handleColorChangeDebounced('backgroundColor', e.target.value)}
            />
            <StyledColorText
              $theme={theme}
              type="text"
              value={state.backgroundColor || state.color}
              onChange={(e) => handleChange('backgroundColor', e.target.value)}
              placeholder={state.color}
            />
          </StyledColorInput>
          <StyledLabel $theme={theme}>Цвет границ</StyledLabel>
          <StyledColorInput>
            <StyledColorPicker
              $theme={theme}
              type="color"
              value={state.borderColor || state.color}
              onChange={(e) => handleColorChangeDebounced('borderColor', e.target.value)}
            />
            <StyledColorText
              $theme={theme}
              type="text"
              value={state.borderColor || state.color}
              onChange={(e) => handleChange('borderColor', e.target.value)}
              placeholder={state.color}
            />
          </StyledColorInput>
        </StyledColorGroup>
        
        <StyledLabel $theme={theme}>
          Прозрачность: {Math.round((state.opacity ?? 1) * 100)}%
        </StyledLabel>
        <StyledSlider
          $theme={theme}
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={state.opacity ?? 1}
          onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
        />
        
        <StyledLabel $theme={theme}>Толщина границ</StyledLabel>
        <StyledNumberInput
          $theme={theme}
          type="number"
          min="0"
          max="10"
          step="0.5"
          value={state.borderWidth ?? 1}
          onChange={(e) => handleChange('borderWidth', parseFloat(e.target.value) || 0)}
        />
        
        {state.type === 'bar' && (
          <>
            <StyledLabel $theme={theme}>Скругление углов</StyledLabel>
            <StyledNumberInput
              $theme={theme}
              type="number"
              min="0"
              max="20"
              step="1"
              value={state.borderRadius ?? 0}
              onChange={(e) => handleChange('borderRadius', parseInt(e.target.value) || 0)}
            />
          </>
        )}
        
        {(state.type === 'line' || state.type === 'scatter' || state.type === 'bubble') && (
          <>
            <StyledLabel $theme={theme}>Радиус точек</StyledLabel>
            <StyledNumberInput
              $theme={theme}
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={state.pointRadius ?? 3}
              onChange={(e) => handleChange('pointRadius', parseFloat(e.target.value) || 0)}
            />
            <StyledLabel $theme={theme}>Радиус точек при наведении</StyledLabel>
            <StyledNumberInput
              $theme={theme}
              type="number"
              min="0"
              max="20"
              step="0.5"
              value={state.pointHoverRadius ?? 5}
              onChange={(e) => handleChange('pointHoverRadius', parseFloat(e.target.value) || 0)}
            />
          </>
        )}
        
        {state.type === 'line' && (
          <>
            <StyledLabel $theme={theme}>
              Сглаживание линии: {Math.round((state.tension ?? 0.4) * 100)}%
            </StyledLabel>
            <StyledSlider
              $theme={theme}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.tension ?? 0.4}
              onChange={(e) => handleChange('tension', parseFloat(e.target.value))}
            />
          </>
        )}
        
        <StyledLabel $theme={theme}>Тема</StyledLabel>
        <StyledToggle>
          <StyledToggleBtn
            $theme={theme}
            type="button"
            $active={state.theme === 'light'}
            onClick={() => handleChange('theme', 'light')}
          >
            ☀️ Light
          </StyledToggleBtn>
          <StyledToggleBtn
            $theme={theme}
            type="button"
            $active={state.theme === 'dark'}
            onClick={() => handleChange('theme', 'dark')}
          >
            🌙 Dark
          </StyledToggleBtn>
        </StyledToggle>
      </StyledSection>

      {/* Стили датасетов */}
      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Стили датасетов</StyledSectionTitle>
        <StyledLabel $theme={theme}>Настройка датасета</StyledLabel>
        <StyledSelect
          $theme={theme}
          value={selectedDatasetKey ?? ''}
          onChange={(e) => setSelectedDatasetKey(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">Все датасеты (по умолчанию)</option>
          {datasets.length > 0 ? (
            datasets.slice(0, MAX_DATASETS_IN_DROPDOWN).map((ds) => {
              const key = getDatasetKey(ds);
              const displayLabel = ds.label || `Датасет без названия (${ds.index + 1})`;
              return (
                <option key={key} value={key}>
                  {displayLabel}
                  {ds.dataPreview ? ` — ${ds.dataPreview}` : ''}
                </option>
              );
            })
          ) : (
            <>
              <option value="" disabled>Датасеты (загрузка...)</option>
              {Array.from({ length: MAX_DATASETS_IN_DROPDOWN }, (_, i) => (
                <option key={i} value={String(i)}>
                  Датасет {i + 1}
                </option>
              ))}
            </>
          )}
        </StyledSelect>

        {selectedDatasetKey !== null && (
          <StyledDatasetOverrides $theme={theme}>
            <StyledLabel $theme={theme}>Подпись в легенде</StyledLabel>
            <StyledInput
              $theme={theme}
              type="text"
              value={selectedOverride?.label ?? selectedDescriptor?.label ?? ''}
              onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'label', e.target.value || undefined)}
              placeholder="Название датасета"
            />
            <StyledColorGroup>
              <StyledLabel $theme={theme}>Цвет заливки</StyledLabel>
              <StyledColorInput>
                <StyledColorPicker
                  $theme={theme}
                  type="color"
                  value={Array.isArray(selectedOverride?.backgroundColor) ? selectedOverride.backgroundColor[0] : (selectedOverride?.backgroundColor || state.color)}
                  onChange={(e) => handleDatasetColorChangeDebounced(selectedDatasetKey, 'backgroundColor', e.target.value)}
                />
                <StyledColorText
                  $theme={theme}
                  type="text"
                  value={Array.isArray(selectedOverride?.backgroundColor) ? selectedOverride.backgroundColor[0] : (selectedOverride?.backgroundColor ?? '')}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'backgroundColor', e.target.value || undefined)}
                  placeholder={state.color}
                />
              </StyledColorInput>
              {(state.type === 'pie' || state.type === 'doughnut') && selectedDescriptor && (selectedDescriptor.dataLength ?? 0) > 0 && (() => {
                const N = selectedDescriptor.dataLength ?? 0;
                const existingArray = Array.isArray(selectedOverride?.backgroundColor)
                  ? selectedOverride.backgroundColor
                  : (resolvedData?.datasets?.[selectedDescriptor?.index ?? -1] as { backgroundColor?: string[] } | undefined)?.backgroundColor;
                const segmentColors: string[] =
                  existingArray && existingArray.length >= N
                    ? existingArray.slice(0, N)
                    : getSegmentColorsForPie(N);
                return (
                <>
                  <StyledLabel $theme={theme}>Цвета по сегментам</StyledLabel>
                  <StyledSegmentColorsGrid>
                    {segmentColors.map((color, i) => (
                      <StyledColorInput key={i}>
                        <StyledColorPicker
                          $theme={theme}
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const arr = segmentColors.slice();
                            arr[i] = e.target.value;
                            handleDatasetOverrideChangeDebounced(selectedDatasetKey, 'backgroundColor', arr);
                          }}
                        />
                      </StyledColorInput>
                    ))}
                  </StyledSegmentColorsGrid>
                </>
                );
              })()}
              <StyledLabel $theme={theme}>Цвет границы</StyledLabel>
              <StyledColorInput>
                <StyledColorPicker
                  $theme={theme}
                  type="color"
                  value={Array.isArray(selectedOverride?.borderColor) ? selectedOverride.borderColor[0] : (selectedOverride?.borderColor || state.borderColor || state.color)}
                  onChange={(e) => handleDatasetColorChangeDebounced(selectedDatasetKey, 'borderColor', e.target.value)}
                />
                <StyledColorText
                  $theme={theme}
                  type="text"
                  value={Array.isArray(selectedOverride?.borderColor) ? selectedOverride.borderColor[0] : (selectedOverride?.borderColor ?? '')}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'borderColor', e.target.value || undefined)}
                  placeholder={state.borderColor || state.color}
                />
              </StyledColorInput>
            </StyledColorGroup>
            <StyledLabel $theme={theme}>Прозрачность: {Math.round((selectedOverride?.opacity ?? state.opacity ?? 1) * 100)}%</StyledLabel>
            <StyledSlider
              $theme={theme}
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={selectedOverride?.opacity ?? state.opacity ?? 1}
              onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'opacity', parseFloat(e.target.value))}
            />
            <StyledLabel $theme={theme}>Толщина границ</StyledLabel>
            <StyledNumberInput
              $theme={theme}
              type="number"
              min="0"
              max="10"
              step="0.5"
              value={selectedOverride?.borderWidth ?? state.borderWidth ?? 1}
              onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'borderWidth', e.target.value === '' ? undefined : parseFloat(e.target.value))}
            />
            {state.type === 'bar' && (
              <>
                <StyledLabel $theme={theme}>Скругление углов</StyledLabel>
                <StyledNumberInput
                  $theme={theme}
                  type="number"
                  min="0"
                  max="20"
                  step="1"
                  value={selectedOverride?.borderRadius ?? state.borderRadius ?? 0}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'borderRadius', e.target.value === '' ? undefined : parseInt(e.target.value, 10))}
                />
              </>
            )}
            {(state.type === 'line' || state.type === 'scatter' || state.type === 'bubble') && (
              <>
                <StyledLabel $theme={theme}>Радиус точек</StyledLabel>
                <StyledNumberInput
                  $theme={theme}
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={selectedOverride?.pointRadius ?? state.pointRadius ?? 3}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'pointRadius', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
                <StyledLabel $theme={theme}>Радиус при наведении</StyledLabel>
                <StyledNumberInput
                  $theme={theme}
                  type="number"
                  min="0"
                  max="20"
                  step="0.5"
                  value={selectedOverride?.pointHoverRadius ?? state.pointHoverRadius ?? 5}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'pointHoverRadius', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                />
              </>
            )}
            {state.type === 'line' && (
              <>
                <StyledLabel $theme={theme}>Сглаживание линии: {Math.round((selectedOverride?.tension ?? state.tension ?? 0.4) * 100)}%</StyledLabel>
                <StyledSlider
                  $theme={theme}
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={selectedOverride?.tension ?? state.tension ?? 0.4}
                  onChange={(e) => handleDatasetOverrideChange(selectedDatasetKey, 'tension', parseFloat(e.target.value))}
                />
              </>
            )}
            <StyledDatasetReset $theme={theme}>
              <button
                type="button"
                onClick={() => {
                  const next = { ...datasetOverrides };
                  delete next[selectedDatasetKey];
                  onUpdate({ datasetOverrides: next });
                }}
              >
                Сбросить стили этого датасета
              </button>
            </StyledDatasetReset>
          </StyledDatasetOverrides>
        )}
      </StyledSection>

      {/* Заголовок и легенда */}
      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Заголовок и легенда</StyledSectionTitle>
        <StyledCheckboxLabel $theme={theme}>
          <StyledCheckbox
            type="checkbox"
            checked={state.titleDisplay}
            onChange={(e) => handleChange('titleDisplay', e.target.checked)}
          />
          Показать заголовок
        </StyledCheckboxLabel>
        {state.titleDisplay && (
          <>
            <StyledLabel $theme={theme}>Текст заголовка</StyledLabel>
            <StyledInput
              $theme={theme}
              type="text"
              value={state.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="Chart Title"
            />
          </>
        )}
        <StyledCheckboxLabel $theme={theme}>
          <StyledCheckbox
            type="checkbox"
            checked={state.legendDisplay}
            onChange={(e) => handleChange('legendDisplay', e.target.checked)}
          />
          Показать легенду
        </StyledCheckboxLabel>
        {state.legendDisplay && (
          <>
            <StyledLabel $theme={theme}>Позиция легенды</StyledLabel>
            <StyledSelect
              $theme={theme}
              value={state.legendPosition}
              onChange={(e) => handleChange('legendPosition', e.target.value)}
            >
              <option value="top">Top</option>
              <option value="bottom">Bottom</option>
              <option value="left">Left</option>
              <option value="right">Right</option>
            </StyledSelect>
          </>
        )}
      </StyledSection>

      {/* Шкалы */}
      {(state.type === 'bar' || state.type === 'line' || state.type === 'scatter' || state.type === 'bubble') && (
        <StyledSection $theme={theme}>
          <StyledSectionTitle $theme={theme}>Шкалы</StyledSectionTitle>
          <StyledCheckboxLabel $theme={theme}>
            <StyledCheckbox
              type="checkbox"
              checked={(state.options.scales?.y as { beginAtZero?: boolean } | undefined)?.beginAtZero ?? false}
              onChange={(e) => handleOptionChange('scales.y.beginAtZero', e.target.checked)}
            />
            Начать Y с нуля
          </StyledCheckboxLabel>
          {(state.type === 'scatter' || state.type === 'bubble') && (
            <>
              <StyledLabel $theme={theme}>Заголовок оси X</StyledLabel>
              <StyledInput
                $theme={theme}
                type="text"
                value={(state.options.scales?.x as { title?: { text?: string } } | undefined)?.title?.text || ''}
                onChange={(e) => handleOptionChange('scales.x.title.text', e.target.value)}
                placeholder="X Axis"
              />
              <StyledLabel $theme={theme}>Заголовок оси Y</StyledLabel>
              <StyledInput
                $theme={theme}
                type="text"
                value={(state.options.scales?.y as { title?: { text?: string } } | undefined)?.title?.text || ''}
                onChange={(e) => handleOptionChange('scales.y.title.text', e.target.value)}
                placeholder="Y Axis"
              />
            </>
          )}
        </StyledSection>
      )}

      {state.type === 'radar' && (
        <StyledSection $theme={theme}>
          <StyledSectionTitle $theme={theme}>Радарная шкала</StyledSectionTitle>
          <StyledCheckboxLabel $theme={theme}>
            <StyledCheckbox
              type="checkbox"
              checked={(state.options.scales?.r as { beginAtZero?: boolean } | undefined)?.beginAtZero ?? false}
              onChange={(e) => handleOptionChange('scales.r.beginAtZero', e.target.checked)}
            />
            Начать с нуля
          </StyledCheckboxLabel>
        </StyledSection>
      )}

      <StyledSection $theme={theme}>
        <StyledSectionTitle $theme={theme}>Дополнительные опции</StyledSectionTitle>
        <StyledCheckboxLabel $theme={theme}>
          <StyledCheckbox
            type="checkbox"
            checked={state.maintainAspectRatio}
            onChange={(e) => handleChange('maintainAspectRatio', e.target.checked)}
          />
          Сохранять пропорции
        </StyledCheckboxLabel>
      </StyledSection>
    </StyledPanel>
  );
}
