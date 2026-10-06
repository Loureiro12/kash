import { render, type RenderOptions } from '@testing-library/react-native';
import React from 'react';
import { SafeAreaProvider, type Metrics } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/design-system';
import type { ThemeMode } from '@/domain/types';

const metrics: Metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, left: 0, right: 0, bottom: 34 } };

/** Render com ThemeProvider + SafeAreaProvider — usar em todos os testes de componente. */
export function renderWithTheme(ui: React.ReactElement, { mode = 'dark', ...options }: RenderOptions & { mode?: ThemeMode } = {}) {
  return render(
    <SafeAreaProvider initialMetrics={metrics}>
      <ThemeProvider mode={mode}>{ui}</ThemeProvider>
    </SafeAreaProvider>,
    options,
  );
}

