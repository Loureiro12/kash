import { fireEvent, screen } from '@testing-library/react-native';
import React from 'react';
import { Text } from '@/design-system';
import { DataGate } from '@/features/navigation/DataGate';
import { useKashStore } from '@/store';
import { renderWithTheme } from '@/test/render';

beforeEach(() => useKashStore.getState().reset());

describe('DataGate', () => {
  it('mostra conteúdo quando pronto', async () => {
    await renderWithTheme(
      <DataGate>
        <Text testID="content">ok</Text>
      </DataGate>,
    );
    expect(screen.getByTestId('content')).toBeOnTheScreen();
  });
  it('mostra esqueleto ao carregar e erro com retry', async () => {
    useKashStore.getState().setDataStatus('loading');
    await renderWithTheme(
      <DataGate>
        <Text testID="content">ok</Text>
      </DataGate>,
    );
    expect(screen.getByTestId('skeleton')).toBeOnTheScreen();
    expect(screen.queryByTestId('content')).toBeNull();
    useKashStore.getState().setDataStatus('error');
    await renderWithTheme(
      <DataGate>
        <Text testID="content">ok</Text>
      </DataGate>,
    );
    await fireEvent.press(screen.getByTestId('error-state-retry'));
    expect(useKashStore.getState().ui.dataStatus).toBe('ready');
  });
});
