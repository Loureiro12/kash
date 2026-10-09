import type { Metadata } from 'next';
import { HelpScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Ajuda e suporte' };

export default function Page() {
  return <HelpScreen />;
}
