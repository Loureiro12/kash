import React from 'react';
import { View } from 'react-native';
import { fontFamily, Text, type TextColor, type TextVariant } from '@/design-system';

/** "a **b** c" → partes com negrito */
export function splitBold(line: string): { text: string; bold: boolean }[] {
  const parts: { text: string; bold: boolean }[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  for (let m = re.exec(line); m; m = re.exec(line)) {
    if (m.index > last) parts.push({ text: line.slice(last, m.index), bold: false });
    parts.push({ text: m[1]!, bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) parts.push({ text: line.slice(last), bold: false });
  return parts;
}

/**
 * Texto do assistente: parágrafos, listas com "- " / "• " / "1." e **negrito**. O modelo é orientado
 * a responder só com isso; o resto (títulos com #) vira texto normal.
 */
export function RichText({ text, variant = 'subtitle', color }: { text: string; variant?: TextVariant; color?: TextColor }) {
  const lines = text.replace(/\r/g, '').split('\n');
  return (
    <View style={{ gap: 6 }}>
      {lines.map((raw, i) => {
        const line = raw.replace(/^#+\s*/, '').trimEnd();
        if (!line.trim()) return null;
        const bullet = line.match(/^\s*(?:[-•*]|\d+[.)])\s+(.*)$/);
        const body = bullet ? bullet[1]! : line;
        const content = splitBold(body).map((p, j) => (
          <Text key={j} variant={variant} color={color} style={p.bold ? { fontFamily: fontFamily.bold } : undefined}>
            {p.text}
          </Text>
        ));
        return bullet ? (
          <View key={i} style={{ flexDirection: 'row', gap: 8, paddingLeft: 2 }}>
            <Text variant={variant} color={color}>
              •
            </Text>
            <Text variant={variant} color={color} style={{ flex: 1 }}>
              {content}
            </Text>
          </View>
        ) : (
          <Text key={i} variant={variant} color={color}>
            {content}
          </Text>
        );
      })}
    </View>
  );
}
