export const themeColors = {
  light: {
    bg: '#f5f5f5',
    text: '#333',
    textSecondary: '#666',
    headerBg: '#fff',
    cardBg: '#fff',
    borderColor: '#e0e0e0',
    primary: '#007aff',
  },
  dark: {
    bg: '#1F2121',
    text: '#F5F5F5',
    textSecondary: '#999',
    headerBg: '#2a2a2a',
    cardBg: '#2a2a2a',
    borderColor: '#444',
    primary: '#32B8C6',
  },
} as const;

export type ThemeName = keyof typeof themeColors;
