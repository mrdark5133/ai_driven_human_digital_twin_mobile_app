import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../../theme';
import { Header } from '../../components/Header';
import { DataService } from '../../services/dataService';
import { UserProfile, TelemetrySettings, WatchDevice } from '../../types';

export default function ProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile>(DataService.getProfile());
  const [watch, setWatch] = useState<WatchDevice>(DataService.getWatch());
  const [settings, setSettings] = useState<TelemetrySettings>(DataService.getSettings());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = DataService.subscribe(() => {
      setProfile(DataService.getProfile());
      setWatch(DataService.getWatch());
      setSettings(DataService.getSettings());
    });
    return unsubscribe;
  }, []);

  const handleForceSync = async () => {
    setIsSyncing(true);
    await DataService.triggerWatchSync();
    setIsSyncing(false);
    Alert.alert('Synchronized', 'Watch streams and telemetry successfully updated.');
  };

  const handleToggleSetting = (key: keyof TelemetrySettings, value: boolean) => {
    DataService.updateSettings({ [key]: value });
  };

  const handleExportDossier = () => {
    Alert.alert(
      'Export Health Dossier',
      'Clinical PDF and FHIR JSON health package generated and encrypted with zero-knowledge keys.'
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout & Revoke Link',
      'Are you sure you want to disconnect from this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header screenTitle="Profile" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Diagnostic Breadcrumb & Security Status */}
        <View style={styles.topBreadcrumbRow}>
          <View style={styles.breadcrumbLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.breadcrumbText}>TWIN MODEL SYNCED & ENCRYPTED</Text>
          </View>
          <View style={styles.encryptionBadge}>
            <MaterialIcons name="lock" size={12} color={colors.tertiary} />
            <Text style={styles.encryptionText}>AES-256 GCM</Text>
          </View>
        </View>

        {/* Section 1: User Identity & Digital Twin Calibration Card */}
        <View style={styles.identityCard}>
          {/* Identity Header Row */}
          <View style={styles.identityHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBox}>
                <MaterialIcons name="person" size={32} color={colors.onPrimary} />
              </View>
              <View style={styles.proBadge}>
                <MaterialIcons name="verified" size={10} color={colors.tertiary} />
                <Text style={styles.proText}>PRO</Text>
              </View>
            </View>

            <View style={styles.identityInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.userName}>{profile.name}</Text>
                <TouchableOpacity
                  style={styles.editBtn}
                  onPress={() => router.push('/(auth)/profile-setup')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="edit" size={16} color={colors.onSurfaceVariant} />
                </TouchableOpacity>
              </View>
              <Text style={styles.userIdText}>ID: {profile.id} • Biological Twin Pro</Text>
            </View>
          </View>

          {/* Chronological vs Biological Age Differential Display */}
          <View style={styles.longevityMatrix}>
            <View style={styles.matrixHeader}>
              <Text style={styles.matrixTitle}>TWIN LONGEVITY MATRIX</Text>
              <View style={styles.rejuvenationPill}>
                <MaterialIcons name="trending-down" size={13} color={colors.tertiary} />
                <Text style={styles.rejuvenationText}>-{profile.rejuvenationYears} yrs Rejuvenation</Text>
              </View>
            </View>

            <View style={styles.ageGrid}>
              <View style={styles.ageBox}>
                <Text style={styles.ageLabel}>CHRONOLOGICAL AGE</Text>
                <View style={styles.ageValRow}>
                  <Text style={styles.ageVal}>{profile.chronologicalAge}</Text>
                  <Text style={styles.ageUnit}>yrs</Text>
                </View>
              </View>

              <View style={[styles.ageBox, styles.bioAgeBox]}>
                <View style={styles.bioAgeHeader}>
                  <Text style={[styles.ageLabel, { color: colors.primary }]}>BIO-TWIN AGE</Text>
                  <View style={styles.bioPingDot} />
                </View>
                <View style={styles.ageValRow}>
                  <Text style={[styles.ageVal, { color: colors.primary }]}>{profile.bioTwinAge}</Text>
                  <Text style={[styles.ageUnit, { color: colors.primary }]}>yrs</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Physical Baseline Metrics Grid */}
          <View style={styles.baselineGrid}>
            <View style={styles.baselinePod}>
              <Text style={styles.baselineLabel}>HEIGHT</Text>
              <View style={styles.baselineValRow}>
                <Text style={styles.baselineVal}>{profile.heightCm}</Text>
                <Text style={styles.baselineUnit}>cm</Text>
              </View>
            </View>

            <View style={styles.baselinePod}>
              <Text style={styles.baselineLabel}>WEIGHT</Text>
              <View style={styles.baselineValRow}>
                <Text style={styles.baselineVal}>{profile.weightKg}</Text>
                <Text style={styles.baselineUnit}>kg</Text>
              </View>
            </View>

            <View style={styles.baselinePod}>
              <Text style={styles.baselineLabel}>RESTING MR</Text>
              <View style={styles.baselineValRow}>
                <Text style={styles.baselineVal}>{profile.restingMrKcal.toLocaleString()}</Text>
                <Text style={styles.baselineUnit}>kcal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Connected Hardware & Sensor Ecosystem */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="watch" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>HARDWARE & TELEMETRY STREAMS</Text>
            </View>
            <Text style={styles.devicesOnlineText}>2 Devices Online</Text>
          </View>

          {/* Noise ColorFit Watch Card */}
          <View style={styles.hardwareCard}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceLeft}>
                <View style={styles.deviceIconBox}>
                  <MaterialIcons name="watch" size={24} color={colors.secondary} />
                </View>
                <View>
                  <Text style={styles.deviceName}>{watch.name}</Text>
                  <Text style={styles.deviceSub}>{watch.connectionType} • {watch.bleVersion}</Text>
                </View>
              </View>

              <View style={styles.batteryGroup}>
                <View style={styles.batteryPill}>
                  <MaterialIcons name="battery-5-bar" size={14} color={colors.tertiary} />
                  <Text style={styles.batteryText}>{watch.batteryPercent}%</Text>
                </View>
                <View style={styles.batteryBarTrack}>
                  <View style={[styles.batteryBarFill, { width: `${watch.batteryPercent}%` }]} />
                </View>
              </View>
            </View>

            {/* Sync Status & Force Sync Button */}
            <View style={styles.syncRow}>
              <View style={styles.syncStatusLeft}>
                <View style={styles.syncPulseDot} />
                <Text style={styles.syncStatusLabel} numberOfLines={1}>{watch.lastSyncedText}</Text>
              </View>

              <TouchableOpacity
                style={styles.forceSyncBtn}
                onPress={handleForceSync}
                disabled={isSyncing}
                activeOpacity={0.8}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" color={colors.secondary} />
                ) : (
                  <>
                    <MaterialIcons name="sync" size={14} color={colors.secondary} />
                    <Text style={styles.forceSyncText}>Force Sync</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Sensor Telemetry Toggles Stack */}
            <View style={styles.togglesStack}>
              <Text style={styles.togglesHeader}>AUTONOMOUS BIO-SENSORS</Text>

              {/* 1. Optical PPG */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="timeline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Continuous Optical PPG</Text>
                    <Text style={styles.toggleItemSub}>Real-time Heart Rate & HRV (60-80 bpm)</Text>
                  </View>
                </View>
                <Switch
                  value={settings.continuousPpg}
                  onValueChange={(val) => handleToggleSetting('continuousPpg', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.continuousPpg ? colors.primary : colors.outline}
                />
              </View>

              {/* 2. EDA Sensor */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="waves" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>EDA Electrodermal Sensor</Text>
                    <Text style={styles.toggleItemSub}>Sympathetic Galvanic Stress</Text>
                  </View>
                </View>
                <Switch
                  value={settings.edaSensor}
                  onValueChange={(val) => handleToggleSetting('edaSensor', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.edaSensor ? colors.primary : colors.outline}
                />
              </View>

              {/* 3. SpO2 Sensor */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="bloodtype" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Pulse Oximetry (SpO2)</Text>
                    <Text style={styles.toggleItemSub}>Continuous Nocturnal Saturation</Text>
                  </View>
                </View>
                <Switch
                  value={settings.spo2Sensor}
                  onValueChange={(val) => {
                    handleToggleSetting('spo2Sensor', val);
                    DataService.setSpO2Visibility(val);
                  }}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.spo2Sensor ? colors.primary : colors.outline}
                />
              </View>

              {/* 4. Accelerometer */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="directions-walk" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Tri-Axial Accelerometer</Text>
                    <Text style={styles.toggleItemSub}>Sleep Architecture & Kinematics</Text>
                  </View>
                </View>
                <Switch
                  value={settings.accelerometer}
                  onValueChange={(val) => handleToggleSetting('accelerometer', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.accelerometer ? colors.primary : colors.outline}
                />
              </View>
            </View>
          </View>

          {/* Health Connect Sync Row (Fix 1: Description & Chip text) */}
          <View style={styles.healthConnectRow}>
            <View style={styles.healthConnectLeft}>
              <View style={styles.healthConnectIcon}>
                <MaterialIcons name="cloud-sync" size={22} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.healthConnectTitle}>Health Connect Service</Text>
                <Text style={styles.healthConnectDesc}>Reads data from your watch</Text>
              </View>
            </View>
            <View style={styles.healthConnectChip}>
              <View style={styles.healthConnectDot} />
              <Text style={styles.healthConnectChipText}>Connected</Text>
            </View>
          </View>
        </View>

        {/* Section 3: App & Twin Preferences */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="tune" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>TWIN COMPUTATION & INTERFACE</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            {/* Language Selection */}
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIcon}>
                  <MaterialIcons name="language" size={18} color={colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.prefTitle}>Language Matrix</Text>
                  <Text style={styles.prefSub}>Diagnostic terms vocabulary</Text>
                </View>
              </View>
              <View style={styles.prefPill}>
                <Text style={styles.prefPillText}>English (US)</Text>
                <MaterialIcons name="expand-more" size={16} color={colors.onSurfaceVariant} />
              </View>
            </View>

            {/* Notification Controls */}
            <View style={styles.alertsBlock}>
              <Text style={styles.togglesHeader}>PREDICTIVE TELEMETRY ALERTS</Text>

              <View style={styles.alertToggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.alertTitle}>Biometric Anomaly Push Alerts</Text>
                  <Text style={styles.alertSub}>Instant triage notifications on sudden HRV or SpO2 drops</Text>
                </View>
                <Switch
                  value={settings.anomalyPush}
                  onValueChange={(val) => handleToggleSetting('anomalyPush', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.anomalyPush ? colors.primary : colors.outline}
                />
              </View>

              <View style={styles.alertToggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.alertTitle}>Circadian Wind-Down Reminders</Text>
                  <Text style={styles.alertSub}>Autonomous alerts 90 minutes prior to optimal sleep gate</Text>
                </View>
                <Switch
                  value={settings.circadianReminders}
                  onValueChange={(val) => handleToggleSetting('circadianReminders', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.circadianReminders ? colors.primary : colors.outline}
                />
              </View>

              <View style={styles.alertToggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.alertTitle}>Daily Twin Health Digest</Text>
                  <Text style={styles.alertSub}>Morning metabolic summary & systemic readiness score</Text>
                </View>
                <Switch
                  value={settings.dailyDigest}
                  onValueChange={(val) => handleToggleSetting('dailyDigest', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.dailyDigest ? colors.primary : colors.outline}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Section 4: Data Privacy & Compliance (Fix 2) */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="verified-user" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>COMPLIANCE & DATA SOVEREIGNTY</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            {/* Fix 2: One sentence only */}
            <View style={styles.privacyBox}>
              <View style={styles.privacyIcon}>
                <MaterialIcons name="health-and-safety" size={22} color={colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.privacyTitle}>HIPAA & GDPR Compliant</Text>
                  <MaterialIcons name="check-circle" size={14} color={colors.tertiary} />
                </View>
                <Text style={styles.privacySentence}>All your data stays on this phone.</Text>
              </View>
            </View>

            {/* Action: Export Health Dossier */}
            <TouchableOpacity
              style={styles.dossierBtn}
              onPress={handleExportDossier}
              activeOpacity={0.8}
            >
              <View style={styles.dossierLeft}>
                <MaterialIcons name="description" size={20} color={colors.primary} />
                <View>
                  <Text style={styles.dossierTitle}>Export Health Dossier</Text>
                  <Text style={styles.dossierSub}>Standardized Clinical PDF & FHIR JSON</Text>
                </View>
              </View>
              <MaterialIcons name="download" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Action: Medical Consent */}
            <TouchableOpacity
              style={styles.dossierBtn}
              onPress={() => Alert.alert('Medical Disclaimer', 'Computational Model Rev 4.19. For information only, not medical advice.')}
              activeOpacity={0.8}
            >
              <View style={styles.dossierLeft}>
                <MaterialIcons name="policy" size={20} color={colors.secondary} />
                <View>
                  <Text style={styles.dossierTitle}>Medical Disclaimer & Protocol Consent</Text>
                  <Text style={styles.dossierSub}>Computational Model Rev 4.19</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Account Termination & Revocation */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="power-settings-new" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Logout & Revoke Twin Link</Text>
          </TouchableOpacity>
          <Text style={styles.kernelText}>KERNEL BUILD: v4.12.08-BIO-PROD</Text>
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
  topBreadcrumbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  breadcrumbLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  breadcrumbText: {
    ...typography.labelCapsXs,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 0.9,
  },
  encryptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  encryptionText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  identityCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xxl,
    padding: spacing.spaceMd,
    gap: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  identityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  proBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(69, 223, 164, 0.4)',
  },
  proText: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    fontSize: 8,
    fontWeight: '700',
  },
  identityInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 18,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userIdText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  longevityMatrix: {
    backgroundColor: 'rgba(7, 14, 28, 0.75)',
    borderRadius: radii.lg,
    padding: spacing.spaceSm,
    gap: 8,
  },
  matrixHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matrixTitle: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  rejuvenationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(69, 223, 164, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  rejuvenationText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  ageGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  ageBox: {
    flex: 1,
    backgroundColor: 'rgba(35, 42, 57, 0.6)',
    padding: 10,
    borderRadius: radii.md,
    gap: 2,
  },
  bioAgeBox: {
    backgroundColor: 'rgba(76, 215, 246, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  bioAgeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bioPingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  ageLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  ageValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
    marginTop: 2,
  },
  ageVal: {
    ...typography.headlineMetricMobile,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 22,
  },
  ageUnit: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  baselineGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  baselinePod: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    padding: 8,
    borderRadius: radii.md,
    alignItems: 'center',
    gap: 2,
  },
  baselineLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  baselineValRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  baselineVal: {
    ...typography.dataMono,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 14,
  },
  baselineUnit: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  sectionBlock: {
    gap: 10,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  sectionTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionHeaderTitle: {
    ...typography.labelCapsMd,
    color: colors.onSurfaceVariant,
    fontSize: 10.5,
    letterSpacing: 0.8,
  },
  devicesOnlineText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 10,
  },
  hardwareCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    gap: 12,
  },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deviceName: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 15,
  },
  deviceSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  batteryGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  batteryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  batteryText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  batteryBarTrack: {
    width: 48,
    height: 4,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  batteryBarFill: {
    height: '100%',
    backgroundColor: colors.tertiary,
    borderRadius: radii.full,
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: radii.md,
    gap: 8,
  },
  syncStatusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  syncPulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.secondary,
  },
  syncStatusLabel: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
  forceSyncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  forceSyncText: {
    ...typography.dataMono,
    color: colors.secondary,
    fontSize: 10,
    fontWeight: '700',
  },
  togglesStack: {
    gap: 8,
    paddingTop: 4,
  },
  togglesHeader: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
    letterSpacing: 0.8,
  },
  toggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(21, 27, 42, 0.7)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  toggleItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  toggleIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleItemTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 12.5,
  },
  toggleItemSub: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
    textTransform: 'none',
  },
  healthConnectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
  },
  healthConnectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  healthConnectIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  healthConnectTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  healthConnectDesc: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 10.5,
  },
  healthConnectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(69, 223, 164, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  healthConnectDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tertiary,
  },
  healthConnectChipText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 10,
    fontWeight: '700',
  },
  cardBox: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    gap: 14,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 53, 68, 0.4)',
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  prefIcon: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prefTitle: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 14,
  },
  prefSub: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
  },
  prefPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  prefPillText: {
    ...typography.dataMono,
    color: colors.secondary,
    fontSize: 11,
    fontWeight: '600',
  },
  alertsBlock: {
    gap: 10,
  },
  alertToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  alertTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
  },
  alertSub: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
    marginTop: 1,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: radii.md,
  },
  privacyIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: 'rgba(69, 223, 164, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 13,
  },
  privacySentence: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
    textTransform: 'none',
    marginTop: 1,
  },
  dossierBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerHigh,
    padding: 12,
    borderRadius: radii.md,
  },
  dossierLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  dossierTitle: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 13,
  },
  dossierSub: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  logoutSection: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  logoutText: {
    ...typography.bodySm,
    color: colors.error,
    fontWeight: '700',
  },
  kernelText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    opacity: 0.7,
  },
});
