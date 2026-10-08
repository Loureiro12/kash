import { normalizeHexColor } from '@kash/domain';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import ColorPicker, { HueSlider, Panel1, Swatches } from 'reanimated-color-picker';
import { Icon } from '../icons';
import { useTheme } from '../theme';
import { colorSuggestions, readableInk } from '../tokens/colors';
import { radii } from '../tokens/radii';
import { Button } from './Button';
import { Input } from './Input';
import { Pressable } from './Pressable';
import { Text } from './Text';

export interface ColorPickerModalProps {
  visible: boolean;
  /** cor inicial (#RRGGBB) */
  initialColor: string;
  title?: string;
  onCancel: () => void;
  onConfirm: (hex: string) => void;
  testID?: string;
}

/**
 * Seletor de cor personalizada: área de saturação/brilho, barra de matiz, sugestões e campo hex.
 * Fica num Modal próprio para os gestos não brigarem com a rolagem do sheet de baixo.
 */
export function ColorPickerModal({ visible, initialColor, title = 'Escolha uma cor', onCancel, onConfirm, testID = 'color-picker' }: ColorPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      {visible ? <PickerBody key={initialColor} initialColor={initialColor} title={title} onCancel={onCancel} onConfirm={onConfirm} testID={testID} /> : null}
    </Modal>
  );
}

function PickerBody({ initialColor, title, onCancel, onConfirm, testID }: Omit<ColorPickerModalProps, 'visible'> & { title: string; testID: string }) {
  const { colors } = useTheme();
  const [color, setColor] = useState(normalizeHexColor(initialColor) ?? '#C6F432');
  const [hexText, setHexText] = useState(color);
  const hexValid = normalizeHexColor(hexText) !== null;

  const pick = (hex: string) => {
    const normalized = normalizeHexColor(hex);
    if (!normalized) return;
    setColor(normalized);
    setHexText(normalized);
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: colors.overlay }}>
        {/* com o teclado aberto o cartão encolhe e rola, então o código e os botões nunca ficam escondidos */}
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" bounces={false}>
        <View testID={testID} accessibilityViewIsModal style={{ backgroundColor: colors.bg, borderRadius: radii.card, borderWidth: 1, borderColor: colors.line, padding: 18, gap: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Text variant="title" style={{ flex: 1 }}>
              {title}
            </Text>
            <View
              testID={`${testID}-preview`}
              accessibilityLabel={`Cor escolhida ${color}`}
              style={{ width: 52, height: 32, borderRadius: 10, backgroundColor: color, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text variant="micro" style={{ color: readableInk(color) }}>
                Aa
              </Text>
            </View>
          </View>

          <ColorPicker value={color} onCompleteJS={(c) => pick(c.hex.slice(0, 7))} style={{ gap: 14 }} thumbSize={26} sliderThickness={22} boundedThumb>
            <Panel1 style={{ height: 170, borderRadius: radii.input }} />
            <HueSlider style={{ borderRadius: 11 }} />
            <Swatches colors={[...colorSuggestions]} style={{ justifyContent: 'space-between' }} swatchStyle={{ width: 26, height: 26, borderRadius: 13, marginHorizontal: 0, marginBottom: 0 }} />
          </ColorPicker>

          <Input
            label="Código da cor"
            labelSize="sm"
            value={hexText}
            onChangeText={(v) => {
              setHexText(v.toUpperCase());
              const normalized = normalizeHexColor(v);
              if (normalized) setColor(normalized);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={7}
            placeholder="#C6F432"
            error={hexValid ? null : 'Use o formato #RRGGBB'}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (hexValid) onConfirm(color);
            }}
            testID={`${testID}-hex`}
          />

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Cancelar" variant="secondary" onPress={onCancel} style={{ flex: 1 }} testID={`${testID}-cancel`} />
            <Button label="Usar cor" onPress={() => onConfirm(color)} disabled={!hexValid} style={{ flex: 1 }} testID={`${testID}-confirm`} haptic="medium" />
          </View>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GestureHandlerRootView>
  );
}

export interface CustomColorSwatchProps {
  /** cor personalizada atual (null = ainda não escolhida) */
  color: string | null;
  selected: boolean;
  onPress: () => void;
  size?: number;
  testID?: string;
}

/** Bolinha "Personalizar": arco-íris com + até escolher; depois mostra a cor escolhida. */
export function CustomColorSwatch({ color, selected, onPress, size = 34, testID }: CustomColorSwatchProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      haptic="selection"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={color ? `Cor personalizada ${color}. Toque para mudar` : 'Escolher uma cor personalizada'}
      style={{ padding: 3, borderRadius: size / 2 + 5, borderWidth: 2, borderColor: selected ? colors.text : 'transparent' }}
    >
      {color ? (
        <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="edit" size={size * 0.42} color={readableInk(color)} />
        </View>
      ) : (
        <LinearGradient
          colors={['#FF5A5F', '#FFC83D', '#3DDC97', '#3D8BFF', '#D98BFF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="plus" size={size * 0.5} color="#FFFFFF" strokeWidth={2.8} />
        </LinearGradient>
      )}
    </Pressable>
  );
}
