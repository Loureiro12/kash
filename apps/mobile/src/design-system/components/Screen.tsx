import React, { useState } from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { layout } from '../tokens/spacing';

export interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  /**
   * Cabeçalho fixo (não rola com o conteúdo): header da Início, título de aba,
   * botão voltar + título de página interna. Fica sob a status bar com o fundo da tela.
   */
  header?: React.ReactNode;
  /** reserva espaço para a tab bar flutuante (default true) */
  withTabBar?: boolean;
  /** sem scroll (telas de auth que usam flex) */
  fixed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

const HEADER_PADDING_BOTTOM = 12;

/**
 * Container de tela: fundo bg, padding 20 lateral, fundo 110 (tab bar).
 * Com `header`, o cabeçalho fica fixo no topo e o conteúdo rola por baixo;
 * uma linha sutil aparece quando há conteúdo escondido sob o cabeçalho.
 */
export function Screen({ children, header, withTabBar = true, fixed, contentStyle, testID, onScroll, ...rest }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [scrolled, setScrolled] = useState(false);
  const top = insets.top + layout.screenPaddingTopExtra;
  const bottom = withTabBar ? layout.screenPaddingBottom : insets.bottom + 24;

  if (fixed) {
    return (
      <View testID={testID} style={[{ flex: 1, backgroundColor: colors.bg, paddingTop: top, paddingHorizontal: layout.screenPaddingX, paddingBottom: bottom }, contentStyle]}>
        {children}
      </View>
    );
  }

  const scroll = (
    <ScrollView
      testID={header ? undefined : testID}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[{ paddingTop: header ? 0 : top, paddingHorizontal: layout.screenPaddingX, paddingBottom: bottom }, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      scrollEventThrottle={32}
      onScroll={(e) => {
        const next = e.nativeEvent.contentOffset.y > 6;
        if (next !== scrolled) setScrolled(next);
        onScroll?.(e);
      }}
      {...rest}
    >
      {children}
    </ScrollView>
  );

  if (!header) return scroll;

  return (
    <View testID={testID} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View
        testID={testID ? `${testID}-header` : undefined}
        style={{
          paddingTop: top,
          paddingHorizontal: layout.screenPaddingX,
          paddingBottom: HEADER_PADDING_BOTTOM,
          backgroundColor: colors.bg,
          borderBottomWidth: 1,
          borderBottomColor: scrolled ? colors.line : 'transparent',
          zIndex: 1,
        }}
      >
        {header}
      </View>
      {scroll}
    </View>
  );
}
