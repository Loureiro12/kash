import type { Metadata } from 'next';
import { PrivacyScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Política de privacidade' };

export default function Page() {
  return <PrivacyScreen />;
}
