import React, { useState, useEffect, useMemo } from 'react';
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
import { getRiskAssessment, RiskAssessment, RiskBand } from '../../src/services/riskModel';
import { getTodayHeartRates, HeartRateDataPoint } from '../../src/services/healthConnect';

export default function InsightsScreen() {
  const [timeframe, setTimeframe] = useState<InsightsTimeframe>('week');
  const [directiveCategory, setDirectiveCategory] = useState<string>('all');
  const [riskAssessment, setRiskAssessment] = useState<RiskAssessment | null>(null);
  const [todayHeartRates, setTodayHeartRates] = useState<HeartRateDataPoint[]>([]);
  const [showAboutModel, setShowAboutModel] = useState(false);

  useEffect(() => {
    let active = true;
    getRiskAssessment().then((res) => {
      if (active) setRiskAssessment(res);
    });
    getTodayHeartRates().then((pts) => {
      if (active && pts) setTodayHeartRates(pts);
    });
    return () => {
      active = false;
    };
  }, []);

  const band: RiskBand = riskAssessment?.band || 'Low';
  const bandColor =
    band === 'High' ? colors.error : band === 'Moderate' ? colors.warning : colors.tertiary;

  // Group features by source for small readable chips
  const sourceGroups = useMemo(() => {
    if (!riskAssessment) return {};
    const groups: Record<string, string[]> = {};
    const labels: Record<string, string> = {
      age: 'Age',
      bmi_level: 'BMI',
      heart_rate: 'HR',
      daily_steps: 'Steps',
      sleep_duration: 'Sleep',
      quality_of_sleep: 'Quality',
      stress_level: 'Stress',
      physical_activity: 'Activity',
    };
    Object.entries(riskAssessment.sources).forEach(([feat, src]) => {
      const srcName =
        src === 'profile' ? 'Profile' : src === 'watch' ? 'Watch' : src === 'call' ? 'Call' : 'Coming soon';
      if (!groups[srcName]) groups[srcName] = [];
      groups[srcName].push(labels[feat] || feat);
    });
    return groups;
  }, [riskAssessment]);

  const chartData = DataService.getInsightsChartData(timeframe);
  const recommendations = DataService.getRecommendations(directiveCategory);
  const anomalies = DataService.getAnomalies();

  const hasHeartRates = todayHeartRates.length > 0;
  const hrBpmValues = todayHeartRates.map((p) => p.bpm);
  const avgHeartRate = hasHeartRates
    ? `${Math.round(hrBpmValues.reduce((sum, b) => sum + b, 0) / hrBpmValues.length)}`
    : '--';
  const minHeartRate = hasHeartRates ? `${Math.min(...hrBpmValues)}` : '--';
  const maxHeartRate = hasHeartRates ? `${Math.max(...hrBpmValues)}` : '--';

  const realHeartRatePoints = useMemo(() => {
    return todayHeartRates.map((p) => ({
      day: new Date(p.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      bpm: p.bpm,
    }));
  }, [todayHeartRates]);

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

        {/* Sleep & Lifestyle Risk Card */}
        <View style={styles.riskCard}>
          <View style={styles.riskHeader}>
            <View style={styles.riskHeaderLeft}>
              <View style={styles.riskIconRow}>
                <MaterialIcons name="bedtime" size={18} color={colors.primary} />
                <Text style={styles.riskTitle}>Sleep & Lifestyle Risk</Text>
              </View>
            </View>

            <View style={styles.badgeGroup}>
              {riskAssessment?.isDemo && (
                <View style={styles.demoPill}>
                  <Text style={styles.demoText}>Coming soon</Text>
                </View>
              )}
              <View style={[styles.riskScoreBadge, { backgroundColor: bandColor + '22' }]}>
                <View style={[styles.riskDot, { backgroundColor: bandColor }]} />
                <Text style={[styles.riskScoreText, { color: bandColor }]}>
                  {band} ({riskAssessment?.percent ?? 18}%)
                </Text>
              </View>
            </View>
          </View>

          {/* Comparative Horizontal Bar Gauge */}
          <View style={styles.gaugeContainer}>
            <View style={styles.gaugeScaleLabels}>
              <Text style={styles.scaleStart}>Low (&lt;35%)</Text>
              <Text style={styles.scaleMid}>Moderate (35-65%)</Text>
              <Text style={styles.scaleEnd}>High (&gt;65%)</Text>
            </View>

            <View style={styles.gaugeTrack}>
              <View
                style={[
                  styles.gaugeGradientBar,
                  {
                    width: `${Math.min(Math.max(riskAssessment?.percent ?? 18, 5), 100)}%`,
                    backgroundColor: bandColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.gaugePointer,
                  {
                    left: `${Math.min(Math.max(riskAssessment?.percent ?? 18, 4), 96)}%`,
                    borderColor: bandColor,
                  },
                ]}
              />
            </View>
          </View>

          {/* 2-3 Main Reasons */}
          {riskAssessment?.topRiskFactors && riskAssessment.topRiskFactors.length > 0 && (
            <View style={styles.reasonsContainer}>
              <Text style={styles.factorSectionTitle}>Main contributors:</Text>
              <View style={styles.factorRows}>
                {riskAssessment.topRiskFactors.map((rf, idx) => (
                  <View key={idx} style={styles.factorPill}>
                    <MaterialIcons name="trending-up" size={13} color={colors.warning} />
                    <Text style={styles.factorPillText}>{rf.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* What helps line */}
          {riskAssessment?.protectiveFactors && riskAssessment.protectiveFactors.length > 0 && (
            <View style={styles.whatHelpsBox}>
              <MaterialIcons name="check-circle" size={14} color={colors.tertiary} />
              <Text style={styles.whatHelpsText}>
                <Text style={styles.whatHelpsBold}>What helps: </Text>
                {riskAssessment.protectiveFactors.map((pf) => pf.label).join(', ')}
              </Text>
            </View>
          )}

          {/* Input Source Chips */}
          <View style={styles.sourcesContainer}>
            <Text style={styles.sourcesLabel}>Sources:</Text>
            <View style={styles.chipsRow}>
              {Object.entries(sourceGroups).map(([src, feats]) => (
                <View key={src} style={styles.sourceChip}>
                  <Text style={styles.sourceChipText}>
                    <Text style={styles.sourceChipBold}>{src}:</Text> {feats.join(', ')}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* About this model expandable section */}
          <TouchableOpacity
            style={styles.aboutToggleRow}
            onPress={() => setShowAboutModel(!showAboutModel)}
            activeOpacity={0.7}
          >
            <View style={styles.aboutToggleLeft}>
              <MaterialIcons name="science" size={15} color={colors.primary} />
              <Text style={styles.aboutToggleText}>About this on-device model</Text>
            </View>
            <MaterialIcons
              name={showAboutModel ? 'expand-less' : 'expand-more'}
              size={18}
              color={colors.primary}
            />
          </TouchableOpacity>

          {showAboutModel && (
            <View style={styles.aboutModelBox}>
              <Text style={styles.aboutModelDesc}>
                Trained on the public Sleep Health & Lifestyle dataset using logistic regression
                to evaluate risk factors against reported sleep disorder prevalence (insomnia & sleep apnea).
              </Text>
              <View style={styles.modelMetricsRow}>
                <View style={styles.modelMetricBadge}>
                  <Text style={styles.modelMetricVal}>
                    {(riskAssessment?.metrics.cv_accuracy ? (riskAssessment.metrics.cv_accuracy * 100).toFixed(1) : '78.7')}%
                  </Text>
                  <Text style={styles.modelMetricLabel}>5-Fold CV Accuracy</Text>
                </View>
                <View style={styles.modelMetricBadge}>
                  <Text style={styles.modelMetricVal}>
                    {riskAssessment?.metrics.cv_roc_auc ?? '0.782'}
                  </Text>
                  <Text style={styles.modelMetricLabel}>ROC-AUC Score</Text>
                </View>
                <View style={styles.modelMetricBadge}>
                  <Text style={styles.modelMetricVal}>
                    {riskAssessment?.metrics.rows_used ?? 122}
                  </Text>
                  <Text style={styles.modelMetricLabel}>Unique Rows</Text>
                </View>
              </View>
              <Text style={styles.aboutDisclaimerText}>
                {riskAssessment?.disclaimer ||
                  'Lifestyle risk indicator trained on a small public dataset. Not a medical diagnosis.'}
              </Text>
            </View>
          )}

          {/* Always-on disclaimer */}
          <View style={styles.alwaysDisclaimerRow}>
            <MaterialIcons name="info-outline" size={13} color={colors.outline} />
            <Text style={styles.alwaysDisclaimerText}>
              Lifestyle risk indicator, not medical advice.
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
          </View>

          {/* Heart Rate Trend Chart Card */}
          <View style={styles.chartCard}>
            <View style={styles.chartCardHeader}>
              <View>
                <Text style={styles.chartCardLabel}>Resting Heart Rate</Text>
                <View style={styles.avgBpmRow}>
                  <Text style={styles.avgBpmVal}>{avgHeartRate}</Text>
                  <Text style={styles.avgBpmUnit}>BPM avg (60-80 range)</Text>
                </View>
              </View>

              <View style={styles.minMaxRow}>
                <Text style={styles.minText}>
                  <Text style={{ color: colors.tertiary, fontWeight: '700' }}>MIN </Text>
                  {minHeartRate}
                </Text>
                <Text style={styles.maxText}>
                  <Text style={{ color: colors.error, fontWeight: '700' }}>MAX </Text>
                  {maxHeartRate}
                </Text>
              </View>
            </View>

            {hasHeartRates ? (
              <LineChart points={realHeartRatePoints} height={120} />
            ) : (
              <View style={styles.emptyChartBox}>
                <Text style={styles.emptyChartText}>
                  No heart rate readings recorded today.{'\n'}Sync your watch or log a reading in Digital Twin.
                </Text>
              </View>
            )}
          </View>

          {/* Stress Levels Chart Card */}
          <View style={styles.chartCard}>
            <View style={styles.stressHeader}>
              <Text style={styles.stressTitle}>Stress Levels</Text>
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>Coming soon</Text>
              </View>
            </View>

            <View style={styles.emptyStressBox}>
              <MaterialIcons name="schedule" size={24} color={colors.outline} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyStressTitle}>Continuous Stress Telemetry</Text>
              <Text style={styles.emptyStressDesc}>
                Stress index estimation from continuous heart rate variability is coming soon.
              </Text>
            </View>
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
              <Text style={styles.anomaliesCount}>{anomalies.length} Events</Text>
            </View>
          </View>

          {anomalies.length === 0 ? (
            <View style={styles.emptyEventsBox}>
              <MaterialIcons name="check-circle-outline" size={30} color={colors.tertiary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyEventsTitle}>No unusual events detected</Text>
              <Text style={styles.emptyEventsDesc}>
                Biometric readings and physiological parameters remain within normal baseline ranges.
              </Text>
            </View>
          ) : (
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
          )}
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
          </View>

          {recommendations.length === 0 ? (
            <View style={styles.emptyEventsBox}>
              <MaterialIcons name="lightbulb-outline" size={30} color={colors.primary} style={{ marginBottom: 6 }} />
              <Text style={styles.emptyEventsTitle}>No suggestions yet</Text>
              <Text style={styles.emptyEventsDesc}>
                Personalized suggestions will appear as you record steps, sleep, and heart rate readings.
              </Text>
            </View>
          ) : (
            <>
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
            </>
          )}
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
    fontSize: 10,
    fontWeight: '600',
  },
  scaleMid: {
    ...typography.bodySm,
    color: colors.warning,
    fontSize: 10,
    fontWeight: '600',
  },
  scaleEnd: {
    ...typography.bodySm,
    color: colors.error,
    fontSize: 10,
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
  reasonsContainer: {
    gap: 6,
    paddingTop: 2,
  },
  factorSectionTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  factorRows: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  factorPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 191, 36, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
  },
  factorPillText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '600',
  },
  whatHelpsBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(69, 223, 164, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(69, 223, 164, 0.2)',
  },
  whatHelpsText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 11.5,
    flex: 1,
  },
  whatHelpsBold: {
    fontWeight: '700',
    color: colors.tertiary,
  },
  sourcesContainer: {
    gap: 6,
    paddingTop: 2,
  },
  sourcesLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10.5,
    color: colors.outline,
    fontWeight: '600',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  sourceChip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  sourceChipText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    color: colors.onSurfaceVariant,
  },
  sourceChipBold: {
    fontWeight: '700',
    color: colors.primary,
  },
  aboutToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    marginTop: 2,
  },
  aboutToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  aboutToggleText: {
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
    fontSize: 11.5,
    fontWeight: '600',
  },
  aboutModelBox: {
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    borderRadius: radii.md,
    padding: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.15)',
  },
  aboutModelDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    lineHeight: 16,
  },
  modelMetricsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'space-between',
  },
  modelMetricBadge: {
    flex: 1,
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: 6,
    paddingHorizontal: 6,
    borderRadius: radii.sm,
    alignItems: 'center',
  },
  modelMetricVal: {
    fontFamily: 'SpaceGrotesk_700Bold',
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  modelMetricLabel: {
    ...typography.labelCapsXs,
    color: colors.outline,
    fontSize: 8,
    marginTop: 2,
    textAlign: 'center',
  },
  aboutDisclaimerText: {
    ...typography.bodySm,
    color: colors.outline,
    fontSize: 10,
    fontStyle: 'italic',
  },
  alwaysDisclaimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  alwaysDisclaimerText: {
    fontFamily: 'Inter_400Regular',
    color: colors.outline,
    fontSize: 10,
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
  emptyChartBox: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  emptyChartText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  emptyStressBox: {
    height: 110,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  emptyStressTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyStressDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyEventsBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.md,
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
    marginTop: 6,
  },
  emptyEventsTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptyEventsDesc: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
  },
});
