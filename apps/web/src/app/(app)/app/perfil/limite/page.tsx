import type { Metadata } from 'next';
import { BudgetScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Limite mensal' };

export default function Page() {
  return <BudgetScreen />;
}
