import type { Metadata } from 'next';
import { AccountsScreen } from '@/features/accounts/AccountsScreen';

export const metadata: Metadata = { title: 'Contas bancárias' };

export default function Page() {
  return <AccountsScreen />;
}
