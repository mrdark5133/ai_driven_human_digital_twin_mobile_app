import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme/tokens';
import { computeRealDeviceRisks } from '../src/services/riskDataService';
import { RiskCategoryResult, RiskLevel, RiskInput } from '../src/services/riskEngine';

const CATEGORY_ICONS: Record<string, { icon: any; color: string }> = {
  Cardiovascular: { icon: 'heart-pulse', color: '#ffb4ab' },
  Metabolic: { icon: 'water-percent', color: '#ffd29f' },
  Respiratory: { icon: 'lungs', color: '#57f1db' },
  Lifestyle: { icon: 'weather-night', color: '#4edea3' },
};

export default function RiskDetailsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<RiskCategoryResult[]>([]);
  const [highestLevel, setHighestLevel] = useState<'Low' | 'Moderate' | 'Elevated' | null>(null);
  const [highestColor, setHighestColor] = useState<string>('#9CA3AF');
  const [inputs, setInputs] = useState<RiskInput | null>(null);

  const loadRisks = useCallback(async () => {
    try {
      const data = await computeRealDeviceRisks();
      setCategories(data.results);
      setHighestLevel(data.highestRiskLevel);
      setHighestColor(data.highestRiskColor);
      setInputs(data.inputs);
    } catch (err) {
      console.warn('[RiskDetails] Error computing risks:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRisks();
  }, [loadRisks]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRisks();
  }, [loadRisks]);

  return (
    <SafeAreaView style={s.safeArea} edges={['top']}>
      {/* Top Header */}
      <View style={s.topBar}>
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Icon name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={s.titleCenter}>
          <Text style={s.headerTitle}>Risk Assessment</Text>
          <Text style={s.headerSub}>Rule-based on-device engine</Text>
        </View>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.teal}
            colors={[colors.teal]}
          />
        }
      >
        {/* Overview Banner Card */}
        <View style={[s.card, s.bannerCard]}>
          <View style={s.bannerLeft}>
            <View style={s.badgeRow}>
              <View style={s.ruleBadge}>
                <Text style={s.ruleBadgeText}>RULE-BASED</Text>
              </View>
              <View style={s.zeroNetBadge}>
                <Text style={s.zeroNetText}>100% On-Device</Text>
              </View>
            </View>
            <Text style={s.bannerTitle}>Biometric & Lifestyle Triage</Text>
            <Text style={s.bannerDesc}>
              Evaluated using validated health heuristics from your phone step counter, Health
              Connect, Profile stats, and Pallavi call transcripts.
            </Text>
          </View>
          {highestLevel && (
            <View style={[s.levelPillLarge, { backgroundColor: highestColor + '20', borderColor: highestColor }]}>
              <View style={[s.pillDot, { backgroundColor: highestColor }]} />
              <Text style={[s.levelPillLargeText, { color: highestColor }]}>
                {highestLevel} Risk
              </Text>
            </View>
          )}
        </View>

        {/* 4 Category Cards */}
        {categories.map((cat) => {
          const catMeta = CATEGORY_ICONS[cat.category] || {
            icon: 'shield-check',
            color: colors.primary,
          };
          const isUnknown = cat.level === 'Unknown';
          const scorePercent = isUnknown ? 0 : Math.round(cat.score * 100);

          return (
            <View key={cat.category} style={s.card}>
              {/* Card Header */}
              <View style={s.catHeadRow}>
                <View style={s.catTitleGroup}>
                  <View style={[s.catIconBox, { backgroundColor: catMeta.color + '18' }]}>
                    <Icon name={catMeta.icon} size={20} color={catMeta.color} />
                  </View>
                  <View>
                    <Text style={s.catTitle}>{cat.category}</Text>
                    {!isUnknown && (
                      <Text style={s.catScoreText}>
                        Score: {cat.score.toFixed(2)} ({scorePercent}%)
                      </Text>
                    )}
                  </View>
                </View>

                {/* Level Pill */}
                <View style={s.levelPillCol}>
                  {isUnknown ? (
                    <View style={[s.levelPill, s.greyOutlinePill]}>
                      <View style={[s.pillDot, { backgroundColor: '#9CA3AF' }]} />
                      <Text style={[s.levelPillText, { color: '#9CA3AF' }]}>
                        Need data
                      </Text>
                    </View>
                  ) : cat.level === 'Low' && cat.confidence === 'partial' ? (
                    <View style={[s.levelPill, s.greyOutlinePill]}>
                      <View style={[s.pillDot, { backgroundColor: '#9CA3AF' }]} />
                      <Text style={[s.levelPillText, { color: '#9CA3AF' }]}>
                        Low (limited data)
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        s.levelPill,
                        {
                          backgroundColor: cat.color + '20',
                          borderColor: cat.color,
                        },
                      ]}
                    >
                      <View style={[s.pillDot, { backgroundColor: cat.color }]} />
                      <Text style={[s.levelPillText, { color: cat.color }]}>
                        {cat.level}
                      </Text>
                    </View>
                  )}

                  {!isUnknown && (cat.level === 'Moderate' || cat.level === 'Elevated') && cat.confidence === 'partial' ? (
                    <Text style={s.limitedDataSubText}>Based on limited data</Text>
                  ) : null}
                </View>
              </View>

              {/* Score Bar (only shown when not Unknown) */}
              {!isUnknown && (
                <View style={s.scoreBarContainer}>
                  <View style={s.track}>
                    <View
                      style={{
                        width: `${scorePercent}%`,
                        backgroundColor: cat.color,
                        height: '100%',
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <View style={s.scaleMarks}>
                    <Text style={s.scaleText}>0.05 Low</Text>
                    <Text style={s.scaleText}>0.35 Mod</Text>
                    <Text style={s.scaleText}>0.65+ Elevated</Text>
                  </View>
                </View>
              )}

              {/* Explanation */}
              <Text style={s.explanation}>{cat.explanation}</Text>

              {/* Drivers Section */}
              <View style={s.driversSection}>
                <Text style={s.sectionSubtitle}>EVALUATED RISK DRIVERS</Text>
                {cat.drivers.length > 0 ? (
                  cat.drivers.map((driver, idx) => (
                    <View key={idx} style={s.driverRow}>
                      <Icon name="arrow-right-drop-circle" size={14} color={cat.color} />
                      <Text style={s.driverText}>{driver}</Text>
                    </View>
                  ))
                ) : (
                  <View style={s.driverRow}>
                    <Icon name="check-circle-outline" size={14} color={colors.green} />
                    <Text style={[s.driverText, { color: colors.textDim }]}>
                      {isUnknown
                        ? 'No data points recorded yet for this category.'
                        : 'No elevated risk factors detected within this category.'}
                    </Text>
                  </View>
                )}
              </View>

              {/* Missing Data Line */}
              <View style={s.missingBox}>
                <View style={s.missingHead}>
                  <Icon
                    name={isUnknown ? 'alert-circle-outline' : 'information-outline'}
                    size={14}
                    color={isUnknown ? colors.amber : colors.outline}
                  />
                  <Text
                    style={[
                      s.missingLabel,
                      { color: isUnknown ? colors.amber : colors.outline },
                    ]}
                  >
                    {cat.missing.length > 0 ? 'Missing data' : 'Status'}
                  </Text>
                </View>
                <Text style={s.missingValue}>
                  {cat.missing.length > 0
                    ? `Needed: ${cat.missing.join(', ')}`
                    : 'All input parameters available'}
                </Text>
              </View>
            </View>
          );
        })}

        {/* Footer Disclaimer */}
        <View style={s.disclaimerBox}>
          <Icon name="shield-alert-outline" size={18} color={colors.outline} />
          <Text style={s.disclaimerText}>
            Educational estimate only. Not a medical diagnosis.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardHigh,
  },
  backBtn: {
    padding: space.xs,
  },
  titleCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  headerSub: {
    ...type.labelSm,
    color: colors.outline,
    fontSize: 11,
  },
  content: {
    padding: space.md,
    gap: space.md,
    paddingBottom: space.xl + 40,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.cardHigh,
    gap: space.sm,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLow,
  },
  bannerLeft: {
    flex: 1,
    paddingRight: space.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  ruleBadge: {
    backgroundColor: colors.primary + '26',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  ruleBadgeText: {
    ...type.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.5,
  },
  zeroNetBadge: {
    backgroundColor: colors.cardHigh,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  zeroNetText: {
    ...type.labelSm,
    color: colors.outline,
    fontSize: 9,
  },
  bannerTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
    fontSize: 15,
  },
  bannerDesc: {
    ...type.bodySm,
    color: colors.textDim,
    marginTop: 4,
    lineHeight: 18,
  },
  levelPillLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  levelPillLargeText: {
    ...type.labelSm,
    fontWeight: '700',
    fontSize: 12,
  },
  catHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  levelPillCol: {
    alignItems: 'flex-end',
  },
  greyOutlinePill: {
    backgroundColor: 'transparent',
    borderColor: '#9CA3AF',
    borderWidth: 1,
  },
  limitedDataSubText: {
    ...type.labelSm,
    color: colors.outline,
    fontSize: 9,
    marginTop: 2,
    textAlign: 'right',
  },
  catTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  catScoreText: {
    ...type.labelSm,
    color: colors.textDim,
    fontSize: 11,
    marginTop: 1,
  },
  levelPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
  },
  levelPillText: {
    ...type.labelSm,
    fontWeight: '700',
    fontSize: 11,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scoreBarContainer: {
    marginTop: 4,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardHigh,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  scaleMarks: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scaleText: {
    ...type.labelSm,
    color: colors.outline,
    fontSize: 9,
  },
  explanation: {
    ...type.bodySm,
    color: colors.textDim,
    lineHeight: 18,
  },
  driversSection: {
    gap: 6,
    backgroundColor: colors.cardLow,
    padding: space.sm,
    borderRadius: radius.sm,
  },
  sectionSubtitle: {
    ...type.labelSm,
    color: colors.outline,
    fontWeight: '700',
    fontSize: 10,
    letterSpacing: 0.5,
  },
  driverRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  driverText: {
    ...type.bodySm,
    color: colors.text,
    fontSize: 12,
    flex: 1,
    lineHeight: 17,
  },
  missingBox: {
    backgroundColor: 'rgba(21, 27, 42, 0.5)',
    padding: space.sm,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.outline,
    gap: 2,
  },
  missingHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  missingLabel: {
    ...type.labelSm,
    fontWeight: '700',
    fontSize: 10,
    textTransform: 'uppercase',
  },
  missingValue: {
    ...type.bodySm,
    color: colors.textDim,
    fontSize: 11,
  },
  disclaimerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
  },
  disclaimerText: {
    ...type.bodySm,
    color: colors.outline,
    fontSize: 11,
    textAlign: 'center',
  },
});
