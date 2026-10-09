import type { Metadata } from 'next';
import { CurrencyScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Moeda' };

export default function Page() {
  return <CurrencyScreen />;
}
