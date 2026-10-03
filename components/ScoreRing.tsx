import React from 'react';
import { View, Text } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

export default function ScoreRing({ score, size = 112 }: { score: number; size?: number }) {
  const C = 2 * Math.PI * 41;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Circle cx="50" cy="50" r="41" stroke={colors.cardHigh} strokeWidth={8} fill="none" />
        <Circle
          cx="50" cy="50" r="41" stroke={colors.primary} strokeWidth={8} fill="none"
          strokeLinecap="round" strokeDasharray={`${C}`} strokeDashoffset={C * (1 - score / 100)}
          transform="rotate(-90 50 50)"
        />
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ color: colors.primary, fontSize: 22, fontWeight: '700' }}>{score}</Text>
        <Text style={{ color: colors.textDim, fontSize: 11 }}>/ 100</Text>
      </View>
    </View>
  );
}
