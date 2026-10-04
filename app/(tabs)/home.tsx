import React, { useState, useEffect, useCallback } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet, RefreshControl } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import AppHeader from '../../components/AppHeader';
import ScoreRing from '../../components/ScoreRing';
import { colors, radius, space, type } from '../../theme/tokens';
import { getCurrentVitals, CurrentVitals } from '../../src/services/vitals';
import {
  getTodaySteps,
  getTodayHeartRates,
  StepsDataPoint,
  HeartRateDataPoint,
} from '../../src/services/healthConnect';

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.tag, { backgroundColor: color + '26' }]}>
      <Text style={[s.tagText, { color }]}>{text}</Text>
    </View>
  );
}

function CardHead({
  icon,
  color,
  label,
  tag,
  tagColor,
}: {
  icon: any;
  color: string;
  label: string;
  tag?: string;
  tagColor?: string;
}) {
  return (
    <View style={s.cardHead}>
      <View style={s.row}>
        <Icon name={icon} size={18} color={color} />
        <Text style={s.cardLabel}>{label}</Text>
      </View>
      {tag ? <Tag text={tag} color={tagColor || colors.green} /> : null}
    </View>
  );
}

function formatTimestamp(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const formattedHour = hours % 12 || 12;
  const timeStr = `${formattedHour}:${minutes} ${ampm}`;

  if (isToday) {
    return timeStr;
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
}

function formatSyncHeader(
  vitals: CurrentVitals | null,
  stepsData: StepsDataPoint | null
): string {
  let latestTs: string | null = vitals?.latestTimestamp || null;
  let source: string | null = vitals?.latestSource || null;

  if (stepsData?.lastUpdated) {
    if (!latestTs || new Date(stepsData.lastUpdated).getTime() > new Date(latestTs).getTime()) {
      latestTs = stepsData.lastUpdated;
      source = 'Phone';
    }
  }

  if (!latestTs) {
    return 'No data yet';
  }

  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(latestTs).getTime()) / (60 * 1000))
  );
  if (diffMinutes < 10) {
    const timeAgo = diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    return `${source || 'Watch'} • Synced ${timeAgo}`;
  }
  return `Last reading: ${formatTimestamp(latestTs)}`;
}

