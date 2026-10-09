import type { Metadata } from 'next';
import { BillsScreen } from '@/features/accounts/BillsScreen';

export const metadata: Metadata = { title: 'Contas fixas' };

export default function Page() {
  return <BillsScreen />;
}
