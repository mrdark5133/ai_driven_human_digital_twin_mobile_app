import React, { useState } from 'react';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import BodyFigure, { Organ } from '../../components/BodyFigure';
import { colors, radius, space, type } from '../../theme/tokens';

// Toggle for SpO2 sensor support
const showSpO2 = true;

const organs = {
  heart: {
    tab: 'Heart',
    hint: '(Pulse)',
    icon: 'heart-pulse',
    title: 'Heart status',
    source: 'Heart rate sensor',
    value: '72',
    unit: 'bpm',
    status: 'Normal',
    range: 'Optimal range',
    pill: '72 bpm',
    dot: colors.teal,
    top: 0.3,
    meter: { min: 40, max: 120, from: 60, to: 80, value: 72, label: '60 - 80 (Ideal)', caption: 'Normal resting range' },
    text: 'Your heart rate is steady right now with no sudden spikes detected today.',
  },
  brain: {
    tab: 'Brain',
    hint: '(Stress)',
    icon: 'brain',
    title: 'Brain status',
    source: 'Stress estimate',
    value: '38',
    unit: '/ 100',
    status: 'Mild',
    range: 'Calm range',
    pill: 'Stress: Mild',
    dot: colors.amber,
    top: 0.1,
    meter: { min: 0, max: 100, from: 0, to: 40, value: 38, label: '0 - 40 (Calm)', caption: 'Stress scale' },
    text: 'Your stress level is mild right now. Short breaks can help keep it low.',
  },
  lungs: {
    tab: 'Lungs',
    hint: '(Oxygen)',
    icon: 'weather-windy',
    title: 'Lung status',
    source: 'Blood oxygen (SpO2)',
    value: '98',
    unit: '%',
    status: 'Normal',
    range: 'Normal range',
    pill: 'SpO2: 98%',
    dot: colors.green,
    top: 0.3,
    meter: { min: 85, max: 100, from: 95, to: 100, value: 98, label: '95 - 100 (Normal)', caption: 'Normal oxygen level' },
    text: 'Your blood oxygen looks normal. No dips detected today.',
  },
} as const;

const order: Organ[] = showSpO2 ? ['brain', 'heart', 'lungs'] : ['brain', 'heart'];
const BODY_W = 108;
const BODY_H = (BODY_W * 280) / 120;

interface MeterData {
  min: number;
  max: number;
  from: number;
  to: number;
  value: number;
  label: string;
  caption: string;
}

function Meter({ m }: { m: MeterData }) {
  const pct = (v: number) => ((v - m.min) / (m.max - m.min)) * 100;
  return (
    <View>
      <View style={s.meterLabels}><Text style={s.labelSm}>{m.caption}</Text></View>
      <View style={s.meter}>
        <View style={{ width: `${pct(m.from)}%`, backgroundColor: colors.cardHigh }} />
        <View style={{ width: `${pct(m.to) - pct(m.from)}%`, backgroundColor: colors.teal + '4d' }} />
        <View style={{ flex: 1, backgroundColor: colors.amber + '4d' }} />
        <View style={[s.pip, { left: `${pct(m.value)}%` }]} />
      </View>
      <View style={s.spread}>
        <Text style={s.labelSm}>{m.min}</Text>
        <Text style={[s.labelSm, { color: colors.green }]}>{m.label}</Text>
        <Text style={s.labelSm}>{m.max}</Text>
      </View>
    </View>
  );
}

function BodyLabel({ id, sel, onPress, side }: { id: Organ; sel: Organ; onPress: () => void; side: 'left' | 'right' }) {
  const o = organs[id];
  const active = sel === id;
  return (
    <Pressable onPress={onPress} style={[s.label, { top: BODY_H * o.top - 20, [side]: 0, alignItems: side === 'left' ? 'flex-end' : 'flex-start' }]}>
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: o.dot }]} />
        <Text style={s.labelName}>{o.tab}</Text>
      </View>
      <View style={[s.pill, active && { backgroundColor: colors.teal }]}>
        <Text numberOfLines={1} style={[s.pillText, { color: active ? colors.onTeal : o.dot }]}>{o.pill}</Text>
      </View>
    </Pressable>
  );
}

