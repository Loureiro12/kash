import type { Metadata } from 'next';
import { LoginScreen } from '@/features/auth/AuthScreens';

export const metadata: Metadata = { title: 'Entrar' };

export default function Page() {
  return <LoginScreen />;
}
