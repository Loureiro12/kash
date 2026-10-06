import type { SemanticColors, ThemeMode } from '../tokens/colors';

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: SemanticColors;
}
