import React from 'react';
import Svg, { Ellipse, Path, Circle } from 'react-native-svg';
import { colors } from '../theme/tokens';

export type Organ = 'brain' | 'heart' | 'lungs';
const line = '#6b7f8a'; // light enough to be visible on the dark card

export default function BodyFigure({ selected, width = 108 }: { selected: Organ; width?: number }) {
  const on = (o: Organ) => selected === o;
  return (
    <Svg width={width} height={(width * 280) / 120} viewBox="0 0 120 280">
      <Ellipse cx="60" cy="30" rx="16" ry="19" fill={colors.cardLow} stroke={line} strokeWidth={1.5} />
      <Path d="M54 48 C54 54 53 58 48 60 M66 48 C66 54 67 58 72 60" stroke={line} strokeWidth={1.5} strokeLinecap="round" fill="none" />
      <Path
        d="M48 60 C32 63 24 74 20 95 C17 114 15 138 12 155 C11 160 14 163 17 161 C21 158 25 142 27 132 C28 116 30 100 32 94 C33 90 35 125 35 145 C35 165 37 185 39 192 C41 199 44 235 44 262 C44 268 51 268 52 262 C55 240 57 210 59 195 C59.5 192 60.5 192 61 195 C63 210 65 240 68 262 C69 268 76 268 76 262 C76 235 79 199 81 192 C83 185 85 165 85 145 C85 125 87 90 88 94 C90 100 92 116 93 132 C95 142 99 158 103 161 C106 163 109 160 108 155 C105 138 103 114 100 95 C96 74 88 63 72 60"
        fill={colors.cardLow} stroke={line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round"
      />
      <Ellipse cx="60" cy="28" rx="9" ry="8" fill={colors.amber} opacity={on('brain') ? 0.35 : 0.15} />
      <Circle cx="60" cy="28" r={on('brain') ? 5 : 3.5} fill={colors.amber} />
      <Ellipse cx="51" cy="84" rx="7" ry="11" fill={colors.green} opacity={on('lungs') ? 0.35 : 0.15} />
      <Ellipse cx="69" cy="84" rx="7" ry="11" fill={colors.green} opacity={on('lungs') ? 0.35 : 0.15} />
      <Circle cx="51" cy="84" r={on('lungs') ? 4 : 3} fill={colors.green} />
      <Circle cx="69" cy="84" r={on('lungs') ? 4 : 3} fill={colors.green} />
      <Ellipse cx="64" cy="88" rx="9" ry="9" fill={colors.teal} opacity={on('heart') ? 0.45 : 0.2} />
      <Circle cx="64" cy="88" r={on('heart') ? 5.5 : 4} fill={colors.teal} />
    </Svg>
  );
}
