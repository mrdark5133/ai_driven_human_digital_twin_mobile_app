import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CALL_SLOTS, CallSlotId, MORNING_SLOT, EVENING_SLOT } from '../config/callSchedule';
import { saveCallEntry, updateCallEntry } from './callHistory';

const SETTINGS_KEY = '@ai_twin_call_schedule_settings';
const MIGRATION_KEY = '@pallavi_call_v2_migrated';

export interface ScheduleSettings {
  morningEnabled: boolean;
  eveningEnabled: boolean;
}

const DEFAULT_SETTINGS: ScheduleSettings = {
  morningEnabled: true,
  eveningEnabled: true,
};

let notificationsModule: any = null;
let moduleChecked = false;

/**
 * Checks whether native notification capabilities are present in the current build.
 * Safely guards against native crashes on Expo Go or older APK builds.
 */
export function isNotificationAvailable(): boolean {
  if (moduleChecked) return notificationsModule !== null;
  moduleChecked = true;

  try {
    const mod = require('expo-notifications');
    if (mod) {
      notificationsModule = {
        ...(mod.default || {}),
        ...mod,
        SchedulableTriggerInputTypes: mod.SchedulableTriggerInputTypes || mod.default?.SchedulableTriggerInputTypes || {
          DAILY: 'daily',
          TIME_INTERVAL: 'timeInterval',
        },
        AndroidImportance: mod.AndroidImportance || mod.default?.AndroidImportance || {
          MAX: 5,
        },
        AndroidNotificationPriority: mod.AndroidNotificationPriority || mod.default?.AndroidNotificationPriority || {
          MAX: 'max',
        },
        AndroidNotificationVisibility: mod.AndroidNotificationVisibility || mod.default?.AndroidNotificationVisibility || {
          PUBLIC: 1,
        },
      };
    }
  } catch (err) {
    console.log('[CallScheduler] expo-notifications not available on this environment (e.g. Expo Go):', err);
    notificationsModule = null;
  }

  return notificationsModule !== null;
}

/**
 * Returns the lazily loaded expo-notifications module or null.
 */
function getNotifications() {
  if (!moduleChecked) {
    isNotificationAvailable();
  }
  return notificationsModule;
}

/**
 * Retrieves the user's call schedule preferences (morning / evening enabled).
 */
export async function getScheduleSettings(): Promise<ScheduleSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves the user's call schedule preferences and reschedules triggers.
 */
export async function saveScheduleSettings(settings: ScheduleSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[CallScheduler] Failed to save settings:', err);
  }
  await syncDailyCallSchedule();
}

/**
 * Sets up the new "pallavi_call_v2" notification channel and interactive action categories.
 */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // 1. Android High-Importance Call Channel (pallavi_call_v2)
    if (Platform.OS === 'android') {
      // Clean up deprecated channels if supported
      try {
        if (Notifications.deleteNotificationChannelAsync) {
          await Notifications.deleteNotificationChannelAsync('aura-calls');
          await Notifications.deleteNotificationChannelAsync('aura-calls-v2');
        }
      } catch {
        // Channel might not exist
      }

      await Notifications.setNotificationChannelAsync('pallavi_call_v2', {
        name: 'Pallavi Calls',
        description: 'Scheduled incoming calls and ringing from Pallavi',
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        sound: 'pallavi_ring.wav',
        vibrationPattern: [0, 800, 400, 800, 400, 800],
        lockscreenVisibility: Notifications.AndroidNotificationVisibility?.PUBLIC ?? 1,
        bypassDnd: false,
        enableVibrate: true,
      });
    }

    // 2. Interactive Call Actions: Answer and Decline (category "incoming_call")
    await Notifications.setNotificationCategoryAsync('incoming_call', [
      {
        identifier: 'ANSWER',
        buttonTitle: 'Answer',
        options: {
          opensAppToForeground: true,
        },
      },
      {
        identifier: 'DECLINE',
        buttonTitle: 'Decline',
        options: {
          isDestructive: true,
          opensAppToForeground: true,
        },
      },
    ]);

    // Backward compatibility for legacy category
    try {
      await Notifications.setNotificationCategoryAsync('aura-call-actions', [
        {
          identifier: 'ANSWER',
          buttonTitle: 'Answer',
          options: { opensAppToForeground: true },
        },
        {
          identifier: 'DECLINE',
          buttonTitle: 'Decline',
          options: { isDestructive: true, opensAppToForeground: true },
        },
      ]);
    } catch {}

    // 3. Foreground presentation options: show alert and play sound
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[CallScheduler] Setup channels error:', err);
  }
}

