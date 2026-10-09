import type { Metadata } from 'next';
import { ProfileScreen } from '@/features/profile/ProfileScreen';

export const metadata: Metadata = { title: 'Perfil' };

export default function Page() {
  return <ProfileScreen />;
}
