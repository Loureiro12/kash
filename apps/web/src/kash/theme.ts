import type { ThemeMode } from '@kash/domain';
import { create } from 'zustand';

/** Tema aplicado na tela (o perfil manda; o navegador lembra o último para o primeiro paint). */
export const useTheme = create<{ theme: ThemeMode; setTheme: (theme: ThemeMode) => void }>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
