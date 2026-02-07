import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ChartRenderer, ChartProvider } from '../../chart-dsl/src/react/index';
import {
  SalesChart,
  RevenueChart,
  AnalyticsChart,
  DoughnutChart,
  RadarChart,
  ScatterChart
} from '../charts/demoCharts';
import styled from 'styled-components';
import { themeColors, type ThemeName } from '../constants/themeColors';

const StyledApp = styled.div<{ $theme: ThemeName }>`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: ${(p) => themeColors[p.$theme].bg};
  color: ${(p) => themeColors[p.$theme].text};
  transition: background-color 0.3s, color 0.3s;
`;

const StyledAppHeader = styled.header<{ $theme: ThemeName }>`
  background: ${(p) => themeColors[p.$theme].headerBg};
  padding: 2rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  text-align: center;
`;

const StyledAppHeaderH1 = styled.h1<{ $theme: ThemeName }>`
  margin: 0 0 0.5rem 0;
  font-size: 2.5rem;
  color: ${(p) => themeColors[p.$theme].primary};
`;

const StyledAppHeaderP = styled.p<{ $theme: ThemeName }>`
  margin: 0 0 1rem 0;
  color: ${(p) => themeColors[p.$theme].textSecondary};
  font-size: 1.1rem;
`;

const StyledAppHeaderActions = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`;

const StyledToggleBtn = styled.button<{ $theme: ThemeName }>`
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  border: 2px solid ${(p) => themeColors[p.$theme].primary};
  background: transparent;
  color: ${(p) => themeColors[p.$theme].primary};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;

  &:hover {
    background: ${(p) => themeColors[p.$theme].primary};
    color: white;
  }
`;

const StyledLinkAsButton = styled(Link)<{ $theme: ThemeName }>`
  padding: 0.5rem 1.5rem;
  font-size: 1rem;
  border: 2px solid ${(p) => themeColors[p.$theme].primary};
  background: transparent;
  color: ${(p) => themeColors[p.$theme].primary};
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  text-decoration: none;

  &:hover {
    background: ${(p) => themeColors[p.$theme].primary};
    color: white;
  }
`;

const StyledAppMain = styled.main`
  flex: 1;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
`;

const StyledChartsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
  gap: 2rem;
  margin-top: 2rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StyledChartSection = styled.section<{ $theme: ThemeName }>`
  background: ${(p) => themeColors[p.$theme].cardBg};
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
`;

const StyledChartSectionH2 = styled.h2<{ $theme: ThemeName }>`
  margin: 0 0 0.5rem 0;
  color: ${(p) => themeColors[p.$theme].text};
  font-size: 1.8rem;
`;

const StyledChartDescription = styled.p<{ $theme: ThemeName }>`
  margin: 0 0 1.5rem 0;
  color: ${(p) => themeColors[p.$theme].textSecondary};
  font-size: 1rem;
`;

const StyledChartContainer = styled.div`
  position: relative;
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const StyledLoading = styled.div<{ $theme: ThemeName }>`
  padding: 2rem;
  text-align: center;
  color: ${(p) => themeColors[p.$theme].textSecondary};
  font-size: 1.1rem;
`;

const StyledError = styled.div`
  padding: 2rem;
  text-align: center;
  color: #ff3b30;
  font-size: 1.1rem;
`;

const StyledAppFooter = styled.footer<{ $theme: ThemeName }>`
  background: ${(p) => themeColors[p.$theme].headerBg};
  padding: 1.5rem;
  text-align: center;
  border-top: 1px solid ${(p) => themeColors[p.$theme].borderColor};
  color: ${(p) => themeColors[p.$theme].textSecondary};
`;

const StyledAppFooterA = styled.a<{ $theme: ThemeName }>`
  color: ${(p) => themeColors[p.$theme].primary};
  text-decoration: none;
  margin-left: 0.5rem;

  &:hover {
    text-decoration: underline;
  }
`;

export interface DemoPageProps {
  theme: ThemeName;
  setTheme: (value: 'light' | 'dark') => void;
}

export function DemoPage({ theme, setTheme }: DemoPageProps) {
  const salesConfig = useMemo(() => SalesChart, []);
  const revenueConfig = useMemo(() => RevenueChart, []);
  const analyticsConfig = useMemo(() => AnalyticsChart, []);
  const doughnutConfig = useMemo(() => DoughnutChart, []);
  const radarConfig = useMemo(() => RadarChart, []);
  const scatterConfig = useMemo(() => ScatterChart, []);

  return (
    <ChartProvider theme={theme}>
      <StyledApp data-theme={theme} $theme={theme}>
        <StyledAppHeader $theme={theme}>
          <StyledAppHeaderH1 $theme={theme}>Chart DSL Framework Demo</StyledAppHeaderH1>
          <StyledAppHeaderP $theme={theme}>Демонстрация работы фреймворка визуализации данных</StyledAppHeaderP>
          <StyledAppHeaderActions>
            <StyledLinkAsButton to="/builder" $theme={theme}>
              🛠️ Конструктор
            </StyledLinkAsButton>
            <StyledToggleBtn type="button" $theme={theme} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
              {theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </StyledToggleBtn>
          </StyledAppHeaderActions>
        </StyledAppHeader>

        <StyledAppMain>
          <StyledChartsGrid>
            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Bar Chart - Sales Report</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                График продаж с данными из REST API, используя базовую схему и наследование
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={salesConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>

            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Line Chart - Revenue by Quarter</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                Линейный график выручки по кварталам с плавными кривыми
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={revenueConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>

            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Pie Chart - Traffic Sources</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                Круговая диаграмма источников трафика
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={analyticsConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>

            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Doughnut Chart - Sales Distribution</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                Кольцевая диаграмма распределения продаж по продуктам
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={doughnutConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>

            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Radar Chart - Product Comparison</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                Радарная диаграмма сравнения характеристик продуктов
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={radarConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>

            <StyledChartSection $theme={theme}>
              <StyledChartSectionH2 $theme={theme}>Scatter Chart - Sales vs Marketing</StyledChartSectionH2>
              <StyledChartDescription $theme={theme}>
                Точечная диаграмма зависимости продаж от маркетинговых затрат
              </StyledChartDescription>
              <StyledChartContainer>
                <ChartRenderer
                  config={scatterConfig}
                  loading={<StyledLoading $theme={theme}>Загрузка данных...</StyledLoading>}
                  error={<StyledError>Ошибка загрузки данных</StyledError>}
                />
              </StyledChartContainer>
            </StyledChartSection>
          </StyledChartsGrid>
        </StyledAppMain>

        <StyledAppFooter $theme={theme}>
          <p>
            Chart DSL Framework v1.0 |
            <StyledAppFooterA $theme={theme} href="https://github.com" target="_blank" rel="noopener noreferrer">
              Документация
            </StyledAppFooterA>
          </p>
        </StyledAppFooter>
      </StyledApp>
    </ChartProvider>
  );
}
