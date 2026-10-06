import React from 'react';
import { View, type ViewProps, type FlexAlignType, type ViewStyle } from 'react-native';

export interface StackProps extends ViewProps {
  row?: boolean;
  gap?: number;
  align?: FlexAlignType;
  justify?: ViewStyle['justifyContent'];
  flex?: number;
  wrap?: boolean;
  children?: React.ReactNode;
}

/** Container flex com gap — evita StyleSheet repetitivo nas telas. */
export function Stack({ row, gap, align, justify, flex, wrap, style, children, ...rest }: StackProps) {
  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: row ? 'row' : 'column',
          gap,
          alignItems: align,
          justifyContent: justify,
          flex,
          flexWrap: wrap ? 'wrap' : undefined,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
