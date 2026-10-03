import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import ScoreRing from '../../components/ScoreRing';
import { colors, radius, space, type } from '../../theme/tokens';

// Mock health state matching the design
const d = { score: 78, hr: 72, rhr: 64, sleep: '6h 40m', steps: 5840, goal: 10000, kcal: 280, stress: 38 };

function Tag({ text, color }: { text: string; color: string }) {
  return (
    <View style={[s.tag, { backgroundColor: color + '26' }]}>
      <Text style={[s.tagText, { color }]}>{text}</Text>
    </View>
  );
}

function CardHead({ icon, color, label, tag, tagColor }: { icon: any; color: string; label: string; tag?: string; tagColor?: string }) {
  return (
    <View style={s.cardHead}>
      <View style={s.row}>
        <Icon name={icon} size={18} color={color} />
        <Text style={s.cardLabel}>{label}</Text>
      </View>
      {tag ? <Tag text={tag} color={tagColor!} /> : null}
    </View>
  );
}

export default function Home() {
  const [showAlert, setShowAlert] = useState(true);
  const now = new Date();
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  const h = now.getHours();
  const greeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={s.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={s.eyebrow}>{weekday} briefing</Text>
          <Text style={s.h1}>{greeting}, Dark</Text>
        </View>

        {showAlert && (
          <View style={s.card}>
            <View style={s.alertRow}>
              <View style={s.alertIcon}>
                <Icon name="heart-outline" size={22} color={colors.amber} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={s.cardHead}>
                  <Text style={[s.title, { flex: 1 }]} numberOfLines={1}>Resting heart rate notice</Text>
                  <Tag text="Attention" color={colors.amberText} />
                </View>
                <Text style={s.body}>Your resting heart rate was higher than usual last night (74 bpm vs your normal 62 bpm). Make sure to stay hydrated today.</Text>
                <View style={[s.row, { marginTop: space.md }]}>
                  <Pressable style={s.btn}>
                    <Text style={[s.label, { color: colors.primary }]}>Learn more</Text>
                  </Pressable>
                  <Pressable style={s.btnGhost} onPress={() => setShowAlert(false)}>
                    <Text style={[s.label, { color: colors.outline }]}>Dismiss</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        )}

        <View style={[s.card, s.scoreCard]}>
          <View style={{ flex: 1 }}>
            <Text style={s.overall}>Overall status</Text>
            <Text style={s.h2}>Health score</Text>
            <Text style={[s.bodySm, { marginVertical: space.sm }]}>Fairly good • Sleep was a little short</Text>
            <View style={s.pill}>
              <View style={s.pillDot} />
              <Text style={[s.label, { color: colors.primary }]}>Optimal baseline</Text>
            </View>
          </View>
          <ScoreRing score={d.score} />
        </View>

        <View style={s.grid}>
          <View style={s.cell}>
            <View>
              <CardHead icon="heart-outline" color={colors.red} label="Heart rate" tag="Normal" tagColor={colors.green} />
              <Text style={s.value}>{d.hr} <Text style={s.unit}>bpm</Text></Text>
              <Text style={s.bodySm}>Resting: {d.rhr} bpm today</Text>
            </View>
            <Svg height={40} width="100%" viewBox="0 0 120 30" preserveAspectRatio="none" style={{ marginTop: space.sm }}>
              <Path d="M0,22 Q15,24 25,18 T50,20 T70,8 T90,16 T110,12 L120,15" fill="none" stroke={colors.primary} strokeWidth={2.5} strokeLinecap="round" />
              <Circle cx="118" cy="15" r="3" fill={colors.primary} />
            </Svg>
          </View>

          <View style={s.cell}>
            <View>
              <CardHead icon="weather-night" color={colors.amberText} label="Sleep" tag="Low" tagColor={colors.amberText} />
              <Text style={s.value}>{d.sleep}</Text>
              <View style={s.track}>
                <View style={{ width: '19%', backgroundColor: colors.amberText }} />
                <View style={{ width: '67%', backgroundColor: colors.primary }} />
                <View style={{ width: '14%', backgroundColor: colors.cardHigh }} />
              </View>
            </View>
            <Text style={s.labelSm}>Deep: 1h 15m • Light: 4h 30m • Awake: 55m</Text>
          </View>

          <View style={s.cell}>
            <View>
              <CardHead icon="walk" color={colors.green} label="Steps" />
              <Text style={s.value}>{d.steps.toLocaleString('en-US')}</Text>
              <Text style={s.bodySm}>{d.kcal} kcal burned</Text>
            </View>
            <View style={{ marginTop: space.sm }}>
              <View style={s.track}>
                <View style={{ width: `${(d.steps / d.goal) * 100}%`, backgroundColor: colors.green }} />
              </View>
              <View style={[s.spread, { marginTop: 6 }]}>
                <Text style={s.labelSm}>10,000 goal</Text>
                <Text style={[s.labelSm, { color: colors.green }]}>{Math.round((d.steps / d.goal) * 100)}%</Text>
              </View>
            </View>
          </View>

          <View style={s.cell}>
            <View>
              <CardHead icon="spa-outline" color={colors.primary} label="Stress" tag="Mild" tagColor={colors.green} />
              <Text style={s.value}>{d.stress} <Text style={s.unit}>/ 100</Text></Text>
              <Text style={s.bodySm}>Mostly relaxed today</Text>
            </View>
            <View style={{ marginTop: space.sm }}>
              <View style={[s.track, { backgroundColor: colors.green + '55' }]}>
                <View style={{ position: 'absolute', left: `${d.stress - 2}%`, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.text }} />
              </View>
              <View style={[s.spread, { marginTop: 6 }]}>
                <Text style={s.labelSm}>Calm</Text>
                <Text style={s.labelSm}>Peak</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[s.card, s.alertRow]}>
          <View style={[s.alertIcon, { backgroundColor: colors.primary + '1a' }]}>
            <Icon name="lightbulb-on-outline" size={22} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <View style={s.cardHead}>
              <Text style={s.title}>Today's tip</Text>
              <Tag text="Recovery" color={colors.primary} />
            </View>
            <Text style={s.body}>Take a 15-minute screen break before your afternoon class to help lower stress.</Text>
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
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm, marginBottom: 6 },
  cardLabel: { ...type.label, color: colors.text },
  alertRow: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  alertIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.amber + '26', alignItems: 'center', justifyContent: 'center' },
  btn: { backgroundColor: colors.cardHigh, borderRadius: radius.sm, paddingVertical: 6, paddingHorizontal: 14 },
  btnGhost: { paddingVertical: 6, paddingHorizontal: 12 },
  tag: { borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { ...type.labelSm },
  scoreCard: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  overall: { ...type.labelSm, color: colors.primary, marginBottom: 4 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: colors.teal + '1a', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  cell: { width: '47.5%', flexGrow: 1, backgroundColor: colors.card, borderRadius: radius.md, padding: space.md, justifyContent: 'space-between', minHeight: 150 },
  value: { ...type.headlineMd, color: colors.text, marginVertical: 4 },
  unit: { ...type.bodySm, color: colors.textDim, fontWeight: '400' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.cardHigh, overflow: 'hidden', flexDirection: 'row', marginTop: 6, justifyContent: 'flex-start' },
});
