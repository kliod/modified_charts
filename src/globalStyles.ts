import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html,
  body {
    margin: 0;
    padding: 0;
  }

  :root {
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.5;
    font-weight: 400;
    font-synthesis: none;
    text-rendering: optimizeLegibility;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    min-width: 320px;
    min-height: 100vh;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  #root {
    min-height: 100vh;
  }

  /* Тема: на :root (демо) и на любом элементе с data-theme (конструктор) */
  :root[data-theme="light"],
  [data-theme="light"] {
    --bg-color: #f5f5f5;
    --text-color: #333;
    --text-secondary: #666;
    --header-bg: #fff;
    --card-bg: #fff;
    --footer-bg: #fff;
    --border-color: #e0e0e0;
    --primary-color: #007aff;
    --code-bg: #f5f5f5;
    --code-color: #333;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  :root[data-theme="dark"],
  [data-theme="dark"] {
    --bg-color: #1F2121;
    --text-color: #F5F5F5;
    --text-secondary: #999;
    --header-bg: #2a2a2a;
    --card-bg: #2a2a2a;
    --footer-bg: #2a2a2a;
    --border-color: #444;
    --primary-color: #32B8C6;
    --code-bg: #2d2d2d;
    --code-color: #d4d4d4;
    font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
`;
