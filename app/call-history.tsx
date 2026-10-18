import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme/tokens';
import { CALL_SLOTS } from '../src/config/callSchedule';
import { ASSISTANT_NAME } from '../src/config/appConfig';
import {
  CallHistoryEntry,
  getCallHistory,
  subscribeCallHistory,
  reconcile,
} from '../src/services/callHistory';
import {
  isNotificationAvailable,
  getScheduleSettings,
  saveScheduleSettings,
  testCallIn,
  requestCallPermissions,
  checkCallPermissions,
  openBatteryOptimizationSettings,
  ScheduleSettings,
} from '../src/services/callScheduler';

interface GroupedHistory {
  dateLabel: string;
  entries: CallHistoryEntry[];
}

export default function CallHistoryScreen() {
  const router = useRouter();

  const [history, setHistory] = useState<CallHistoryEntry[]>([]);
  const [scheduleSettings, setScheduleSettings] = useState<ScheduleSettings>({
    morningEnabled: true,
    eveningEnabled: true,
  });

  const [notificationsSupported, setNotificationsSupported] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [testStatusMsg, setTestStatusMsg] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check notification availability (graceful fallback on old APK builds)
    const available = isNotificationAvailable();
    setNotificationsSupported(available);

    if (available) {
      checkCallPermissions().then(setHasPermission);
      getScheduleSettings().then(setScheduleSettings);
    }

    // 2. Load call history & subscribe
    reconcile().then(() => {
      getCallHistory().then(setHistory);
    });

    const unsubscribe = subscribeCallHistory((updated) => {
      setHistory(updated);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleMorning = async (val: boolean) => {
    const updated = { ...scheduleSettings, morningEnabled: val };
    setScheduleSettings(updated);
    await saveScheduleSettings(updated);
  };

  const handleToggleEvening = async (val: boolean) => {
    const updated = { ...scheduleSettings, eveningEnabled: val };
    setScheduleSettings(updated);
    await saveScheduleSettings(updated);
  };

  const handleRequestPermission = async () => {
    const granted = await requestCallPermissions();
    setHasPermission(granted);
  };

  const handleTestCall = async () => {
    setIsTestingCall(true);
    setTestStatusMsg('Scheduling test call in 10s...');
    try {
      await testCallIn(10);
      setTestStatusMsg('Test call incoming in 10 seconds! Lock your phone or switch apps to test.');
      setTimeout(() => {
        setIsTestingCall(false);
        setTestStatusMsg(null);
      }, 12000);
    } catch (err: any) {
      setIsTestingCall(false);
      setTestStatusMsg(err?.message || 'Failed to schedule test call.');
    }
  };

  const formatDuration = (sec?: number) => {
    if (!sec || sec <= 0) return '0s';
    const mins = Math.floor(sec / 60);
    const remainingSecs = sec % 60;
    if (mins > 0) {
      return `${mins}m ${remainingSecs}s`;
    }
    return `${remainingSecs}s`;
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const groupEntriesByDay = (entries: CallHistoryEntry[]): GroupedHistory[] => {
    const groups: { [key: string]: CallHistoryEntry[] } = {};

    const todayStr = new Date().toDateString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    entries.forEach((entry) => {
      const entryDate = new Date(entry.scheduledAt || Date.now());
      const dateStr = entryDate.toDateString();

      let label = dateStr;
      if (dateStr === todayStr) {
        label = 'Today';
      } else if (dateStr === yesterdayStr) {
        label = 'Yesterday';
      } else {
        label = entryDate.toLocaleDateString([], {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        });
      }

      if (!groups[label]) {
        groups[label] = [];
      }
      groups[label].push(entry);
    });

    return Object.keys(groups).map((key) => ({
      dateLabel: key,
      entries: groups[key],
    }));
  };

  const groupedHistory = groupEntriesByDay(history);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Call History & Schedule</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Schedule & Controls Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <MaterialIcons name="schedule" size={18} color={colors.primary} />
            <Text style={styles.sectionTitle}>AUTOMATIC IN-APP CALL SCHEDULE</Text>
          </View>

          {!notificationsSupported ? (
            /* Current APK Warning */
            <View style={styles.warningBox}>
              <MaterialIcons name="info-outline" size={18} color={colors.amber} />
              <Text style={styles.warningText}>
                Update the app build to enable scheduled calls.
              </Text>
            </View>
          ) : (
            <>
              {/* Permission & Battery Status Line */}
              <View style={styles.statusLineContainer}>
                <TouchableOpacity
                  style={styles.statusLineItem}
                  onPress={!hasPermission ? handleRequestPermission : undefined}
                  activeOpacity={hasPermission ? 1 : 0.7}
                >
                  <MaterialIcons
                    name={hasPermission ? 'check-circle' : 'warning'}
                    size={16}
                    color={hasPermission ? colors.green : colors.amber}
                  />
                  <Text
                    style={[
                      styles.statusLineText,
                      { color: hasPermission ? colors.green : colors.amber },
                    ]}
                  >
                    {hasPermission ? 'Notifications Active' : 'Tap to enable notifications'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.batteryButton}
                  onPress={openBatteryOptimizationSettings}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="battery-charging-full" size={14} color={colors.teal} />
                  <Text style={styles.batteryButtonText}>Battery Settings</Text>
                </TouchableOpacity>
              </View>

              {/* Slot Toggles */}
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <View style={styles.slotTitleRow}>
                    <MaterialIcons name="wb-sunny" size={16} color="#fbbf24" />
                    <Text style={styles.slotName}>{CALL_SLOTS.morning.label}</Text>
                  </View>
                  <Text style={styles.slotTimeText}>Daily at 08:45 AM</Text>
                </View>
                <Switch
                  value={scheduleSettings.morningEnabled}
                  onValueChange={handleToggleMorning}
                  thumbColor={scheduleSettings.morningEnabled ? colors.primary : '#64748b'}
                  trackColor={{ false: '#334155', true: colors.primary + '55' }}
                />
              </View>

              <View style={styles.divider} />

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <View style={styles.slotTitleRow}>
                    <MaterialIcons name="nights-stay" size={16} color="#818cf8" />
                    <Text style={styles.slotName}>{CALL_SLOTS.evening.label}</Text>
                  </View>
                  <Text style={styles.slotTimeText}>Daily at 09:00 PM</Text>
                </View>
                <Switch
                  value={scheduleSettings.eveningEnabled}
                  onValueChange={handleToggleEvening}
                  thumbColor={scheduleSettings.eveningEnabled ? colors.primary : '#64748b'}
                  trackColor={{ false: '#334155', true: colors.primary + '55' }}
                />
              </View>

              {/* Test Call Button */}
              <TouchableOpacity
                style={styles.testCallButton}
                onPress={handleTestCall}
                disabled={isTestingCall}
                activeOpacity={0.85}
              >
                {isTestingCall ? (
                  <ActivityIndicator size="small" color="#070e1c" />
                ) : (
                  <MaterialIcons name="phone-callback" size={18} color="#070e1c" />
                )}
                <Text style={styles.testCallButtonText}>
                  {isTestingCall ? 'Test Call Scheduled...' : 'Test call in 10 seconds'}
                </Text>
              </TouchableOpacity>

              {testStatusMsg && (
                <View style={styles.testStatusBox}>
                  <Text style={styles.testStatusText}>{testStatusMsg}</Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Call History List */}
        <View style={styles.historySection}>
          <Text style={styles.historySectionTitle}>CALL LOGS</Text>

          {groupedHistory.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="history" size={40} color={colors.outline} />
              <Text style={styles.emptyCardTitle}>No Calls Recorded</Text>
              <Text style={styles.emptyCardDesc}>
                Scheduled check-ins and direct voice calls with {ASSISTANT_NAME} will appear here.
              </Text>
            </View>
          ) : (
            groupedHistory.map((group) => (
              <View key={group.dateLabel} style={styles.dayGroup}>
                <Text style={styles.dayGroupLabel}>{group.dateLabel}</Text>

                <View style={styles.dayEntriesCard}>
                  {group.entries.map((entry, index) => {
                    const isMorning = entry.slot === 'morning';
                    const slotName = CALL_SLOTS[entry.slot]?.label || 'Voice Call';

                    return (
                      <View key={entry.id}>
                        {index > 0 && <View style={styles.itemDivider} />}

                        <View style={styles.callRow}>
                          <View style={styles.callIconBox}>
                            <MaterialIcons
                              name={isMorning ? 'wb-sunny' : 'nights-stay'}
                              size={18}
                              color={isMorning ? '#fbbf24' : '#818cf8'}
                            />
                          </View>

                          <View style={styles.callInfoCol}>
                            <Text style={styles.callSlotTitle}>{slotName}</Text>
                            <Text style={styles.callTime}>{formatTime(entry.scheduledAt)}</Text>
                          </View>

                          {/* Status Chip */}
                          <View style={styles.callRightCol}>
                            {entry.status === 'answered' ? (
                              <View style={[styles.statusChip, styles.statusChipAnswered]}>
                                <MaterialIcons name="call" size={12} color="#22c55e" />
                                <Text style={styles.statusAnsweredText}>
                                  Answered • {formatDuration(entry.durationSec)}
                                </Text>
                              </View>
                            ) : entry.status === 'declined' ? (
                              <View style={[styles.statusChip, styles.statusChipDeclined]}>
                                <MaterialIcons name="call-end" size={12} color="#f59e0b" />
                                <Text style={styles.statusDeclinedText}>Declined</Text>
                              </View>
                            ) : (
                              <View style={[styles.statusChip, styles.statusChipMissed]}>
                                <MaterialIcons name="call-missed" size={12} color="#ef4444" />
                                <Text style={styles.statusMissedText}>Missed</Text>
                              </View>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  backButton: {
    padding: space.xs,
  },
  headerTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  scrollContent: {
    paddingHorizontal: space.md,
    paddingVertical: space.md,
    gap: space.lg,
  },

  /* Section Card */
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.cardHigh,
    gap: space.md,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    ...type.labelSm,
    color: colors.primary,
    fontWeight: '700',
    letterSpacing: 1,
    fontSize: 11,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  warningText: {
    ...type.bodySm,
    color: colors.amber,
    flex: 1,
  },

  /* Status line */
  statusLineContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLow,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  statusLineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusLineText: {
    ...type.labelSm,
    fontWeight: '600',
    fontSize: 11,
  },
  batteryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  batteryButtonText: {
    ...type.labelSm,
    color: colors.teal,
    fontSize: 10,
    fontWeight: '600',
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  toggleInfo: {
    gap: 2,
  },
  slotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  slotName: {
    ...type.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 14,
  },
  slotTimeText: {
    ...type.bodySm,
    color: colors.textDim,
    fontSize: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.cardHigh,
  },

  testCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: radius.full,
    marginTop: 4,
  },
  testCallButtonText: {
    ...type.title,
    color: '#070e1c',
    fontWeight: '700',
    fontSize: 13,
  },
  testStatusBox: {
    backgroundColor: 'rgba(76, 215, 246, 0.1)',
    padding: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  testStatusText: {
    ...type.bodySm,
    color: colors.primary,
    fontSize: 11.5,
    textAlign: 'center',
  },

  /* History Section */
  historySection: {
    gap: space.md,
  },
  historySectionTitle: {
    ...type.labelSm,
    color: colors.outline,
    letterSpacing: 1,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  emptyCard: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: space.xl,
    gap: space.sm,
    borderWidth: 1,
    borderColor: colors.cardHigh,
  },
  emptyCardTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '600',
  },
  emptyCardDesc: {
    ...type.bodySm,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 18,
  },

  dayGroup: {
    gap: 6,
  },
  dayGroupLabel: {
    ...type.bodySm,
    color: colors.textDim,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 4,
  },
  dayEntriesCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.cardHigh,
    overflow: 'hidden',
  },
  itemDivider: {
    height: 1,
    backgroundColor: colors.cardHigh,
    marginHorizontal: space.md,
  },
  callRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    gap: space.md,
  },
  callIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callInfoCol: {
    flex: 1,
  },
  callSlotTitle: {
    ...type.body,
    color: colors.text,
    fontWeight: '600',
    fontSize: 13.5,
  },
  callTime: {
    ...type.bodySm,
    color: colors.textDim,
    fontSize: 11.5,
    marginTop: 1,
  },
  callRightCol: {
    alignItems: 'flex-end',
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusChipAnswered: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusAnsweredText: {
    ...type.labelSm,
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 10.5,
  },
  statusChipDeclined: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  statusDeclinedText: {
    ...type.labelSm,
    color: '#f59e0b',
    fontWeight: '600',
    fontSize: 10.5,
  },
  statusChipMissed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusMissedText: {
    ...type.labelSm,
    color: '#ef4444',
    fontWeight: '600',
    fontSize: 10.5,
  },
});
