import type { Metadata } from 'next';
import { AuthCallbackScreen } from '@/features/auth/AuthScreens';

export const metadata: Metadata = { title: 'Entrando' };

export default function Page() {
  return <AuthCallbackScreen />;
}
