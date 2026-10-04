import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AppHeader from '../../components/AppHeader';
import BodyFigure, { Organ } from '../../components/BodyFigure';
import { colors, radius, space, type } from '../../theme/tokens';
import { getCurrentVitals, CurrentVitals, VitalMetric } from '../../src/services/vitals';
import { saveManualReading } from '../../src/services/manualReadings';

// Toggle for SpO2 sensor support
const showSpO2 = true;
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
  hasValue: boolean;
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
    return `Today, ${timeStr}`;
  }
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  return `${monthNames[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
}

function formatRelativeSync(vitals: CurrentVitals | null): string {
  if (!vitals || !vitals.hasData || !vitals.latestTimestamp) {
    return 'No data yet';
  }
  const diffMinutes = Math.max(
    0,
    Math.floor((Date.now() - new Date(vitals.latestTimestamp).getTime()) / (60 * 1000))
  );

  if (vitals.isRecent) {
    const timeAgo = diffMinutes <= 1 ? 'Just now' : `${diffMinutes}m ago`;
    return `${vitals.latestSource || 'Watch'} • Synced ${timeAgo}`;
  }
  return `Last reading: ${formatTimestamp(vitals.latestTimestamp)}`;
}

function Meter({ m }: { m: MeterData }) {
  const pct = (v: number) => Math.min(100, Math.max(0, ((v - m.min) / (m.max - m.min)) * 100));
  return (
    <View>
      <View style={s.meterLabels}>
        <Text style={s.labelSm}>{m.caption}</Text>
      </View>
      <View style={s.meter}>
        <View style={{ width: `${pct(m.from)}%`, backgroundColor: colors.cardHigh }} />
        <View style={{ width: `${pct(m.to) - pct(m.from)}%`, backgroundColor: colors.teal + '4d' }} />
        <View style={{ flex: 1, backgroundColor: colors.amber + '4d' }} />
        {m.hasValue && <View style={[s.pip, { left: `${pct(m.value)}%` }]} />}
      </View>
      <View style={s.spread}>
        <Text style={s.labelSm}>{m.min}</Text>
        <Text style={[s.labelSm, { color: colors.green }]}>{m.label}</Text>
        <Text style={s.labelSm}>{m.max}</Text>
      </View>
    </View>
  );
}

function BodyLabel({
  id,
  sel,
  onPress,
  side,
  pillText,
  dotColor,
}: {
  id: Organ;
  sel: Organ;
  onPress: () => void;
  side: 'left' | 'right';
  pillText: string;
  dotColor: string;
}) {
  const tabNames: Record<Organ, string> = {
    heart: 'Heart',
    brain: 'Brain',
    lungs: 'Lungs',
  };
  const topPositions: Record<Organ, number> = {
    heart: 0.3,
    brain: 0.1,
    lungs: 0.3,
  };
  const active = sel === id;

  return (
    <Pressable
      onPress={onPress}
      style={[
        s.label,
        {
          top: BODY_H * topPositions[id] - 20,
          [side]: 0,
          alignItems: side === 'left' ? 'flex-end' : 'flex-start',
        },
      ]}
    >
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: dotColor }]} />
        <Text style={s.labelName}>{tabNames[id]}</Text>
      </View>
      <View style={[s.pill, active && { backgroundColor: colors.teal }]}>
        <Text
          numberOfLines={1}
          style={[s.pillText, { color: active ? colors.onTeal : dotColor }]}
        >
          {pillText}
        </Text>
      </View>
    </Pressable>
  );
}

export default function Twin() {
  const [sel, setSel] = useState<Organ>('heart');
  const [vitals, setVitals] = useState<CurrentVitals | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Manual Log Reading Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [inputBpm, setInputBpm] = useState('');
  const [inputSpo2, setInputSpo2] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVitals = useCallback(async () => {
    try {
      const data = await getCurrentVitals();
      setVitals(data);
    } catch (err) {
      console.warn('[TwinScreen] Failed to load current vitals:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVitals();
  }, [loadVitals]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadVitals();
  }, [loadVitals]);

  const handleSaveReading = async () => {
    if (!inputBpm.trim() && !inputSpo2.trim()) {
      Alert.alert('Empty Input', 'Please enter at least Heart Rate or SpO2 value.');
      return;
    }

    const bpmNum = inputBpm.trim() ? Number(inputBpm.trim()) : null;
    const spo2Num = inputSpo2.trim() ? Number(inputSpo2.trim()) : null;

    if (bpmNum !== null && (isNaN(bpmNum) || bpmNum < 30 || bpmNum > 240)) {
      Alert.alert('Invalid Heart Rate', 'Please enter a valid heart rate between 30 and 240 bpm.');
      return;
    }

    if (spo2Num !== null && (isNaN(spo2Num) || spo2Num < 50 || spo2Num > 100)) {
      Alert.alert('Invalid SpO2', 'Please enter a valid oxygen percentage between 50% and 100%.');
      return;
    }

    try {
      setSaving(true);
      await saveManualReading({
        heartRate: bpmNum,
        spo2: spo2Num,
      });
      setInputBpm('');
      setInputSpo2('');
      setModalVisible(false);
      await loadVitals();
    } catch (err) {
      Alert.alert('Error', 'Failed to save vital reading. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Heart Rate calculations
  const hrData: VitalMetric<number> | null = vitals?.heartRate || null;
  const hrValueStr = hrData ? `${hrData.value}` : '--';
  const hrIsElevated = hrData ? hrData.value > 100 : false;
  const hrIsLow = hrData ? hrData.value < 60 : false;
  const hrStatus = !hrData
    ? 'No data yet'
    : hrIsElevated
    ? 'Elevated'
    : hrIsLow
    ? 'Low'
    : 'Normal';
  const hrStatusColor = !hrData
    ? colors.outline
    : hrIsElevated
    ? colors.amber
    : colors.green;
  const hrStatusBg = !hrData
    ? colors.cardHigh
    : hrIsElevated
    ? colors.amber + '26'
    : colors.green + '26';
  const hrRange = !hrData
    ? 'No data yet'
    : hrIsElevated
    ? 'Elevated range (>100 bpm)'
    : hrIsLow
    ? 'Low resting range (<60 bpm)'
    : 'Optimal range (60-100 bpm)';
  const hrSourceText = hrData
    ? `${hrData.source} • ${formatTimestamp(hrData.timestamp)}`
    : 'No data yet';
  const hrMeter: MeterData = {
    min: 40,
    max: 140,
    from: 60,
    to: 100,
    value: hrData ? hrData.value : 70,
    label: '60 - 100 (Normal)',
    caption: hrData ? 'Resting heart rate range' : 'Awaiting heart rate readings',
    hasValue: hrData !== null,
  };
  const hrDescription = !hrData
    ? 'No heart rate readings detected yet. Connect Health Connect or log your watch reading.'
    : hrIsElevated
    ? 'Your heart rate is currently elevated above normal resting levels.'
    : hrIsLow
    ? 'Your resting heart rate is low and steady.'
    : 'Your heart rate is steady right now within the normal healthy range.';

  // SpO2 calculations
  const spo2Data: VitalMetric<number> | null = vitals?.spo2 || null;
  const spo2ValueStr = spo2Data ? `${spo2Data.value}` : '--';
  const spo2IsLow = spo2Data ? spo2Data.value < 95 : false;
  const spo2Status = !spo2Data ? 'No data yet' : spo2IsLow ? 'Low' : 'Normal';
  const spo2StatusColor = !spo2Data
    ? colors.outline
    : spo2IsLow
    ? colors.amber
    : colors.green;
  const spo2StatusBg = !spo2Data
    ? colors.cardHigh
    : spo2IsLow
    ? colors.amber + '26'
    : colors.green + '26';
  const spo2Range = !spo2Data
    ? 'No data yet'
    : spo2IsLow
    ? 'Low oxygen (<95%)'
    : 'Normal range (95-100%)';
  const spo2SourceText = spo2Data
    ? `${spo2Data.source} • ${formatTimestamp(spo2Data.timestamp)}`
    : 'No data yet';
  const spo2Meter: MeterData = {
    min: 85,
    max: 100,
    from: 95,
    to: 100,
    value: spo2Data ? spo2Data.value : 95,
    label: '95 - 100 (Normal)',
    caption: spo2Data ? 'Blood oxygen saturation' : 'Awaiting SpO2 readings',
    hasValue: spo2Data !== null,
  };
  const spo2Description = !spo2Data
    ? 'No SpO2 readings recorded yet. Tap "Log reading" to enter your watch readings.'
    : spo2IsLow
    ? 'Your blood oxygen is slightly low. Take deep, steady breaths.'
    : 'Your blood oxygen looks normal. No dips detected.';

  // Brain calculations (Stress model)
  const brainMeter: MeterData = {
    min: 0,
    max: 100,
    from: 0,
    to: 40,
    value: 38,
    label: '0 - 40 (Calm)',
    caption: 'Stress scale',
    hasValue: true,
  };

  // Organ dynamic configuration
  const organConfig = {
    heart: {
      tab: 'Heart',
      hint: '(Pulse)',
      icon: 'heart-pulse',
      title: 'Heart status',
      source: hrSourceText,
      value: hrValueStr,
      unit: 'bpm',
      status: hrStatus,
      statusColor: hrStatusColor,
      statusBg: hrStatusBg,
      statusIcon: hrData
        ? hrIsElevated
          ? 'alert-circle-outline'
          : 'check-circle-outline'
        : 'help-circle-outline',
      range: hrRange,
      pill: hrData ? `${hrData.value} bpm` : 'No data',
      dot: hrData ? (hrIsElevated ? colors.amber : colors.teal) : colors.outline,
      meter: hrMeter,
      text: hrDescription,
      hasData: hrData !== null,
    },
    brain: {
      tab: 'Brain',
      hint: '(Stress)',
      icon: 'brain',
      title: 'Brain status',
      source: 'Autonomic nervous system model',
      value: '38',
      unit: '/ 100',
      status: 'Mild',
      statusColor: colors.amber,
      statusBg: colors.amber + '26',
      statusIcon: 'check-circle-outline',
      range: 'Calm range',
      pill: 'Stress: Mild',
      dot: colors.amber,
      meter: brainMeter,
      text: 'Your stress level is mild right now. Short breaks can help keep it low.',
      hasData: true,
    },
    lungs: {
      tab: 'Lungs',
      hint: '(Oxygen)',
      icon: 'weather-windy',
      title: 'Lung status',
      source: spo2SourceText,
      value: spo2ValueStr,
      unit: '%',
      status: spo2Status,
      statusColor: spo2StatusColor,
      statusBg: spo2StatusBg,
      statusIcon: spo2Data
        ? spo2IsLow
          ? 'alert-circle-outline'
          : 'check-circle-outline'
        : 'help-circle-outline',
      range: spo2Range,
      pill: spo2Data ? `SpO2: ${spo2Data.value}%` : 'No data',
      dot: spo2Data ? (spo2IsLow ? colors.amber : colors.green) : colors.outline,
      meter: spo2Meter,
      text: spo2Description,
      hasData: spo2Data !== null,
    },
  };

  const o = organConfig[sel];
  const headerSyncText = formatRelativeSync(vitals);

  return (
    <View style={s.screen}>
      <AppHeader syncText={headerSyncText} />

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
        {/* Header Title & Sync Badge */}
        <View style={s.spread}>
          <Text style={s.h1}>Your Digital Twin</Text>
          {vitals?.isRecent ? (
            <View style={s.live}>
              <View style={[s.dot, { backgroundColor: colors.green }]} />
              <Text style={s.liveText}>Live sync</Text>
            </View>
          ) : vitals?.hasData && vitals.latestTimestamp ? (
            <View style={[s.live, { backgroundColor: colors.amber + '26' }]}>
              <View style={[s.dot, { backgroundColor: colors.amber }]} />
              <Text style={[s.liveText, { color: colors.amber }]}>
                Last reading: {formatTimestamp(vitals.latestTimestamp)}
              </Text>
            </View>
          ) : (
            <View style={[s.live, { backgroundColor: colors.cardHigh }]}>
              <View style={[s.dot, { backgroundColor: colors.outline }]} />
              <Text style={[s.liveText, { color: colors.textDim }]}>No data yet</Text>
            </View>
          )}
        </View>

        <View style={s.subRow}>
          <Text style={s.body}>A simple model of your body based on your watch readings</Text>
          <Pressable
            style={s.logBtnTop}
            onPress={() => setModalVisible(true)}
            android_ripple={{ color: colors.teal + '40' }}
          >
            <Icon name="pencil-plus-outline" size={16} color={colors.teal} />
            <Text style={s.logBtnTopText}>Log reading</Text>
          </Pressable>
        </View>

        {/* Empty State Banner if no data at all */}
        {!loading && !vitals?.hasData && (
          <View style={s.emptyCard}>
            <View style={s.row}>
              <Icon name="information-outline" size={20} color={colors.amber} />
              <Text style={s.emptyTitle}>No data yet</Text>
            </View>
            <Text style={s.emptySub}>
              Health Connect has no recent readings and no manual entries exist.
            </Text>
            <Pressable
              style={s.logActionBtn}
              onPress={() => setModalVisible(true)}
            >
              <Icon name="plus" size={18} color={colors.onTeal} />
              <Text style={s.logActionBtnText}>Log reading</Text>
            </Pressable>
          </View>
        )}

        {/* Body Figure Visualization Card */}
        <View
          style={[
            s.card,
            { height: BODY_H + 2 * space.md, flexDirection: 'row', alignItems: 'center' },
          ]}
        >
          <View style={s.side}>
            <BodyLabel
              id="brain"
              sel={sel}
              side="right"
              pillText={organConfig.brain.pill}
              dotColor={organConfig.brain.dot}
              onPress={() => setSel('brain')}
            />
            {showSpO2 && (
              <BodyLabel
                id="lungs"
                sel={sel}
                side="right"
                pillText={organConfig.lungs.pill}
                dotColor={organConfig.lungs.dot}
                onPress={() => setSel('lungs')}
              />
            )}
          </View>
          <BodyFigure selected={sel} width={BODY_W} />
          <View style={s.side}>
            <BodyLabel
              id="heart"
              sel={sel}
              side="left"
              pillText={organConfig.heart.pill}
              dotColor={organConfig.heart.dot}
              onPress={() => setSel('heart')}
            />
          </View>
        </View>

        {/* Organ Selector Tabs */}
        <View style={s.tabs}>
          {order.map((id) => (
            <Pressable
              key={id}
              onPress={() => setSel(id)}
              style={[s.tab, sel === id && { backgroundColor: colors.teal }]}
            >
              <Text
                style={[
                  s.tabName,
                  { color: sel === id ? colors.onTeal : colors.textDim },
                ]}
              >
                {organConfig[id].tab}
              </Text>
              <Text
                style={[
                  s.tabHint,
                  { color: sel === id ? colors.onTeal : colors.outline },
                ]}
              >
                {organConfig[id].hint}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Selected Organ Detail Card */}
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
            <View style={[s.status, { backgroundColor: o.statusBg }]}>
              <Icon name={o.statusIcon as any} size={14} color={o.statusColor} />
              <Text style={[s.labelSm, { color: o.statusColor }]}>{o.status}</Text>
            </View>
          </View>

          <View style={s.hero}>
            <Text style={s.heroValue}>
              {o.value} <Text style={s.heroUnit}>{o.unit}</Text>
            </Text>
            <View style={s.row}>
              <Icon
                name={o.hasData ? 'check-decagram-outline' : 'help-circle-outline'}
                size={18}
                color={o.statusColor}
              />
              <Text style={[s.label2, { color: o.statusColor }]}>{o.range}</Text>
            </View>
          </View>

          <Meter m={o.meter} />

          <View
            style={[
              s.hero,
              { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
            ]}
          >
            <Icon
              name={o.hasData ? 'emoticon-happy-outline' : 'information-outline'}
              size={20}
              color={colors.primary}
            />
            <Text style={[s.body, { flex: 1, marginTop: 0, color: colors.text }]}>
              {o.text}
            </Text>
          </View>

          {/* Bottom Source & Timestamp info */}
          <View style={[s.spread, { marginTop: space.sm }]}>
            <View style={s.row}>
              <Icon name="watch" size={16} color={colors.outline} />
              <Text style={s.labelSm}>{o.source}</Text>
            </View>
            <Pressable onPress={() => setModalVisible(true)}>
              <Icon name="square-edit-outline" size={18} color={colors.teal} />
            </Pressable>
          </View>
        </View>

        {/* Sleep Area (Requirement 6) */}
        <View style={s.card}>
          <View style={s.spread}>
            <View style={s.row}>
              <View
                style={[
                  s.iconBox,
                  { backgroundColor: colors.teal + '1a' },
                ]}
              >
                <Icon name="bed-clock" size={24} color={colors.teal} />
              </View>
              <View>
                <Text style={s.h3}>Sleep Telemetry</Text>
                <Text style={s.labelSm}>Autonomous sleep sync</Text>
              </View>
            </View>
            <View style={[s.status, { backgroundColor: colors.teal + '26' }]}>
              <Icon name="clock-outline" size={14} color={colors.teal} />
              <Text style={[s.labelSm, { color: colors.teal }]}>Scheduled</Text>
            </View>
          </View>

          <View style={[s.hero, { flexDirection: 'row', alignItems: 'center' }]}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={s.sleepTitle}>Waiting for Aura's call</Text>
              <Text style={s.sleepSub}>
                Sleep will come from the calling agent later.
              </Text>
            </View>
            <Icon name="phone-incoming-outline" size={26} color={colors.teal} />
          </View>
        </View>
      </ScrollView>

      {/* Manual Log Reading Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={s.modalOverlay}
        >
          <View style={s.modalContainer}>
            <View style={s.modalHeader}>
              <View style={s.row}>
                <View style={[s.iconBox, { width: 36, height: 36 }]}>
                  <Icon name="clipboard-pulse-outline" size={20} color={colors.teal} />
                </View>
                <Text style={s.modalTitle}>Log Watch Reading</Text>
              </View>
              <Pressable onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={colors.outline} />
              </Pressable>
            </View>

            <Text style={s.modalSub}>
              Enter vitals measured from your watch sensor. Real timestamps and source will update automatically.
            </Text>

            {/* Input 1: Heart Rate */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Heart Rate (bpm)</Text>
              <View style={s.inputWrapper}>
                <Icon name="heart-pulse" size={20} color={colors.teal} />
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. 72"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={inputBpm}
                  onChangeText={setInputBpm}
                  maxLength={3}
                />
                <Text style={s.inputUnit}>bpm</Text>
              </View>
            </View>

            {/* Input 2: SpO2 */}
            <View style={s.inputGroup}>
              <Text style={s.inputLabel}>Blood Oxygen (SpO2 %)</Text>
              <View style={s.inputWrapper}>
                <Icon name="weather-windy" size={20} color={colors.green} />
                <TextInput
                  style={s.textInput}
                  placeholder="e.g. 98"
                  placeholderTextColor={colors.outline}
                  keyboardType="numeric"
                  value={inputSpo2}
                  onChangeText={setInputSpo2}
                  maxLength={3}
                />
                <Text style={s.inputUnit}>%</Text>
              </View>
            </View>

            {/* Modal Actions */}
            <View style={s.modalActions}>
              <Pressable
                style={[s.modalBtn, s.cancelBtn]}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, s.saveBtn]}
                onPress={handleSaveReading}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.onTeal} />
                ) : (
                  <>
                    <Icon name="check" size={18} color={colors.onTeal} />
                    <Text style={s.saveBtnText}>Save reading</Text>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  spread: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.md,
  },
  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.amber + '40',
  },
  emptyTitle: { ...type.title, color: colors.amber, fontWeight: '600' },
  emptySub: { ...type.body, color: colors.textDim, fontSize: 13 },
  logActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    borderRadius: radius.md,
    paddingVertical: 10,
    marginTop: space.xs,
  },
  logActionBtnText: { ...type.label, color: colors.onTeal, fontWeight: '600' },
  logBtnTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal + '20',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  logBtnTopText: { ...type.labelSm, color: colors.teal, fontWeight: '600' },
  live: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.green + '26',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveText: { ...type.labelSm, color: colors.green },
  side: { flex: 1, height: BODY_H },
  label: { position: 'absolute', left: 0, right: 0, gap: 4 },
  labelName: { ...type.title, color: colors.text, fontWeight: '600' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pill: {
    backgroundColor: colors.cardHigh,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  pillText: { ...type.labelSm, fontWeight: '600' },
  tabs: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: 4,
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm },
  tabName: { ...type.label },
  tabHint: { ...type.labelSm },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  hero: {
    backgroundColor: colors.cardLow,
    borderRadius: radius.md,
    padding: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroValue: { fontSize: 36, lineHeight: 44, fontWeight: '700', color: colors.text },
  heroUnit: { ...type.title, color: colors.textDim },
  meterLabels: { marginBottom: 6 },
  meter: {
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    flexDirection: 'row',
    backgroundColor: colors.cardHigh,
  },
  pip: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 6,
    marginLeft: -3,
    borderRadius: 3,
    backgroundColor: colors.teal,
  },
  sleepTitle: { ...type.title, color: colors.text, fontWeight: '600' },
  sleepSub: { ...type.body, color: colors.textDim, fontSize: 13 },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: { ...type.headline, color: colors.text, fontSize: 18 },
  modalSub: { ...type.body, color: colors.textDim, fontSize: 13 },
  inputGroup: { gap: 6 },
  inputLabel: { ...type.labelSm, color: colors.text, fontWeight: '600' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.cardLow,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    height: 48,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.cardHigh,
  },
  textInput: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  inputUnit: { ...type.labelSm, color: colors.outline },
  modalActions: {
    flexDirection: 'row',
    gap: space.md,
    marginTop: space.sm,
  },
  modalBtn: {
    flex: 1,
    height: 46,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  cancelBtn: { backgroundColor: colors.cardHigh },
  cancelBtnText: { ...type.label, color: colors.textDim },
  saveBtn: { backgroundColor: colors.teal },
  saveBtnText: { ...type.label, color: colors.onTeal, fontWeight: '600' },
});

