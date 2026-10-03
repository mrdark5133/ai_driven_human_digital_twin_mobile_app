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
    Alert.alert('Synchronized', 'Watch data successfully updated.');
  };

  const handleToggleSetting = (key: keyof TelemetrySettings, value: boolean) => {
    DataService.updateSettings({ [key]: value });
  };

  const handleExportData = () => {
    Alert.alert(
      'Export my data',
      'Your health data has been prepared for CSV download.'
    );
  };

  const handleLogout = () => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out on this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log out', style: 'destructive', onPress: () => router.replace('/(auth)/login') },
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
        {/* Top Status */}
        <View style={styles.topBreadcrumbRow}>
          <View style={styles.breadcrumbLeft}>
            <View style={styles.pulseDot} />
            <Text style={styles.breadcrumbText}>Data stays on this phone</Text>
          </View>
        </View>

        {/* Section 1: User Identity */}
        <View style={styles.identityCard}>
          {/* Identity Header Row */}
          <View style={styles.identityHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarBox}>
                <MaterialIcons name="person" size={32} color={colors.onPrimary} />
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
            </View>
          </View>

          {/* Physical Baseline Metrics Grid */}
          <View style={styles.baselineGrid}>
            <View style={styles.baselinePod}>
              <Text style={styles.baselineLabel}>AGE</Text>
              <View style={styles.baselineValRow}>
                <Text style={styles.baselineVal}>{profile.chronologicalAge}</Text>
                <Text style={styles.baselineUnit}>yrs</Text>
              </View>
            </View>

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
              <Text style={styles.baselineLabel}>EST. CALORIES/DAY</Text>
              <View style={styles.baselineValRow}>
                <Text style={styles.baselineVal}>{profile.restingMrKcal.toLocaleString()}</Text>
                <Text style={styles.baselineUnit}>kcal</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Section 2: Connected Device */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="watch" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>Connected Device</Text>
            </View>
            <Text style={styles.devicesOnlineText}>1 device</Text>
          </View>

          {/* Watch Card */}
          <View style={styles.hardwareCard}>
            <View style={styles.deviceRow}>
              <View style={styles.deviceLeft}>
                <View style={styles.deviceIconBox}>
                  <MaterialIcons name="watch" size={24} color={colors.secondary} />
                </View>
                <View>
                  <Text style={styles.deviceName}>{watch.name}</Text>
                  <Text style={styles.deviceSub}>Noise ColorFit Watch - Health Connect</Text>
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

            {/* Sensor List */}
            <View style={styles.togglesStack}>
              <Text style={styles.togglesHeader}>SENSORS</Text>

              {/* 1. Heart Rate */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="timeline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Heart Rate</Text>
                    <Text style={styles.toggleItemSub}>Heart rate and HRV</Text>
                  </View>
                </View>
                <Switch
                  value={settings.continuousPpg}
                  onValueChange={(val) => handleToggleSetting('continuousPpg', val)}
                  trackColor={{ false: colors.surfaceContainerHighest, true: colors.primaryContainer }}
                  thumbColor={settings.continuousPpg ? colors.primary : colors.outline}
                />
              </View>

              {/* 2. Blood Oxygen (SpO2) */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="bloodtype" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Blood Oxygen (SpO2)</Text>
                    <Text style={styles.toggleItemSub}>Continuous saturation readings</Text>
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

              {/* 3. Sleep & Movement */}
              <View style={styles.toggleItem}>
                <View style={styles.toggleItemLeft}>
                  <View style={styles.toggleIcon}>
                    <MaterialIcons name="directions-walk" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <Text style={styles.toggleItemTitle}>Sleep & Movement</Text>
                    <Text style={styles.toggleItemSub}>Daily steps and sleep tracking</Text>
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

          {/* Health Connect Service Row */}
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

        {/* Section 3: Settings */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="tune" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>Settings</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            {/* Language */}
            <View style={styles.prefRow}>
              <View style={styles.prefLeft}>
                <View style={styles.prefIcon}>
                  <MaterialIcons name="language" size={18} color={colors.onSurface} />
                </View>
                <View>
                  <Text style={styles.prefTitle}>Language</Text>
                  <Text style={styles.prefSub}>App language</Text>
                </View>
              </View>
              <View style={styles.prefPill}>
                <Text style={styles.prefPillText}>English (US)</Text>
                <MaterialIcons name="expand-more" size={16} color={colors.onSurfaceVariant} />
              </View>
            </View>

            {/* Alerts */}
            <View style={styles.alertsBlock}>
              <Text style={styles.togglesHeader}>ALERTS</Text>

              <View style={styles.alertToggleRow}>
                <View style={{ flex: 1, paddingRight: 10 }}>
                  <Text style={styles.alertTitle}>Unusual reading alerts</Text>
                  <Text style={styles.alertSub}>Notify me when heart rate or SpO2 looks unusual</Text>
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
                  <Text style={styles.alertTitle}>Bedtime reminder</Text>
                  <Text style={styles.alertSub}>Reminder before your scheduled bedtime</Text>
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
                  <Text style={styles.alertTitle}>Daily summary</Text>
                  <Text style={styles.alertSub}>Morning summary of your sleep and activity</Text>
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

        {/* Section 4: Privacy */}
        <View style={styles.sectionBlock}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.sectionTitleGroup}>
              <MaterialIcons name="verified-user" size={18} color={colors.secondary} />
              <Text style={styles.sectionHeaderTitle}>Privacy</Text>
            </View>
          </View>

          <View style={styles.cardBox}>
            <View style={styles.privacyBox}>
              <View style={styles.privacyIcon}>
                <MaterialIcons name="shield" size={22} color={colors.tertiary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.privacyTitle}>Private by design</Text>
                <Text style={styles.privacySentence}>All your data stays on this phone.</Text>
              </View>
            </View>

            {/* Action: Export my data */}
            <TouchableOpacity
              style={styles.dossierBtn}
              onPress={handleExportData}
              activeOpacity={0.8}
            >
              <View style={styles.dossierLeft}>
                <MaterialIcons name="description" size={20} color={colors.primary} />
                <View>
                  <Text style={styles.dossierTitle}>Export my data</Text>
                  <Text style={styles.dossierSub}>Download as CSV</Text>
                </View>
              </View>
              <MaterialIcons name="download" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Action: Medical Disclaimer */}
            <TouchableOpacity
              style={styles.dossierBtn}
              onPress={() => Alert.alert('Medical disclaimer', 'For information only, not medical advice. Consult a healthcare professional for clinical concerns.')}
              activeOpacity={0.8}
            >
              <View style={styles.dossierLeft}>
                <MaterialIcons name="policy" size={20} color={colors.secondary} />
                <View>
                  <Text style={styles.dossierTitle}>Medical disclaimer</Text>
                  <Text style={styles.dossierSub}>For information only, not medical advice</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Section 5: Logout */}
        <View style={styles.logoutSection}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <MaterialIcons name="power-settings-new" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
          <Text style={styles.kernelText}>AI-Driven Human v1.0</Text>
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
    ...typography.bodySm,
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 12,
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
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
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
    fontSize: 20,
  },
  editBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 8,
    textAlign: 'center',
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
    fontSize: 13,
  },
  baselineUnit: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9,
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
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 15,
  },
  devicesOnlineText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 11,
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
    fontSize: 9,
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
    fontSize: 13,
  },
  toggleItemSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    ...typography.bodySm,
    color: colors.secondary,
    fontSize: 12,
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
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    marginTop: 1,
  },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    padding: 12,
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
    fontSize: 14,
  },
  privacySentence: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    fontSize: 14,
  },
  kernelText: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
    opacity: 0.7,
  },
});