export default function Twin() {
  const [sel, setSel] = useState<Organ>('heart');
  const o = organs[sel];
  return (
    <View style={s.screen}>
      <AppHeader />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        <View style={s.spread}>
          <Text style={s.h1}>Your Digital Twin</Text>
          <View style={s.live}>
            <View style={[s.dot, { backgroundColor: colors.green }]} />
            <Text style={s.liveText}>Live sync</Text>
          </View>
        </View>
        <Text style={s.body}>A simple model of your body based on your watch readings</Text>

        <View style={[s.card, { height: BODY_H + 2 * space.md, flexDirection: 'row', alignItems: 'center' }]}>
          <View style={s.side}>
            <BodyLabel id="brain" sel={sel} side="right" onPress={() => setSel('brain')} />
            {showSpO2 && <BodyLabel id="lungs" sel={sel} side="right" onPress={() => setSel('lungs')} />}
          </View>
          <BodyFigure selected={sel} width={BODY_W} />
          <View style={s.side}>
            <BodyLabel id="heart" sel={sel} side="left" onPress={() => setSel('heart')} />
          </View>
        </View>

        <View style={s.tabs}>
          {order.map((id) => (
            <Pressable key={id} onPress={() => setSel(id)} style={[s.tab, sel === id && { backgroundColor: colors.teal }]}>
              <Text style={[s.tabName, { color: sel === id ? colors.onTeal : colors.textDim }]}>{organs[id].tab}</Text>
              <Text style={[s.tabHint, { color: sel === id ? colors.onTeal : colors.outline }]}>{organs[id].hint}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.card}>
          <View style={s.spread}>
            <View style={s.row}>
              <View style={s.iconBox}>
                <Icon name={o.icon as any} size={24} color={colors.primary} />
              </View>
              <View>
                <Text style={s.h3}>{o.title}</Text>
                <Text style={s.labelSm}>{o.source}</Text>
              </View>
            </View>
            <View style={s.status}>
              <Icon name="check-circle-outline" size={14} color={colors.green} />
              <Text style={[s.labelSm, { color: colors.green }]}>{o.status}</Text>
            </View>
          </View>

          <View style={s.hero}>
            <Text style={s.heroValue}>
              {o.value} <Text style={s.heroUnit}>{o.unit}</Text>
            </Text>
            <View style={s.row}>
              <Icon name="check-decagram-outline" size={18} color={colors.green} />
              <Text style={[s.label2, { color: colors.green }]}>{o.range}</Text>
            </View>
          </View>

          <Meter m={o.meter} />

          <View style={[s.hero, { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }]}>
            <Icon name="emoticon-happy-outline" size={20} color={colors.primary} />
            <Text style={[s.body, { flex: 1, marginTop: 0, color: colors.text }]}>{o.text}</Text>
          </View>

          <View style={[s.spread, { marginTop: space.md }]}>
            <View style={s.row}>
              <Icon name="watch" size={16} color={colors.outline} />
              <Text style={s.labelSm}>Measured by Noise ColorFit sensor</Text>
            </View>
            <Icon name="information-outline" size={16} color={colors.outline} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  content: { padding: space.md, gap: space.md, paddingBottom: space.xl + 40 },
  h1: { ...type.headline, color: colors.text },
  h3: { ...type.title, color: colors.text, fontWeight: '600' },
  body: { ...type.body, color: colors.textDim },
  label2: { ...type.label },
  labelSm: { ...type.labelSm, color: colors.textDim },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md, gap: space.md },
  live: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.green + '26', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  liveText: { ...type.labelSm, color: colors.green },
  side: { flex: 1, height: BODY_H },
  label: { position: 'absolute', left: 0, right: 0, gap: 4 },
  labelName: { ...type.title, color: colors.text, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: { backgroundColor: colors.cardHigh, borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  pillText: { ...type.labelSm, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: space.sm, backgroundColor: colors.card, borderRadius: radius.md, padding: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  tabName: { ...type.label },
  tabHint: { ...type.labelSm },
  iconBox: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '1a', alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.green + '26', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  hero: { backgroundColor: colors.cardLow, borderRadius: radius.md, padding: space.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroValue: { fontSize: 36, lineHeight: 44, fontWeight: '700', color: colors.text },
  heroUnit: { ...type.title, color: colors.textDim },
  meterLabels: { marginBottom: 6 },
  meter: { height: 12, borderRadius: 6, overflow: 'hidden', flexDirection: 'row', backgroundColor: colors.cardHigh },
  pip: { position: 'absolute', top: 0, bottom: 0, width: 6, marginLeft: -3, borderRadius: 3, backgroundColor: colors.teal },
});
