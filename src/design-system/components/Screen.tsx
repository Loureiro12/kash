import React from 'react';
import { ScrollView, View, type ScrollViewProps, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import { layout } from '../tokens/spacing';

export interface ScreenProps extends ScrollViewProps {
  children: React.ReactNode;
  /** reserva espaço para a tab bar flutuante (default true) */
  withTabBar?: boolean;
  /** sem scroll (telas de auth que usam flex) */
  fixed?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

/** Container de tela: fundo bg, padding 20 lateral, topo sob status bar, fundo 110 (tab bar). */
export function Screen({ children, withTabBar = true, fixed, contentStyle, testID, ...rest }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const padding: ViewStyle = {
    paddingTop: insets.top + layout.screenPaddingTopExtra,
    paddingHorizontal: layout.screenPaddingX,
    paddingBottom: withTabBar ? layout.screenPaddingBottom : insets.bottom + 24,
  };
  if (fixed) {
    return (
      <View testID={testID} style={[{ flex: 1, backgroundColor: colors.bg }, padding, contentStyle]}>
        {children}
      </View>
    );
  }
  return (
    <ScrollView
      testID={testID}
      style={{ flex: 1, backgroundColor: colors.bg }}
      contentContainerStyle={[padding, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="never"
      {...rest}
    >
      {children}
    </ScrollView>
  );
}
