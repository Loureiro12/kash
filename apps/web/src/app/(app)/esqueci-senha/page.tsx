import type { Metadata } from 'next';
import { ForgotPasswordScreen } from '@/features/auth/AuthScreens';

export const metadata: Metadata = { title: 'Esqueci a senha' };

export default function Page() {
  return <ForgotPasswordScreen />;
}
