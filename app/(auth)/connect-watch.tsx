import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../theme';
import { Sparkline } from '../../components/Sparkline';
import { DataService } from '../../services/dataService';

export default function ConnectWatchScreen() {
  const router = useRouter();
  const [autoStream, setAutoStream] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isPaired, setIsPaired] = useState(true);

  const handleSyncAndComplete = async () => {
    setIsSyncing(true);
    await DataService.triggerWatchSync();
    setIsSyncing(false);
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Bar */}
        <View style={styles.topHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Connect Watch</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Step 3 Header */}
        <View style={styles.stepHeaderRow}>
          <View style={styles.stepIndicator}>
            <View style={styles.stepDot} />
            <Text style={styles.stepTitle}>Step 3 of 3: Hardware Pairing</Text>
          </View>
          <Text style={styles.stepProgressText}>98% Configured</Text>
        </View>

        {/* Stepper Track */}
        <View style={styles.progressTrack}>
          <View style={styles.progressBar} />
        </View>

        {/* Smartwatch Device Pairing Pod */}
        <View style={styles.watchCard}>
          <View style={styles.watchHeaderRow}>
            <View style={styles.watchInfo}>
              <View style={styles.watchIconBox}>
                <MaterialIcons name="watch" size={26} color={colors.secondary} />
              </View>
              <View>
                <View style={styles.watchNameRow}>
                  <Text style={styles.watchName}>Noise ColorFit</Text>
                  <View style={styles.onlineDot} />
                </View>
                <Text style={styles.watchSubtitle}>Sync ready via Health Connect</Text>
              </View>
            </View>
            <View style={styles.bleBadge}>
              <Text style={styles.bleText}>BLE 5.3</Text>
            </View>
          </View>

          {/* Dynamic Pulse Sparkline Strip */}
          <View style={styles.streamStrip}>
            <View style={styles.streamLeft}>
              <MaterialIcons name="favorite" size={18} color={colors.error} />
              <View>
                <Text style={styles.streamLabel}>CONTINUOUS STREAM</Text>
                <Text style={styles.streamVal}>68 BPM • HRV 64ms</Text>
              </View>
            </View>
            <View style={styles.sparklineWrapper}>
              <Sparkline color={colors.primary} height={20} type="ecg" />
            </View>
          </View>

          {/* Auto-Stream Toggle */}
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Auto-Stream Telemetry</Text>
              <Text style={styles.toggleSubtitle}>Low-latency sync active</Text>
            </View>
            <Switch
              value={autoStream}
              onValueChange={setAutoStream}
              trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
              thumbColor={autoStream ? colors.primary : colors.outline}
            />
          </View>
        </View>

        {/* Health Connect Integration Banner */}
        <View style={styles.integrationCard}>
          <View style={styles.integrationLeft}>
            <View style={styles.integrationIcon}>
              <MaterialIcons name="cloud-sync" size={22} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.integrationTitle}>Health Connect Active</Text>
              <Text style={styles.integrationSubtitle}>Reads data from your watch</Text>
            </View>
          </View>
          <View style={styles.activePill}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>Connected</Text>
          </View>
        </View>

        {/* Real-time telemetry checks */}
        <View style={styles.checksCard}>
          <Text style={styles.checksHeader}>TELEMETRY STREAM READINESS</Text>

          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={16} color={colors.tertiary} />
            <Text style={styles.checkText}>Optical PPG sensor synchronized</Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={16} color={colors.tertiary} />
            <Text style={styles.checkText}>Zero-knowledge cryptographic handshakes confirmed</Text>
          </View>

          <View style={styles.checkItem}>
            <MaterialIcons name="check-circle" size={16} color={colors.tertiary} />
            <Text style={styles.checkText}>Digital Twin organ nodes pre-calibrated</Text>
          </View>
        </View>

        {/* Primary CTA */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleSyncAndComplete}
          disabled={isSyncing}
          activeOpacity={0.85}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#070e1c" />
          ) : (
            <>
              <MaterialIcons name="sync" size={20} color="#070e1c" />
              <Text style={styles.primaryBtnText}>Sync Biometrics & Open Twin</Text>
            </>
          )}
        </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  stepHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  stepTitle: {
    ...typography.labelCapsMd,
    color: colors.tertiary,
    fontWeight: '700',
  },
  stepProgressText: {
    ...typography.dataMono,
    color: colors.secondary,
    fontSize: 10,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.tertiary,
    borderRadius: radii.full,
  },
  watchCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xxl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(93, 230, 255, 0.25)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 4,
    gap: 14,
    marginBottom: 16,
  },
  watchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  watchInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  watchIconBox: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(93, 230, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  watchName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 16,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  watchSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 12,
    marginTop: 1,
  },
  bleBadge: {
    backgroundColor: 'rgba(93, 230, 255, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  bleText: {
    ...typography.dataMono,
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  streamStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    padding: 10,
    borderRadius: radii.md,
    gap: 8,
  },
  streamLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  streamVal: {
    ...typography.dataMono,
    color: colors.onSurface,
    fontSize: 11,
    fontWeight: '600',
  },
  sparklineWrapper: {
    width: 80,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  toggleTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  toggleSubtitle: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    fontSize: 9,
    textTransform: 'none',
  },
  integrationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    marginBottom: 16,
  },
  integrationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  integrationIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  integrationTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  integrationSubtitle: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(69, 223, 164, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tertiary,
  },
  activeText: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    fontSize: 9,
    fontWeight: '700',
  },
  checksCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    marginBottom: 24,
  },
  checksHeader: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    letterSpacing: 0.8,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 12,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryBtnText: {
    ...typography.labelCapsMd,
    color: '#070e1c',
    fontWeight: '700',
    fontSize: 12,
  },
});