export default function Home() {
  const [vitals, setVitals] = useState<CurrentVitals | null>(null);
  const [stepsData, setStepsData] = useState<StepsDataPoint | null>(null);
  const [todayHeartRates, setTodayHeartRates] = useState<HeartRateDataPoint[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [vitalsRes, stepsRes, hrHistoryRes] = await Promise.all([
        getCurrentVitals(),
        getTodaySteps(),
        getTodayHeartRates(),
      ]);
      setVitals(vitalsRes);
      setStepsData(stepsRes);
      setTodayHeartRates(hrHistoryRes);
    } catch (err) {
      console.warn('[HomeScreen] Failed to fetch real data:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // 1. Initial mount and periodic 60-second refresh
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, [loadData]);

  // 2. Refresh whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  // Heart Rate calculations
  const hr = vitals?.heartRate;
  const hrValue = hr ? `${hr.value}` : 'No data yet';
  const hrIsElevated = hr ? hr.value > 100 : false;
  const hrIsLow = hr ? hr.value < 60 : false;
  const hrTag = !hr
    ? 'No data'
    : hrIsElevated
    ? 'Elevated'
    : hrIsLow
    ? 'Low'
    : 'Normal';
  const hrTagColor = !hr
    ? colors.outline
    : hrIsElevated
    ? colors.amber
    : colors.green;
  const hrSubText = hr
    ? `${hr.source} • ${formatTimestamp(hr.timestamp)}`
    : 'Awaiting readings';

  // Generate SVG path for mini heart rate chart if >= 2 points
  let chartPath = '';
  let lastCirclePos = { cx: 0, cy: 0 };
  const hasChart = todayHeartRates && todayHeartRates.length >= 2;

  if (hasChart) {
    const minBpm = Math.min(...todayHeartRates.map((d) => d.bpm)) - 5;
    const maxBpm = Math.max(...todayHeartRates.map((d) => d.bpm)) + 5;
    const range = Math.max(10, maxBpm - minBpm);

    const points = todayHeartRates.map((pt, idx) => {
      const x = (idx / (todayHeartRates.length - 1)) * 120;
      const y = 26 - ((pt.bpm - minBpm) / range) * 22;
      return { x, y };
    });

    chartPath = points
      .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
      .join(' ');

    const last = points[points.length - 1];
    lastCirclePos = { cx: last.x, cy: last.y };
  }

  // Steps calculations
  const stepCount = stepsData?.count ?? null;
  const stepGoal = 10000;
  const stepPercent = stepCount !== null ? Math.min(100, Math.round((stepCount / stepGoal) * 100)) : 0;
  const headerSync = formatSyncHeader(vitals, stepsData);

  return (
    <View style={s.screen}>
      <AppHeader syncText={headerSync} />

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
        <View>
          <Text style={s.eyebrow}>{weekday} briefing</Text>
          <Text style={s.h1}>{greeting}, Dark</Text>
        </View>

        {/* Health Score Card with DEMO Tag */}
        <View style={[s.card, s.scoreCard]}>
          <View style={{ flex: 1 }}>
            <View style={s.scoreHeadRow}>
              <Text style={s.overall}>Overall status</Text>
              <Tag text="Demo" color={colors.amber} />
            </View>
            <Text style={s.h2}>Health score</Text>
            <Text style={[s.bodySm, { marginVertical: space.sm }]}>
              Demo score • Risk model in training
            </Text>
            <View style={s.pill}>
              <View style={s.pillDot} />
              <Text style={[s.label, { color: colors.primary }]}>Baseline reference</Text>
            </View>
          </View>
          <ScoreRing score={78} />
        </View>

        {/* 2x2 Telemetry Grid */}
        <View style={s.grid}>
          {/* 1. Heart Rate Card */}
          <View style={s.cell}>
            <View>
              <CardHead
                icon="heart-outline"
                color={colors.red}
                label="Heart rate"
                tag={hrTag}
                tagColor={hrTagColor}
              />
              <Text style={s.value}>
                {hr ? hr.value : '--'}{' '}
                {hr ? <Text style={s.unit}>bpm</Text> : null}
              </Text>
              <Text style={s.bodySm}>{hrSubText}</Text>
            </View>

            {hasChart ? (
              <Svg
                height={32}
                width="100%"
                viewBox="0 0 120 30"
                preserveAspectRatio="none"
                style={{ marginTop: space.sm }}
              >
                <Path
                  d={chartPath}
                  fill="none"
                  stroke={colors.primary}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <Circle
                  cx={lastCirclePos.cx}
                  cy={lastCirclePos.cy}
                  r={3}
                  fill={colors.primary}
                />
              </Svg>
            ) : (
              <View style={s.noChartBox}>
                <Text style={s.noChartText}>
                  {hr ? 'Awaiting more points' : 'No chart data yet'}
                </Text>
              </View>
            )}
          </View>

          {/* 2. Sleep Card */}
          <View style={s.cell}>
            <View>
              <CardHead
                icon="weather-night"
                color={colors.amberText}
                label="Sleep"
                tag="Waiting"
                tagColor={colors.amberText}
              />
              <Text style={[s.value, { fontSize: 16, lineHeight: 22, marginTop: 6 }]}>
                Waiting for Aura's call
              </Text>
            </View>
            <Text style={s.labelSm}>Sleep will come from the calling agent</Text>
          </View>

          {/* 3. Steps Card */}
          <View style={s.cell}>
            <View>
              <CardHead
                icon="walk"
                color={colors.green}
                label="Steps (phone)"
                tag={stepCount !== null ? `${stepPercent}%` : undefined}
                tagColor={colors.green}
              />
              <Text style={s.value}>
                {stepCount !== null ? stepCount.toLocaleString('en-US') : 'No data yet'}
              </Text>
              <Text style={s.bodySm}>
                {stepsData?.lastUpdated
                  ? `Updated: ${formatTimestamp(stepsData.lastUpdated)}`
                  : 'Awaiting step data'}
              </Text>
            </View>
            <View style={{ marginTop: space.sm }}>
              <View style={s.track}>
                <View
                  style={{
                    width: `${stepPercent}%`,
                    backgroundColor: colors.green,
                  }}
                />
              </View>
              <View style={[s.spread, { marginTop: 6 }]}>
                <Text style={s.labelSm}>10,000 goal</Text>
                <Text style={[s.labelSm, { color: colors.green }]}>
                  {stepCount !== null ? `${stepPercent}%` : '--'}
                </Text>
              </View>
            </View>
          </View>

          {/* 4. Stress Card */}
          <View style={s.cell}>
            <View>
              <CardHead
                icon="spa-outline"
                color={colors.primary}
                label="Stress"
                tag="Pending"
                tagColor={colors.outline}
              />
              <Text style={[s.value, { fontSize: 18, lineHeight: 24, marginTop: 4 }]}>
                No data yet
              </Text>
              <Text style={s.bodySm}>Stress will be estimated later</Text>
            </View>
            <View style={{ marginTop: space.sm }}>
              <View style={[s.track, { backgroundColor: colors.cardHigh }]} />
              <View style={[s.spread, { marginTop: 6 }]}>
                <Text style={s.labelSm}>Calm</Text>
                <Text style={s.labelSm}>Peak</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Neutral Tip Card */}
        <View style={[s.card, s.alertRow]}>
          <View style={[s.alertIcon, { backgroundColor: colors.primary + '1a' }]}>
            <Icon name="lightbulb-on-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.cardHead}>
              <Text style={s.title}>Today's tip</Text>
              <Tag text="Recovery" color={colors.primary} />
            </View>
            <Text style={s.body}>
              Take a short walk or a 5-minute break to help lower stress.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl + 40 },
  eyebrow: { ...type.labelSm, color: colors.textDim, marginBottom: 2 },
  h1: { ...type.headline, color: colors.text },
  h2: { ...type.headlineMd, color: colors.text },
  title: { ...type.title, color: colors.text },
  body: { ...type.body, color: colors.textDim, marginTop: 4 },
  bodySm: { ...type.bodySm, color: colors.textDim },
  label: { ...type.label },
  labelSm: { ...type.labelSm, color: colors.textDim },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spread: { flexDirection: 'row', justifyContent: 'space-between' },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginBottom: 6,
  },
  cardLabel: { ...type.label, color: colors.text },
  alertRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  alertIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.amber + '26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { ...type.labelSm },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  scoreHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  overall: { ...type.labelSm, color: colors.primary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: colors.teal + '1a',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: {
    width: '47.5%',
    flexGrow: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.md,
    justifyContent: 'space-between',
    minHeight: 150,
  },
  value: { ...type.headlineMd, color: colors.text, marginVertical: 4 },
  unit: { ...type.bodySm, color: colors.textDim, fontWeight: '400' },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.cardHigh,
    overflow: 'hidden',
    flexDirection: 'row',
    marginTop: 6,
    justifyContent: 'flex-start',
  },
  noChartBox: {
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.cardLow,
    borderRadius: radius.sm,
    marginTop: space.sm,
  },
  noChartText: {
    ...type.labelSm,
    color: colors.outline,
    fontSize: 10,
  },
});
