import type { Metadata } from 'next';
import { SignupScreen } from '@/features/auth/AuthScreens';

export const metadata: Metadata = { title: 'Criar conta' };

export default function Page() {
  return <SignupScreen />;
}
