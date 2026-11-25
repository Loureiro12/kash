import React from 'react';
import { View } from 'react-native';
import { Skeleton } from '@/design-system';
import { radii } from '@/design-system/tokens/radii';

/** Cabeçalho do Início enquanto carrega: avatar, saudação e nome. */
export function HomeHeaderSkeleton() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} testID="home-header-skeleton">
      <Skeleton width={44} height={44} radius={radii.pill} />
      <View style={{ gap: 6 }}>
        <Skeleton width={70} height={12} />
        <Skeleton width={110} height={18} radius={6} />
      </View>
      <Skeleton width={40} height={40} radius={radii.pill} style={{ marginLeft: 'auto' }} />
    </View>
  );
}

/**
 * Início enquanto o snapshot carrega: mesmos blocos e alturas da tela pronta (saldo, gastos do mês,
 * ações rápidas, próximas contas, previsão e últimos lançamentos), pra nada "pular" quando os dados chegam.
 */
export function HomeSkeleton() {
  return (
    <View testID="home-skeleton" accessible accessibilityLabel="Carregando seus dados" accessibilityRole="progressbar">
      {/* saldo total */}
      <Skeleton height={136} radius={radii.cardXl} style={{ marginTop: 10 }} />
      {/* gastos do mês */}
      <Skeleton height={150} radius={radii.cardXl} style={{ marginTop: 12 }} />
      {/* ações rápidas */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={82} radius={radii.card} style={{ flex: 1 }} />
        ))}
      </View>
      {/* próximas contas */}
      <Skeleton width={140} height={18} radius={6} style={{ marginTop: 26 }} />
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 12, overflow: 'hidden' }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} width={145} height={92} radius={radii.card} />
        ))}
      </View>
      {/* previsão */}
      <Skeleton height={70} radius={radii.card} style={{ marginTop: 14 }} />
      {/* últimos lançamentos */}
      <Skeleton width={170} height={18} radius={6} style={{ marginTop: 26 }} />
      <View style={{ marginTop: 6 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 }}>
            <Skeleton width={40} height={40} radius={radii.icon} />
            <View style={{ flex: 1, gap: 6 }}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={12} />
            </View>
            <Skeleton width={70} height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}
