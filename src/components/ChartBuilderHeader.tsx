import { useState, useEffect } from 'react';
import styled from 'styled-components';
import { themeColors, type ThemeName } from '../constants/themeColors';

const StyledHeader = styled.div<{ $theme: ThemeName }>`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  background: ${(p) => themeColors[p.$theme].headerBg};
  border-bottom: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
`;

const StyledHeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const StyledHeaderH1 = styled.h1<{ $theme: ThemeName }>`
  margin: 0;
  font-size: 1.8rem;
  color: ${(p) => themeColors[p.$theme].text};
`;

const StyledActions = styled.div`
  display: flex;
  gap: 0.5rem;

  @media (max-width: 768px) {
    flex-wrap: wrap;
  }
`;

const StyledActionBtn = styled.button<{ $theme: ThemeName; $primary?: boolean; $danger?: boolean }>`
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(p) => themeColors[p.$theme].bg};
    border-color: ${(p) => themeColors[p.$theme].primary};
  }

  ${(p) =>
    p.$primary &&
    `
    background: ${themeColors[p.$theme].primary};
    color: white;
    border-color: ${themeColors[p.$theme].primary};
    &:hover {
      opacity: 0.9;
    }
  `}

  ${(p) =>
    p.$danger &&
    `
    color: #ff3b30;
    border-color: #ff3b30;
    &:hover {
      background: #ff3b30;
      color: white;
    }
  `}

  @media (max-width: 768px) {
    flex: 1;
    min-width: 120px;
  }
`;

const StyledToast = styled.div<{ $theme: ThemeName }>`
  position: fixed;
  top: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  background: ${(p) => themeColors[p.$theme].cardBg};
  color: ${(p) => themeColors[p.$theme].text};
  border: 1px solid ${(p) => themeColors[p.$theme].primary};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  font-size: 0.95rem;
  z-index: 9999;
  max-width: 90vw;
  text-align: center;
`;

const StyledThemeToggle = styled.div<{ $theme: ThemeName }>`
  display: flex;
  gap: 0.25rem;
  margin-right: 0.5rem;
  padding-right: 0.5rem;
  border-right: 1px solid ${(p) => themeColors[p.$theme].borderColor};
`;

const StyledThemeBtn = styled.button<{ $theme: ThemeName; $active?: boolean }>`
  padding: 0.4rem 0.75rem;
  font-size: 0.85rem;
  border: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  border-radius: 4px;
  background: ${(p) => (p.$active ? themeColors[p.$theme].primary : themeColors[p.$theme].cardBg)};
  color: ${(p) => (p.$active ? 'white' : themeColors[p.$theme].text)};
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: ${(p) => (p.$active ? themeColors[p.$theme].primary : themeColors[p.$theme].bg)};
    border-color: ${(p) => themeColors[p.$theme].primary};
    opacity: ${(p) => (p.$active ? 0.9 : 1)};
  }
`;

interface ChartBuilderHeaderProps {
  theme: 'light' | 'dark';
  onThemeChange: (theme: 'light' | 'dark') => void;
  onSave: () => void;
  onLoad: () => void;
  onExportDSL: () => void;
  onExportJSON: () => void;
  onReset: () => void;
  onBack?: () => void;
}

export function ChartBuilderHeader({
  theme,
  onThemeChange,
  onExportDSL,
  onExportJSON,
  onReset,
  onBack
}: ChartBuilderHeaderProps) {
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(() => setNotification(null), 4000);
    return () => clearTimeout(t);
  }, [notification]);

  const showNoBackendNotification = () => {
    setNotification('Бэка нет, но вы держитесь');
  };

  return (
    <>
    <StyledHeader $theme={theme}>
      <StyledHeaderLeft>
        {onBack && (
          <StyledActionBtn
            type="button"
            $theme={theme}
            onClick={onBack}
            title="Вернуться к демо"
          >
            ← Назад
          </StyledActionBtn>
        )}
        <StyledHeaderH1 $theme={theme}>Конструктор графиков</StyledHeaderH1>
      </StyledHeaderLeft>
      <StyledActions>
        <StyledThemeToggle $theme={theme}>
          <StyledThemeBtn
            type="button"
            $theme={theme}
            $active={theme === 'light'}
            onClick={() => onThemeChange('light')}
            title="Светлая тема"
          >
            ☀️
          </StyledThemeBtn>
          <StyledThemeBtn
            type="button"
            $theme={theme}
            $active={theme === 'dark'}
            onClick={() => onThemeChange('dark')}
            title="Тёмная тема"
          >
            🌙
          </StyledThemeBtn>
        </StyledThemeToggle>
        <StyledActionBtn type="button" $theme={theme} $primary onClick={showNoBackendNotification}>
          💾 Сохранить
        </StyledActionBtn>
        <StyledActionBtn type="button" $theme={theme} onClick={showNoBackendNotification}>
          📂 Загрузить
        </StyledActionBtn>
        <StyledActionBtn type="button" $theme={theme} onClick={onExportDSL}>
          📋 Экспорт DSL
        </StyledActionBtn>
        <StyledActionBtn type="button" $theme={theme} onClick={onExportJSON}>
          📄 Экспорт JSON
        </StyledActionBtn>
        <StyledActionBtn type="button" $theme={theme} $danger onClick={onReset}>
          🔄 Сбросить
        </StyledActionBtn>
      </StyledActions>
    </StyledHeader>
    {notification && (
      <StyledToast $theme={theme} role="alert">
        {notification}
      </StyledToast>
    )}
    </>
  );
}
