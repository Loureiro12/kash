import type { Metadata } from 'next';
import { CardsScreen } from '@/features/cards/CardsScreen';

export const metadata: Metadata = { title: 'Cartões' };

export default function Page() {
  return <CardsScreen />;
}
