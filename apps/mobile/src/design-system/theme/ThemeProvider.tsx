import React, { createContext, useContext, useMemo } from 'react';
import { darkColors, lightColors, type ThemeMode } from '../tokens/colors';
import type { Theme } from './types';

const ThemeContext = createContext<Theme | null>(null);

export function buildTheme(mode: ThemeMode): Theme {
  return {
    mode,
    isDark: mode === 'dark',
    colors: mode === 'dark' ? darkColors : lightColors,
  };
}

interface ThemeProviderProps {
  mode: ThemeMode;
  children: React.ReactNode;
}

/**
 * Injeta o tema atual. O modo vem de fora (store de settings) para que o
 * design system não dependa da camada de estado da aplicação.
 */
export function ThemeProvider({ mode, children }: ThemeProviderProps) {
  const value = useMemo(() => buildTheme(mode), [mode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  }
  return ctx;
}