/**
 * Requests notification and exact alarm permissions at runtime.
 */
export async function requestCallPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[CallScheduler] Permission request error:', err);
    return false;
  }
}

/**
 * Checks current notification permission and exact alarm status.
 */
export async function checkCallPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

/**
 * Detailed permission and exact alarm check for profile reliability warnings.
 */
export async function checkReliabilityPermissions(): Promise<{
  notificationsGranted: boolean;
  canScheduleExactAlarms: boolean;
}> {
  const Notifications = getNotifications();
  if (!Notifications) {
    return { notificationsGranted: false, canScheduleExactAlarms: false };
  }

  try {
    const perm = await Notifications.getPermissionsAsync();
    return {
      notificationsGranted: perm.status === 'granted',
      canScheduleExactAlarms: perm.canScheduleExactAlarms ?? true,
    };
  } catch {
    return { notificationsGranted: false, canScheduleExactAlarms: false };
  }
}

/**
 * Guides user to battery optimization / app settings on Android.
 */
export async function openBatteryOptimizationSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      const IntentLauncher = require('expo-intent-launcher');
      await IntentLauncher.startActivityAsync('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
      return;
    } catch {
      // Fallback to app settings
    }
  }
  await Linking.openSettings();
}

/**
 * Cancels all currently scheduled call notifications.
 */
export async function cancelAllScheduledCalls(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      const type = notif.content?.data?.type;
      if (type === 'incoming_call' || type === 'scheduled_call') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.warn('[CallScheduler] Error cancelling notifications:', err);
  }
}

/**
 * Idempotently syncs and schedules the daily repeating triggers for enabled slots on pallavi_call_v2 channel.
 * Cancels previous schedules and recreates them cleanly.
 */
export async function syncDailyCallSchedule(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  await setupNotificationChannels();

  const hasPerm = await checkCallPermissions();
  if (!hasPerm) return;

  await cancelAllScheduledCalls();
  const settings = await getScheduleSettings();

  const slotsToSchedule = [];
  if (settings.morningEnabled) slotsToSchedule.push(MORNING_SLOT);
  if (settings.eveningEnabled) slotsToSchedule.push(EVENING_SLOT);

  for (const slot of slotsToSchedule) {
    try {
      const slotIdentifier: 'morning' | 'night' = slot.id === 'morning' ? 'morning' : 'night';
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Pallavi is calling',
          body: 'Tap to answer',
          priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
          categoryIdentifier: 'incoming_call',
          sound: 'pallavi_ring.wav',
          sticky: true,
          autoDismiss: false,
          color: '#4cd7f6',
          data: {
            type: 'incoming_call',
            slot: slotIdentifier,
          },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
          channelId: 'pallavi_call_v2',
        },
      });
      console.log(`[CallScheduler] Scheduled daily ${slotIdentifier} call on pallavi_call_v2 at ${slot.hour}:${slot.minute}`);
    } catch (err) {
      console.warn(`[CallScheduler] Failed to schedule ${slot.id}:`, err);
    }
  }

  try {
    await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  } catch {}
}

/**
 * Triggers a test ring in specified seconds (defaults to 5 seconds).
 * Works in Expo Go (falls back safely to in-app timer) and in native builds.
 */
