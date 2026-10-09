'use client';

import { formatMoney } from '@kash/domain';
import { useMemo, useState } from 'react';
import { useKash } from '@/kash/data';

/** Formata dinheiro respeitando "ocultar valores". */
export function useMoney() {
  const hidden = useKash().settings.hideValues;
  return useMemo(() => (value: number) => formatMoney(value, hidden), [hidden]);
}

/** "Agora" estável durante a vida da tela (os cálculos não mudam a cada render). */
export function useNow(): Date {
  const [now] = useState(() => new Date());
  return now;
}
