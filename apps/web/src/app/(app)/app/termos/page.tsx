import type { Metadata } from 'next';
import { TermsScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Termos de uso' };

export default function Page() {
  return <TermsScreen />;
}
