import type { Metadata } from 'next';
import { TransactionsScreen } from '@/features/transactions/TransactionsScreen';

export const metadata: Metadata = { title: 'Lançamentos' };

export default function Page() {
  return <TransactionsScreen />;
}
