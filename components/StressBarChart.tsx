import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, radii } from '../theme';
import { StressHistoryDay } from '../types';

interface StressBarChartProps {
  days: StressHistoryDay[];
}

export const StressBarChart: React.FC<StressBarChartProps> = ({ days }) => {
  return (
    <View style={styles.container}>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.tertiary }]} />
          <Text style={styles.legendText}>Calm</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBox, { backgroundColor: colors.secondaryContainer }]} />
          <Text style={styles.legendText}>High</Text>
        </View>
      </View>

      <View style={styles.barsContainer}>
        {days.map((item, idx) => {
          const isToday = idx === days.length - 1;
          const totalHeightPercent = item.calmPercent + item.elevatedPercent;

          return (
            <View key={idx} style={styles.dayColumn}>
              <View style={[styles.barTrack, { height: `${Math.min(totalHeightPercent, 100)}%` }]}>
                {/* Elevated section on top */}
                <View
                  style={[
                    styles.elevatedBar,
                    { height: `${(item.elevatedPercent / totalHeightPercent) * 100}%` },
                  ]}
                />
                {/* Calm section below */}
                <View
                  style={[
                    styles.calmBar,
                    { height: `${(item.calmPercent / totalHeightPercent) * 100}%` },
                  ]}
                />
              </View>
              <Text style={[styles.dayText, isToday ? styles.todayText : null]}>
                {item.dayLabel}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendBox: {
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  legendText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  barsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 110,
    paddingTop: 8,
  },
  dayColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    paddingHorizontal: 3,
  },
  barTrack: {
    width: '100%',
    maxWidth: 24,
    borderRadius: radii.sm,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  elevatedBar: {
    width: '100%',
    backgroundColor: colors.secondaryContainer,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  calmBar: {
    width: '100%',
    backgroundColor: colors.tertiary,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  dayText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  todayText: {
    color: colors.primary,
    fontWeight: '700',
  },
});
