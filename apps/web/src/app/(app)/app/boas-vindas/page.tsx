import type { Metadata } from 'next';
import { WelcomeScreen } from '@/features/onboarding/WelcomeScreen';

export const metadata: Metadata = { title: 'Boas-vindas' };

export default function Page() {
  return <WelcomeScreen />;
}
