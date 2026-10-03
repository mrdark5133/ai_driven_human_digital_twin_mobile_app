import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../theme';
import { Header } from '../../components/Header';
import { LineChart } from '../../components/LineChart';
import { StressBarChart } from '../../components/StressBarChart';
import { InterventionCard } from '../../components/InterventionCard';
import { DataService } from '../../services/dataService';
import { InsightsTimeframe, AIRecommendation } from '../../types';

export default function InsightsScreen() {
  const [timeframe, setTimeframe] = useState<InsightsTimeframe>('week');
  const [directiveCategory, setDirectiveCategory] = useState<string>('all');

  const chartData = DataService.getInsightsChartData(timeframe);
  const recommendations = DataService.getRecommendations(directiveCategory);
  const anomalies = DataService.getAnomalies();

  const handleRecommendationAction = (rec: AIRecommendation) => {
    Alert.alert(
      rec.title,
      `Action initiated: "${rec.actionLabel}".`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header screenTitle="Insights" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Header */}
        <View style={styles.topHeaderRow}>
          <Text style={styles.sectionTitle}>Insights & Trends</Text>
        </View>

        {/* Timeframe Segment Filter (Day / Week / Month) */}
        <View style={styles.timeframeSegment}>
          <TouchableOpacity
            style={[
              styles.timeBtn,
              timeframe === 'day' ? styles.timeBtnActive : null,
            ]}
            onPress={() => setTimeframe('day')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeBtnText,
                timeframe === 'day' ? styles.timeBtnTextActive : null,
              ]}
            >
              Day
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeBtn,
              timeframe === 'week' ? styles.timeBtnActive : null,
            ]}
            onPress={() => setTimeframe('week')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeBtnText,
                timeframe === 'week' ? styles.timeBtnTextActive : null,
              ]}
            >
              Week
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.timeBtn,
              timeframe === 'month' ? styles.timeBtnActive : null,
            ]}
            onPress={() => setTimeframe('month')}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.timeBtnText,
                timeframe === 'month' ? styles.timeBtnTextActive : null,
              ]}
            >
              Month
            </Text>
          </TouchableOpacity>
        </View>

        {/* Health Risk Score Card */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <View style={styles.riskHeaderLeft}>
              <View style={styles.riskIconRow}>
                <MaterialIcons name="timeline" size={16} color={colors.primary} />
                <Text style={styles.riskTitle}>Health Risk Score</Text>
              </View>
            </View>

            <View style={styles.badgeGroup}>
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>Demo data</Text>
              </View>
              <View style={styles.riskScoreBadge}>
                <View style={styles.riskDot} />
                <Text style={styles.riskScoreText}>Low risk</Text>
              </View>
            </View>
          </View>

          {/* Comparative Scale Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeScaleLabels}>
              <Text style={styles.scaleStart}>Low</Text>
              <Text style={styles.scaleEnd}>High</Text>
            </View>

            <View style={styles.gaugeTrack}>
              <View style={styles.gaugeGradientBar} />
              <View
                style={[
                  styles.gaugePointer,
                  { left: `${Math.min(Math.max(chartData.riskPercent, 5), 95)}%` },
                ]}
              />
            </View>
          </View>

          {/* Description Box */}
          <View style={styles.projectionBox}>
            <MaterialIcons name="info-outline" size={18} color={colors.secondary} style={{ marginTop: 2 }} />
            <Text style={styles.projectionText}>
              Based on your last 7 days of heart rate and sleep.
            </Text>
          </View>
        </View>

        {/* Telemetry Charts Section */}
        <View style={styles.streamSection}>
          <View style={styles.streamHeaderRow}>
            <View style={styles.streamTitleGroup}>
              <MaterialIcons name="show-chart" size={18} color={colors.primary} />
              <Text style={styles.streamSectionTitle}>Health Trends</Text>
            </View>
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>Demo data</Text>
            </View>
          </View>

          {/* Heart Rate Trend Chart Card */}
          <View style={styles.chartCard}>
            <View style={styles.chartCardHeader}>
              <View>
                <Text style={styles.chartCardLabel}>Resting Heart Rate</Text>
                <View style={styles.avgBpmRow}>
                  <Text style={styles.avgBpmVal}>{chartData.avgBpm}</Text>
                  <Text style={styles.avgBpmUnit}>BPM avg (60-80 range)</Text>
                </View>
              </View>

              <View style={styles.minMaxRow}>
                <Text style={styles.minText}>
                  <Text style={{ color: colors.tertiary, fontWeight: '700' }}>MIN </Text>
                  {chartData.minBpm}
                </Text>
                <Text style={styles.maxText}>
                  <Text style={{ color: colors.error, fontWeight: '700' }}>MAX </Text>
                  {chartData.maxBpm}
                </Text>
              </View>
            </View>

            <LineChart points={chartData.heartRatePoints} height={120} />
          </View>

          {/* Stress Levels Chart Card */}
          <View style={styles.chartCard}>
            <View style={styles.stressHeader}>
              <Text style={styles.stressTitle}>Stress Levels</Text>
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>Demo data</Text>
              </View>
            </View>

            <StressBarChart days={chartData.stressDays} />
          </View>
        </View>

        {/* Unusual Events Section */}
        <View style={styles.anomaliesSection}>
          <View style={styles.anomaliesHeaderRow}>
            <View style={styles.streamTitleGroup}>
              <MaterialIcons name="warning" size={18} color={colors.secondary} />
              <Text style={styles.anomaliesTitle}>Unusual Events</Text>
            </View>
            <View style={styles.badgeGroup}>
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>Demo data</Text>
              </View>
              <Text style={styles.anomaliesCount}>{anomalies.length} Events</Text>
            </View>
          </View>

          <View style={styles.anomaliesList}>
            {anomalies.map((anom) => (
              <View key={anom.id} style={styles.anomalyItemCard}>
                <View style={styles.anomalyItemHeader}>
                  <View style={styles.anomalyTimeGroup}>
                    <View
                      style={[
                        styles.anomalyDot,
                        {
                          backgroundColor:
                            anom.severity === 'amber'
                              ? '#f59e0b'
                              : anom.severity === 'rose'
                              ? colors.error
                              : colors.secondary,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.anomalyTimeText,
                        {
                          color:
                            anom.severity === 'amber'
                              ? '#f59e0b'
                              : anom.severity === 'rose'
                              ? colors.error
                              : colors.secondary,
                        },
                      ]}
                    >
                      {anom.timeStr}
                    </Text>
                  </View>

                  <View style={styles.anomalyTagPill}>
                    <Text style={styles.anomalyTagText}>{anom.tag}</Text>
                  </View>
                </View>

                <Text style={styles.anomalyDesc}>{anom.description}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Suggestions Section */}
        <View style={styles.directivesSection}>
          <View style={styles.directivesHeader}>
            <View>
              <Text style={styles.directivesTitle}>Suggestions</Text>
              <Text style={styles.directivesSubtitle}>
                Personalized tips based on your recent readings
              </Text>
            </View>
            <View style={styles.demoPill}>
              <Text style={styles.demoText}>Demo data</Text>
            </View>
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.directiveFiltersRow}
          >
            {['all', 'sleep', 'stress', 'activity'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.filterPill,
                  directiveCategory === cat ? styles.filterPillActive : styles.filterPillInactive,
                ]}
                onPress={() => setDirectiveCategory(cat)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.filterPillText,
                    directiveCategory === cat ? styles.filterPillTextActive : null,
                  ]}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  {cat === 'all' ? ` (${recommendations.length})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* List of Suggestions */}
          <View style={styles.directivesList}>
            {recommendations.map((rec) => (
              <InterventionCard
                key={rec.id}
                recommendation={rec}
                onAction={handleRecommendationAction}
              />
            ))}
          </View>
        </View>

        {/* Mandatory Medical Disclaimer */}
        <View style={styles.disclaimerCard}>
          <MaterialIcons name="verified-user" size={18} color={colors.outline} style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            <Text style={{ fontWeight: '700', color: colors.onSurfaceVariant }}>Medical Notice: </Text>
            For information only, not medical advice. Consult a healthcare professional for clinical advice or before making medical decisions.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: 12,
    paddingBottom: 110,
    gap: spacing.spaceLg,
  },
  topHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 20,
  },
  timeframeSegment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.full,
    padding: 3,
  },
  timeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  timeBtnActive: {
    backgroundColor: colors.primaryContainer,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 3,
  },
  timeBtnText: {
    ...typography.labelCapsMd,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  timeBtnTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  riskCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.25)',
    gap: 12,
  },
  riskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  riskHeaderLeft: {
    flex: 1,
  },
  riskIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  riskTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  demoPill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  demoText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
  },
  riskScoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(69, 223, 164, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  riskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tertiary,
  },
  riskScoreText: {
    ...typography.bodySm,
    color: colors.tertiary,
    fontWeight: '700',
    fontSize: 11,
  },
  gaugeContainer: {
    gap: 6,
    paddingVertical: 2,
  },
  gaugeScaleLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  scaleStart: {
    ...typography.bodySm,
    color: colors.tertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  scaleEnd: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    fontWeight: '600',
  },
  gaugeTrack: {
    height: 8,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radii.full,
    position: 'relative',
    justifyContent: 'center',
    overflow: 'visible',
  },
  gaugeGradientBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: radii.full,
    backgroundColor: colors.secondaryContainer,
    opacity: 0.8,
  },
  gaugePointer: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: colors.primary,
    marginLeft: -6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 4,
  },
  projectionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(35, 42, 57, 0.7)',
    padding: 10,
    borderRadius: radii.md,
    alignItems: 'center',
  },
  projectionText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
  },
  streamSection: {
    gap: 12,
  },
  streamHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streamTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streamSectionTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  chartCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.45)',
    gap: 6,
  },
  chartCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chartCardLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
  },
  avgBpmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    marginTop: 2,
  },
  avgBpmVal: {
    ...typography.headlineMetricMobile,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 22,
  },
  avgBpmUnit: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  minMaxRow: {
    flexDirection: 'row',
    gap: 12,
  },
  minText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  maxText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  stressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  stressTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  anomaliesSection: {
    gap: 10,
  },
  anomaliesHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anomaliesTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  anomaliesCount: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  anomaliesList: {
    gap: 8,
  },
  anomalyItemCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.45)',
    gap: 4,
  },
  anomalyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  anomalyTimeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  anomalyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  anomalyTimeText: {
    ...typography.dataMono,
    fontSize: 11,
    fontWeight: '700',
  },
  anomalyTagPill: {
    backgroundColor: 'rgba(35, 42, 57, 0.7)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  anomalyTagText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
  },
  anomalyDesc: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 12,
    lineHeight: 17,
  },
  directivesSection: {
    gap: 12,
  },
  directivesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  directivesTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 17,
  },
  directivesSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
    marginTop: 1,
  },
  directiveFiltersRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  filterPillActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 3,
  },
  filterPillInactive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  filterPillText: {
    ...typography.labelCapsMd,
    color: colors.onSurfaceVariant,
    fontSize: 10.5,
    textTransform: 'none',
  },
  filterPillTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  directivesList: {
    gap: 12,
  },
  disclaimerCard: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    alignItems: 'flex-start',
  },
  disclaimerText: {
    ...typography.bodySm,
    color: colors.outline,
    fontSize: 11,
    lineHeight: 16,
    flex: 1,
  },
});
