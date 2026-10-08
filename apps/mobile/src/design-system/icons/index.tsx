/**
 * Ícones do app — set Lucide (stroke 2.2 por padrão, conforme handoff).
 * Centralizar aqui evita que telas importem lucide diretamente e facilita
 * trocar o set no futuro.
 */
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Home,
  Minus,
  Lock,
  Pencil,
  Diff,
  Plus,
  Target,
  Trash2,
  Wallet,
  X,
  Delete,
} from 'lucide-react-native';
import React from 'react';

export type IconName =
  | 'home'
  | 'card'
  | 'wallet'
  | 'target'
  | 'eye'
  | 'eye-off'
  | 'calendar'
  | 'trash'
  | 'chevron-right'
  | 'arrow-left'
  | 'check'
  | 'plus'
  | 'minus'
  | 'lock'
  | 'edit'
  | 'plus-minus'
  | 'close'
  | 'backspace';

const map = {
  home: Home,
  card: CreditCard,
  wallet: Wallet,
  target: Target,
  eye: Eye,
  'eye-off': EyeOff,
  calendar: Calendar,
  trash: Trash2,
  'chevron-right': ChevronRight,
  'arrow-left': ArrowLeft,
  check: Check,
  plus: Plus,
  minus: Minus,
  lock: Lock,
  edit: Pencil,
  'plus-minus': Diff,
  close: X,
  backspace: Delete,
} as const;

export interface IconProps {
  name: IconName;
  size?: number;
  color: string;
  strokeWidth?: number;
  testID?: string;
}

export function Icon({ name, size = 22, color, strokeWidth = 2.2, testID }: IconProps) {
  const Cmp = map[name];
  return <Cmp size={size} color={color} strokeWidth={strokeWidth} testID={testID} />;
}
