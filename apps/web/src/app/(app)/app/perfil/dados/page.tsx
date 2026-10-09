import type { Metadata } from 'next';
import { PersonalScreen } from '@/features/profile/ProfilePages';

export const metadata: Metadata = { title: 'Dados pessoais' };

export default function Page() {
  return <PersonalScreen />;
}
