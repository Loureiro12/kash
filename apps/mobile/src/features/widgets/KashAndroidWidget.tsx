import type { WidgetSummary } from '@kash/domain';
import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import { darkColors, staticColors } from '@/design-system/tokens/colors';

type Hex = `#${string}`;
const C = {
  bg: darkColors.surface as Hex,
  text: darkColors.text as Hex,
  muted: darkColors.muted as Hex,
  accent: staticColors.brandGreen as Hex,
  ink: staticColors.ink as Hex,
  neg: darkColors.neg as Hex,
  track: darkColors.surface2 as Hex,
};

export const ANDROID_WIDGET_NAME = 'KashSummary';
const LINK_EXPENSE = 'com.andreloureiro.kash://lancar?tipo=gasto';
const LINK_ASSISTANT = 'com.andreloureiro.kash://assistant';

/**
 * Widget do Android (tela inicial): gasto de hoje, quanto sobra no mês, barra do limite e os atalhos
 * Lançar gasto / Perguntar. `data` null = ainda não entrou no app (ou saiu da conta).
 * `stale` = os números são de outro dia (o app ainda não abriu hoje).
 */
export function KashAndroidWidget({ data, stale }: { data: WidgetSummary | null; stale?: boolean }) {
  if (!data) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 22, padding: 16, justifyContent: 'center' }}>
        <TextWidget text="Kash" style={{ fontSize: 16, fontWeight: '700', color: C.accent }} />
        <TextWidget text="Entre no app para ver seus gastos aqui." style={{ fontSize: 13, color: C.muted, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const barWidth = Math.max(4, Math.min(100, data.pct));
  return (
    <FlexWidget clickAction="OPEN_APP" style={{ height: 'match_parent', width: 'match_parent', backgroundColor: C.bg, borderRadius: 22, padding: 14, flexDirection: 'column', justifyContent: 'space-between' }}>
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', justifyContent: 'space-between' }}>
        <TextWidget text="Kash" style={{ fontSize: 14, fontWeight: '700', color: C.accent }} />
        <TextWidget text={stale ? 'abra o app para atualizar' : 'hoje'} style={{ fontSize: 11, color: C.muted }} />
      </FlexWidget>
      <FlexWidget style={{ flexDirection: 'column' }}>
        <TextWidget text={stale ? '—' : data.today} style={{ fontSize: 24, fontWeight: '800', color: C.text }} />
        <TextWidget text={`${data.leftLabel}: ${data.left}`} style={{ fontSize: 12, color: data.over ? C.neg : C.muted }} />
      </FlexWidget>
      {data.pct > 0 ? (
        <FlexWidget style={{ width: 'match_parent', height: 6, borderRadius: 3, backgroundColor: C.track, flexDirection: 'row' }}>
          <FlexWidget style={{ flex: barWidth, height: 6, borderRadius: 3, backgroundColor: data.over ? C.neg : C.accent }} />
          <FlexWidget style={{ flex: 100 - barWidth, height: 6 }} />
        </FlexWidget>
      ) : null}
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', flexGap: 8 }}>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: LINK_EXPENSE }} style={{ flex: 1, height: 36, borderRadius: 12, backgroundColor: C.accent, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text="+ Gasto" style={{ fontSize: 13, fontWeight: '700', color: C.ink }} />
        </FlexWidget>
        <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: LINK_ASSISTANT }} style={{ flex: 1, height: 36, borderRadius: 12, backgroundColor: C.track, justifyContent: 'center', alignItems: 'center' }}>
          <TextWidget text="Perguntar" style={{ fontSize: 13, fontWeight: '700', color: C.text }} />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
