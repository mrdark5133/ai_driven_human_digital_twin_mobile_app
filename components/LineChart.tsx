import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { colors, typography } from '../theme';
import { HeartRateHistoryPoint } from '../types';

interface LineChartProps {
  points: HeartRateHistoryPoint[];
  height?: number;
}

export const LineChart: React.FC<LineChartProps> = ({ points, height = 120 }) => {
  // Compute normalized coordinates for 340 x 120 viewBox
  const width = 340;
  const h = 100;
  const padding = 20;

  if (!points || points.length === 0) return null;

  const minBpm = Math.min(...points.map((p) => p.bpm), 45);
  const maxBpm = Math.max(...points.map((p) => p.bpm), 95);
  const bpmRange = maxBpm - minBpm || 1;

  const coords = points.map((p, idx) => {
    const x = (idx / (points.length - 1)) * (width - 2 * padding) + padding;
    const y = h - ((p.bpm - minBpm) / bpmRange) * (h - 20) - 10;
    return { x, y, point: p };
  });

  // Build SVG path curve
  let pathD = `M ${coords[0].x},${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpX = (prev.x + curr.x) / 2;
    pathD += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`;
  }

  const areaD = `${pathD} L ${coords[coords.length - 1].x},${height} L ${coords[0].x},${height} Z`;

  return (
    <View style={styles.container}>
      <View style={{ width: '100%', height }}>
        <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="chartFillGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#4cd7f6" stopOpacity="0.35" />
              <Stop offset="100%" stopColor="#4cd7f6" stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="chartLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor="#45dfa4" />
              <Stop offset="50%" stopColor="#4cd7f6" />
              <Stop offset="100%" stopColor="#5de6ff" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid lines */}
          <Line x1="0" y1="25" x2={width} y2="25" stroke="#2e3544" strokeWidth="1" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line x1="0" y1="65" x2={width} y2="65" stroke="#2e3544" strokeWidth="1" strokeDasharray="4 4" strokeOpacity={0.6} />
          <Line x1="0" y1="105" x2={width} y2="105" stroke="#2e3544" strokeWidth="1" strokeDasharray="4 4" strokeOpacity={0.6} />

          {/* Area under curve */}
          <Path d={areaD} fill="url(#chartFillGradient)" />

          {/* Main curve line */}
          <Path
            d={pathD}
            fill="none"
            stroke="url(#chartLineGradient)"
            strokeWidth={2.5}
            strokeLinecap="round"
          />

          {/* Highlight data points */}
          {coords.map((c, i) => {
            const isLast = i === coords.length - 1;
            return (
              <React.Fragment key={i}>
                <Circle
                  cx={c.x}
                  cy={c.y}
                  r={isLast ? 4.5 : 3.5}
                  fill={isLast ? colors.primary : colors.surface}
                  stroke={colors.primary}
                  strokeWidth={2}
                />
              </React.Fragment>
            );
          })}
        </Svg>
      </View>

      {/* Day / Time Labels */}
      <View style={styles.labelsRow}>
        {points.map((p, i) => (
          <Text
            key={i}
            style={[
              styles.dayLabel,
              i === points.length - 1 ? styles.activeDayLabel : null,
            ]}
          >
            {p.day}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginTop: 8,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    paddingTop: 6,
  },
  dayLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  activeDayLabel: {
    color: colors.primary,
    fontWeight: '700',
  },
});
