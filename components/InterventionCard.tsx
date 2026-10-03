import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, radii, spacing } from '../theme';
import { AIRecommendation } from '../types';

interface InterventionCardProps {
  recommendation: AIRecommendation;
  onAction?: (rec: AIRecommendation) => void;
}

export const InterventionCard: React.FC<InterventionCardProps> = ({
  recommendation,
  onAction,
}) => {
  return (
    <View style={styles.card}>
      {/* Accent left indicator bar */}
      <View style={[styles.leftBar, { backgroundColor: recommendation.accentColor }]} />

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.priorityRow}>
            <View style={[styles.dot, { backgroundColor: recommendation.accentColor }]} />
            <Text style={[styles.priorityText, { color: recommendation.accentColor }]}>
              {recommendation.priorityLabel}
            </Text>
          </View>
          <Text style={styles.timeHint}>{recommendation.timeHint}</Text>
        </View>

        <Text style={styles.title}>{recommendation.title}</Text>

        <View style={styles.predictionRow}>
          <MaterialIcons name="trending-up" size={14} color={colors.secondary} />
          <Text style={styles.predictionText}>{recommendation.prediction}</Text>
        </View>

        {/* Telemetry rationale container */}
        <View style={styles.rationaleBox}>
          <MaterialIcons name="query-stats" size={16} color={colors.outline} style={styles.rationaleIcon} />
          <Text style={styles.rationaleText}>{recommendation.rationale}</Text>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={styles.actionBtn}
          activeOpacity={0.8}
          onPress={() => onAction && onAction(recommendation)}
        >
          <MaterialIcons name={recommendation.actionIcon as any} size={16} color={colors.onPrimary} />
          <Text style={styles.actionBtnText}>{recommendation.actionLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.45)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 3,
  },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: radii.xl,
    borderBottomLeftRadius: radii.xl,
  },
  content: {
    paddingLeft: 4,
    gap: spacing.spaceSm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priorityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    ...typography.labelCapsXs,
    fontWeight: '700',
    fontSize: 9.5,
  },
  timeHint: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 10.5,
  },
  title: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  predictionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  predictionText: {
    ...typography.labelCapsMd,
    color: colors.secondary,
    textTransform: 'none',
    fontWeight: '600',
    fontSize: 12,
  },
  rationaleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(25, 32, 46, 0.75)',
    padding: 10,
    borderRadius: radii.md,
    gap: 8,
  },
  rationaleIcon: {
    marginTop: 1,
  },
  rationaleText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
    fontSize: 12,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radii.full,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  actionBtnText: {
    ...typography.labelCapsMd,
    color: colors.onPrimary,
    fontWeight: '700',
    fontSize: 11,
  },
});
