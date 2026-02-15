import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'ns_theme_mode';
const INVOICE_COLOR_KEY = 'ns_invoice_color';
const INVOICE_STYLE_KEY = 'ns_invoice_style';

export type InvoiceStyleId = 'elegant' | 'modern' | 'minimal' | 'bold' | 'classic';

export interface InvoiceStyleOption {
  id: InvoiceStyleId;
  label: string;
  description: string;
}

export const INVOICE_STYLES: InvoiceStyleOption[] = [
  { id: 'elegant', label: 'Elegant', description: 'Luxury serif with decorative accents' },
  { id: 'modern', label: 'Modern', description: 'Clean sans-serif with bold layout' },
  { id: 'minimal', label: 'Minimal', description: 'Simple and spacious design' },
  { id: 'bold', label: 'Bold', description: 'Strong colors with striking header' },
  { id: 'classic', label: 'Classic', description: 'Traditional professional format' },
];

export type ThemeMode = 'light' | 'dark';

export interface InvoiceColorScheme {
  primary: string;
  gold: string;
  darkGreen: string;
  label: string;
}

export const INVOICE_COLOR_PRESETS: InvoiceColorScheme[] = [
  { primary: '#2C1810', gold: '#C8A951', darkGreen: '#1B4332', label: 'Classic' },
  { primary: '#1A1A2E', gold: '#E94560', darkGreen: '#16213E', label: 'Midnight' },
  { primary: '#2D3436', gold: '#00B894', darkGreen: '#0984E3', label: 'Ocean' },
  { primary: '#2C3E50', gold: '#F39C12', darkGreen: '#27AE60', label: 'Autumn' },
  { primary: '#4A0E4E', gold: '#F0A500', darkGreen: '#3A0CA3', label: 'Royal' },
  { primary: '#1B1B1B', gold: '#FFD700', darkGreen: '#333333', label: 'Noir Gold' },
];

export interface DarkThemeColors {
  background: string;
  cardBackground: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  shadow: string;
  white: string;
  tabBarBg: string;
}

export const DARK_COLORS: DarkThemeColors = {
  background: '#121212',
  cardBackground: '#1E1E1E',
  border: '#2A2A2A',
  textPrimary: '#E8E4DE',
  textSecondary: '#A0A0A0',
  textMuted: '#6B6B6B',
  shadow: 'rgba(0,0,0,0.3)',
  white: '#1E1E1E',
  tabBarBg: '#181818',
};

export const LIGHT_COLORS: DarkThemeColors = {
  background: '#E8E3DC',
  cardBackground: '#F3F0EB',
  border: '#D4CFC6',
  textPrimary: '#2C1810',
  textSecondary: '#504A44',
  textMuted: '#7D776F',
  shadow: 'rgba(44, 24, 16, 0.15)',
  white: '#F3F0EB',
  tabBarBg: '#EBE7E1',
};

interface ThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
  setMode: (mode: ThemeMode) => void;
  colors: DarkThemeColors;
  invoiceColors: InvoiceColorScheme;
  setInvoiceColors: (colors: InvoiceColorScheme) => void;
  invoiceStyle: InvoiceStyleId;
  setInvoiceStyle: (style: InvoiceStyleId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [invoiceColors, setInvoiceColorsState] = useState<InvoiceColorScheme>(INVOICE_COLOR_PRESETS[0]);
  const [invoiceStyle, setInvoiceStyleState] = useState<InvoiceStyleId>('elegant');

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(THEME_KEY);
      if (saved === 'dark' || saved === 'light') setModeState(saved);
      const savedColors = await AsyncStorage.getItem(INVOICE_COLOR_KEY);
      if (savedColors) {
        try { setInvoiceColorsState(JSON.parse(savedColors)); } catch {}
      }
      const savedStyle = await AsyncStorage.getItem(INVOICE_STYLE_KEY);
      if (savedStyle) setInvoiceStyleState(savedStyle as InvoiceStyleId);
    })();
  }, []);

  const setMode = async (m: ThemeMode) => {
    setModeState(m);
    await AsyncStorage.setItem(THEME_KEY, m);
  };

  const toggleMode = () => {
    setMode(mode === 'light' ? 'dark' : 'light');
  };

  const setInvoiceColors = async (colors: InvoiceColorScheme) => {
    setInvoiceColorsState(colors);
    await AsyncStorage.setItem(INVOICE_COLOR_KEY, JSON.stringify(colors));
  };

  const setInvoiceStyle = async (style: InvoiceStyleId) => {
    setInvoiceStyleState(style);
    await AsyncStorage.setItem(INVOICE_STYLE_KEY, style);
  };

  const colors = mode === 'dark' ? DARK_COLORS : LIGHT_COLORS;

  const value = useMemo(() => ({
    mode,
    toggleMode,
    setMode,
    colors,
    invoiceColors,
    setInvoiceColors,
    invoiceStyle,
    setInvoiceStyle,
  }), [mode, colors, invoiceColors, invoiceStyle]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
