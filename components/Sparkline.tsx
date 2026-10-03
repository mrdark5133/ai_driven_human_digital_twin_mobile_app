import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { colors } from '../theme';

interface SparklineProps {
  color?: string;
  height?: number;
  width?: number | string;
  type?: 'heart' | 'ecg' | 'smooth';
}

export const Sparkline: React.FC<SparklineProps> = ({
  color = '#ff758f',
  height = 28,
  width = '100%',
  type = 'heart',
}) => {
  let pathD = 'M0 14 Q 10 14, 18 10 T 32 18 T 46 8 T 54 24 T 62 4 T 70 16 T 82 13 L 100 14';

  if (type === 'ecg') {
    pathD = 'M0 14 L 20 14 L 23 8 L 28 24 L 32 6 L 36 17 L 40 14 L 60 14 L 63 8 L 68 24 L 72 6 L 76 17 L 80 14 L 100 14';
  } else if (type === 'smooth') {
    pathD = 'M0 20 C 20 10, 40 24, 60 12 C 80 0, 90 18, 100 8';
  }

  return (
    <View style={[styles.container, { height }]}>
      <Svg width="100%" height={height} viewBox="0 0 100 28" preserveAspectRatio="none">
        <Path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    justifyContent: 'center',
  },
});
