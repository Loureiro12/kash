import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../theme';
import { Icon } from '../icons';
import { radii } from '../tokens/radii';
import { Pressable } from './Pressable';
import { Text } from './Text';

export type KeypadKey = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '00' | '0' | 'del';

const KEYS: KeypadKey[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '00', '0', 'del'];

export interface KeypadProps {
  onKey: (key: KeypadKey) => void;
  testID?: string;
}

/** Teclado numérico 3×4 (teclas 50px r14 surface, 20/600). */
export function Keypad({ onKey, testID = 'keypad' }: KeypadProps) {
  const { colors } = useTheme();
  return (
    <View testID={testID} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {KEYS.map((k) => (
        <Pressable
          key={k}
          testID={`key-${k}`}
          onPress={() => onKey(k)}
          onLongPress={k === 'del' ? () => onKey('del') : undefined}
          haptic="light"
          pressedOpacity={0.6}
          accessibilityRole="button"
          accessibilityLabel={k === 'del' ? 'Apagar' : k}
          style={{
            width: '31.5%',
            flexGrow: 1,
            height: 50,
            borderRadius: radii.input,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {k === 'del' ? <Icon name="backspace" size={22} color={colors.text} strokeWidth={2} /> : <Text variant="key">{k}</Text>}
        </Pressable>
      ))}
    </View>
  );
}
