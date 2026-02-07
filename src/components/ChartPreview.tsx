import { useCallback } from 'react';
import styled from 'styled-components';
import { ChartRenderer } from '../../chart-dsl/src/react/index';
import type { ChartConfigDefinition, AtomicChartResponse } from '../../chart-dsl/src/types/index';
import { themeColors, type ThemeName } from '../constants/themeColors';

const StyledPreview = styled.div<{ $theme?: ThemeName }>`
  height: 100%;
  max-height: 100%;
  display: flex;
  flex-direction: column;
  background: ${(p) => themeColors[p.$theme ?? 'light'].cardBg};
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  min-height: 0;
`;

const StyledPreviewHeader = styled.div<{ $theme?: ThemeName }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid ${(p) => themeColors[p.$theme ?? 'light'].borderColor};
  background: ${(p) => themeColors[p.$theme ?? 'light'].headerBg};
`;

const StyledPreviewH2 = styled.h2<{ $theme?: ThemeName }>`
  margin: 0;
  font-size: 1.3rem;
  color: ${(p) => themeColors[p.$theme ?? 'light'].text};
`;

const StyledRefreshBtn = styled.button<{ $theme?: ThemeName }>`
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid ${(p) => themeColors[p.$theme ?? 'light'].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme ?? 'light'].cardBg};
  color: ${(p) => themeColors[p.$theme ?? 'light'].text};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(p) => themeColors[p.$theme ?? 'light'].bg};
    border-color: ${(p) => themeColors[p.$theme ?? 'light'].primary};
  }
`;

const StyledPreviewContainer = styled.div`
  flex: 1;
  padding: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  min-height: 280px;
  min-width: 0;

  & > div {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  & > div > div {
    width: 100%;
    max-width: 100%;
    height: 100%;
    max-height: 100%;
    min-width: 0;
    min-height: 0;
    position: relative;
    display: block;
  }

  canvas {
    display: block;
  }
`;

const StyledLoading = styled.div<{ $theme?: ThemeName }>`
  padding: 2rem;
  text-align: center;
  color: ${(p) => themeColors[p.$theme ?? 'light'].textSecondary};
  font-size: 1rem;
`;

const StyledError = styled.div`
  padding: 2rem;
  text-align: center;
  color: #ff3b30;
  font-size: 1rem;
`;

interface ChartPreviewProps {
  config: ChartConfigDefinition;
  theme?: ThemeName;
  onDataUpdate?: (data: AtomicChartResponse) => void;
}

export function ChartPreview({ config, theme = 'light', onDataUpdate }: ChartPreviewProps) {
  const handleRefresh = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <StyledPreview $theme={theme}>
      <StyledPreviewHeader $theme={theme}>
        <StyledPreviewH2 $theme={theme}>Предпросмотр</StyledPreviewH2>
        <StyledRefreshBtn
          $theme={theme}
          type="button"
          onClick={handleRefresh}
          title="Обновить данные"
        >
          🔄 Обновить
        </StyledRefreshBtn>
      </StyledPreviewHeader>
      <StyledPreviewContainer>
        <ChartRenderer
          config={config}
          onDataUpdate={onDataUpdate}
          loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
          error={<StyledError>Ошибка загрузки данных</StyledError>}
        />
      </StyledPreviewContainer>
    </StyledPreview>
  );
}
