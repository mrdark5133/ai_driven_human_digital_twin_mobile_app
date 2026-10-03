import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { colors, typography } from '../theme';

interface HealthScoreRingProps {
  score: number;
  maxScore?: number;
  statusLabel?: string;
  size?: number;
  strokeWidth?: number;
}

export const HealthScoreRing: React.FC<HealthScoreRingProps> = ({
  score = 78,
  maxScore = 100,
  statusLabel = 'Optimal',
  size = 176,
  strokeWidth = 10,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(score / maxScore, 0), 1);
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="cyanScoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#45dfa4" />
            <Stop offset="55%" stopColor="#4cd7f6" />
            <Stop offset="100%" stopColor="#5de6ff" />
          </LinearGradient>
        </Defs>

        {/* Background Track Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#2e3544"
          strokeWidth={strokeWidth}
          strokeOpacity={0.5}
          fill="transparent"
        />

        {/* Dynamic Glowing Value Ring */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#cyanScoreGradient)"
          strokeWidth={strokeWidth}
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Central Number & Status */}
      <View style={styles.centerContent}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>{score}</Text>
          <Text style={styles.maxScoreText}>/{maxScore}</Text>
        </View>
        <Text style={styles.statusBadge}>{statusLabel}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreText: {
    ...typography.headlineMetric,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 34,
  },
  maxScoreText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 14,
    marginLeft: 1,
  },
  statusBadge: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    marginTop: 2,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
