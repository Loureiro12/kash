import { useRouter } from 'expo-router';
import React from 'react';
import { View } from 'react-native';
import { PageHeader, Screen, Text } from '@/design-system';
import { LEGAL_DOCS, type LegalDocKey } from './content';

/** Tela 10 — Termos de uso / Política de privacidade. */
export function LegalScreen({ doc }: { doc: LegalDocKey }) {
  const router = useRouter();
  const content = LEGAL_DOCS[doc];
  return (
    <Screen testID={`legal-${doc}`}>
      <PageHeader title={content.title} onBack={() => router.back()} testID={`legal-${doc}`} />
      <Text variant="meta" color="muted" style={{ marginTop: 18 }}>
        {content.updatedAt}
      </Text>
      <View style={{ gap: 18, marginTop: 16 }}>
        {content.sections.map((s) => (
          <View key={s.heading} style={{ gap: 6 }}>
            <Text variant="titleBold">{s.heading}</Text>
            <Text variant="body" color="muted">
              {s.body}
            </Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}
