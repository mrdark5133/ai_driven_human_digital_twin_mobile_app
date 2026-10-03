import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '../theme';
import { Sparkline } from './Sparkline';

interface VitalsCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: string;
  iconColor?: string;
  iconBgColor?: string;
  sparklineColor?: string;
  hasSparkline?: boolean;
  onPress?: () => void;
  progressPercent?: number;
  progressColor?: string;
}

export const VitalsCard: React.FC<VitalsCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon,
  iconColor = colors.primary,
  iconBgColor = 'rgba(76, 215, 246, 0.15)',
  sparklineColor = colors.primary,
  hasSparkline = false,
  onPress,
  progressPercent,
  progressColor = colors.primary,
}) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={onPress ? 0.75 : 1}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.headerRow}>
        <Text style={styles.titleText}>{title}</Text>
        <View style={[styles.iconCircle, { backgroundColor: iconBgColor }]}>
          <MaterialIcons name={icon as any} size={15} color={iconColor} />
        </View>
      </View>

      <View style={styles.valueRow}>
        <Text style={styles.valueText}>{value}</Text>
        {unit ? <Text style={styles.unitText}>{unit}</Text> : null}
      </View>

      {subtitle ? <Text style={styles.subtitleText} numberOfLines={1}>{subtitle}</Text> : null}

      {hasSparkline ? (
        <View style={styles.sparklineContainer}>
          <Sparkline color={sparklineColor} height={24} />
        </View>
      ) : null}

      {progressPercent !== undefined ? (
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.min(Math.max(progressPercent, 0), 100)}%`,
                backgroundColor: progressColor,
              },
            ]}
          />
        </View>
      ) : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.45)',
    minHeight: 124,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginVertical: 2,
    gap: 2,
  },
  valueText: {
    ...typography.headlineMetricMobile,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 22,
  },
  unitText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  subtitleText: {
    ...typography.labelCapsXs,
    color: colors.secondary,
    fontSize: 9,
  },
  sparklineContainer: {
    width: '100%',
    marginTop: 4,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: 6,
  },
  progressBar: {
    height: '100%',
    borderRadius: radii.full,
  },
});
