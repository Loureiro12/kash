import { Redirect, useLocalSearchParams } from 'expo-router';
import React from 'react';

/** Link do convite (`com.andreloureiro.kash://convite?codigo=…`): abre a conta compartilhada com o código. */
export default function InviteRoute() {
  const { codigo } = useLocalSearchParams<{ codigo?: string }>();
  return <Redirect href={{ pathname: '/profile/shared', params: codigo ? { codigo } : {} }} />;
}
