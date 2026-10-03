import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '../theme';

interface AnomalyBannerProps {
  timeStr?: string;
  onAnalyze?: () => void;
}

export const AnomalyBanner: React.FC<AnomalyBannerProps> = ({
  timeStr = '04:12 AM',
  onAnalyze,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <MaterialIcons name="warning" size={20} color="#fcd34d" />
      </View>

      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.badgeText}>BIOMETRIC ANOMALY DETECTED</Text>
          <Text style={styles.timeText}>{timeStr}</Text>
        </View>

        <Text style={styles.titleText}>
          Elevated resting heart rate spike (<Text style={styles.highlightText}>+18 bpm</Text>) sustained for 14m during REM cycle.
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.subtitleText}>Cortisol correlation check required</Text>
          <TouchableOpacity
            style={styles.analyzeBtn}
            onPress={onAnalyze}
            activeOpacity={0.8}
          >
            <Text style={styles.analyzeText}>Analyze Event</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#fef08a" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    shadowColor: '#fbbf24',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  body: {
    flex: 1,
    gap: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badgeText: {
    ...typography.labelCapsXs,
    color: '#fcd34d',
    fontWeight: '700',
    letterSpacing: 0.8,
    flexShrink: 1,
  },
  timeText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  titleText: {
    ...typography.bodySm,
    color: colors.onSurface,
    lineHeight: 18,
    fontWeight: '400',
  },
  highlightText: {
    color: '#fcd34d',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    gap: 8,
  },
  subtitleText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
    flexShrink: 1,
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    flexShrink: 0,
  },
  analyzeText: {
    ...typography.bodySm,
    color: '#fef08a',
    fontWeight: '500',
    fontSize: 11,
  },
});
