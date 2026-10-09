import type { Metadata } from 'next';
import { GoalsScreen } from '@/features/goals/GoalsScreen';

export const metadata: Metadata = { title: 'Metas' };

export default function Page() {
  return <GoalsScreen />;
}
