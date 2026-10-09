import type { Metadata } from 'next';
import { SecurityScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Segurança' };

export default function Page() {
  return <SecurityScreen />;
}