export async function testCallIn(seconds: number = 5): Promise<string> {
  const historyId = `call-test-${Date.now()}`;
  const now = new Date();
  const slot: CallSlotId = now.getHours() < 12 ? 'morning' : 'evening';
  const slotIdentifier: 'morning' | 'night' = slot === 'morning' ? 'morning' : 'night';

  // Pre-create entry in call history
  await saveCallEntry({
    id: historyId,
    slot,
    scheduledAt: Date.now() + seconds * 1000,
    status: 'missed',
  });

  const Notifications = getNotifications();

  // If notifications are unavailable (e.g. Expo Go) or permission denied, fallback to JS timeout
  if (!Notifications) {
    console.log(`[CallScheduler] Notifications unavailable. Setting in-app ring timer in ${seconds}s`);
    setTimeout(() => {
      router.push({
        pathname: '/call',
        params: {
          mode: 'incoming',
          slot,
          historyId,
        },
      });
    }, seconds * 1000);
    return 'expo-go-test';
  }

  await setupNotificationChannels();
  const hasPerm = await requestCallPermissions();

  if (!hasPerm) {
    // If permission was denied, still allow in-app test ring
    setTimeout(() => {
      router.push({
        pathname: '/call',
        params: {
          mode: 'incoming',
          slot,
          historyId,
        },
      });
    }, seconds * 1000);
    return 'permission-fallback-test';
  }

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Pallavi is calling',
      body: 'Tap to answer',
      priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
      categoryIdentifier: 'incoming_call',
      sound: 'pallavi_ring.wav',
      sticky: true,
      autoDismiss: false,
      color: '#4cd7f6',
      data: {
        type: 'incoming_call',
        slot: slotIdentifier,
        historyId,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
      channelId: 'pallavi_call_v2',
    },
  });

  return id;
}

/**
 * Handles incoming notification response actions (Answer, Decline, Tap).
 */
export async function handleNotificationResponse(response: any): Promise<void> {
  const data = response?.notification?.request?.content?.data;
  if (data?.type !== 'incoming_call' && data?.type !== 'scheduled_call') return;

  const rawSlot = data.slot;
  const slot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
  const historyId: string = data.historyId || `call-${slot}-${Date.now()}`;
  const actionId = response.actionIdentifier;

  const Notifications = getNotifications();
  if (Notifications?.dismissNotificationAsync) {
    try {
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    } catch {}
  }

  if (actionId === 'DECLINE') {
    // User pressed Decline action -> mark as missed per instruction
    await updateCallEntry(historyId, { status: 'missed' });
  } else {
    // User pressed Answer action or tapped notification body -> show incoming call screen
    router.push({
      pathname: '/call',
      params: {
        mode: 'incoming',
        slot,
        historyId,
      },
    });
  }
}

/**
 * Subscribes to notification event listeners in foreground and background.
 * Returns unsubscribe cleanup function.
 */
export function registerNotificationListeners(): () => void {
  const Notifications = getNotifications();
  if (!Notifications) return () => {};

  setupNotificationChannels();

  // Foreground notification received: trigger in-app ringing screen when app is open
  const subReceived = Notifications.addNotificationReceivedListener((notification: any) => {
    const data = notification?.request?.content?.data;
    if (data?.type === 'incoming_call' || data?.type === 'scheduled_call') {
      const rawSlot = data.slot;
      const slot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
      const historyId: string = data.historyId || `call-${slot}-${Date.now()}`;

      router.push({
        pathname: '/call',
        params: {
          mode: 'incoming',
          slot,
          historyId,
        },
      });
    }
  });

  // User interacted with notification (tap, action button)
  const subResponse = Notifications.addNotificationResponseReceivedListener((response: any) => {
    handleNotificationResponse(response);
  });

  return () => {
    subReceived.remove();
    subResponse.remove();
  };
}
