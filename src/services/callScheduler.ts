import { Platform, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { CALL_SLOTS, CallSlotId, MORNING_SLOT, EVENING_SLOT } from '../config/callSchedule';
import { saveCallEntry, updateCallEntry } from './callHistory';
import { ASSISTANT_NAME } from '../config/appConfig';

const SETTINGS_KEY = '@ai_twin_call_schedule_settings';

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
 * Safely guards against native crashes on older APK builds.
 */
export function isNotificationAvailable(): boolean {
  if (moduleChecked) return notificationsModule !== null;
  moduleChecked = true;

  try {
    const mod = require('expo-notifications');
    if (mod && (mod.scheduleNotificationAsync || mod.default?.scheduleNotificationAsync)) {
      notificationsModule = mod.scheduleNotificationAsync ? mod : mod.default;
    }
  } catch (err) {
    console.log('[CallScheduler] expo-notifications not available on this APK build:', err);
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
 * Sets up notification channel and interactive action categories.
 */
export async function setupNotificationChannels(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    // 1. Android High-Importance Call Channel
    if (Platform.OS === 'android') {
      try {
        if (Notifications.deleteNotificationChannelAsync) {
          await Notifications.deleteNotificationChannelAsync('aura-calls');
        }
      } catch (delErr) {
        // Channel might not exist or error deleting legacy channel
      }

      await Notifications.setNotificationChannelAsync('aura-calls-v2', {
        name: `${ASSISTANT_NAME} Calls`,
        description: `Scheduled incoming check-in calls from ${ASSISTANT_NAME}`,
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 600, 300, 600, 300, 600],
        lightColor: '#4cd7f6',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableVibrate: true,
      });
    }

    // 2. Interactive Call Actions: Answer and Decline
    await Notifications.setNotificationCategoryAsync('aura-call-actions', [
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
          opensAppToForeground: false,
        },
      },
    ]);

    // 3. Set foreground presentation options
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
 * Requests notification and exact alarm permissions.
 */
export async function requestCallPermissions(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  } catch (err) {
    console.warn('[CallScheduler] Permission request error:', err);
    return false;
  }
}

/**
 * Checks current notification permission status.
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
 * Guides user to battery optimization settings on Android.
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
 * Cancels all currently scheduled AURA call notifications.
 */
export async function cancelAllScheduledCalls(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  try {
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    for (const notif of scheduled) {
      if (notif.content.data?.type === 'scheduled_call') {
        await Notifications.cancelScheduledNotificationAsync(notif.identifier);
      }
    }
  } catch (err) {
    console.warn('[CallScheduler] Error cancelling notifications:', err);
  }
}

/**
 * Idempotently syncs and schedules the daily repeating triggers for enabled slots.
 * Cancels previous schedules and recreates them on app start.
 */
export async function syncDailyCallSchedule(): Promise<void> {
  const Notifications = getNotifications();
  if (!Notifications) return;

  const hasPerm = await checkCallPermissions();
  if (!hasPerm) return;

  await cancelAllScheduledCalls();
  const settings = await getScheduleSettings();

  const slotsToSchedule = [];
  if (settings.morningEnabled) slotsToSchedule.push(MORNING_SLOT);
  if (settings.eveningEnabled) slotsToSchedule.push(EVENING_SLOT);

  for (const slot of slotsToSchedule) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: ASSISTANT_NAME,
          body: slot.label,
          categoryIdentifier: 'aura-call-actions',
          data: {
            type: 'scheduled_call',
            slot: slot.id,
          },
          sticky: true,
          autoDismiss: false,
          color: '#4cd7f6',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: slot.hour,
          minute: slot.minute,
          channelId: 'aura-calls-v2',
        },
      });
      console.log(`[CallScheduler] Scheduled daily ${slot.id} call at ${slot.hour}:${slot.minute}`);
    } catch (err) {
      console.warn(`[CallScheduler] Failed to schedule ${slot.id}:`, err);
    }
  }
}

/**
 * Triggers a test call in specified seconds for testing and demonstration.
 */
export async function testCallIn(seconds: number = 10): Promise<string> {
  const Notifications = getNotifications();
  if (!Notifications) {
    throw new Error('Notifications are not available on this build.');
  }

  await setupNotificationChannels();
  const hasPerm = await requestCallPermissions();
  if (!hasPerm) {
    throw new Error('Notification permissions not granted.');
  }

  const slot: CallSlotId = new Date().getHours() < 12 ? 'morning' : 'evening';
  const historyId = `call-test-${Date.now()}`;

  // Pre-create entry as scheduled
  await saveCallEntry({
    id: historyId,
    slot,
    scheduledAt: Date.now() + seconds * 1000,
    status: 'missed', // will become answered or declined if handled
  });

  const id = await Notifications.scheduleNotificationAsync({
    content: {
      title: ASSISTANT_NAME,
      body: slot === 'morning' ? 'Morning check-in' : 'Evening check-in',
      categoryIdentifier: 'aura-call-actions',
      data: {
        type: 'scheduled_call',
        slot,
        historyId,
      },
      sticky: true,
      autoDismiss: false,
      color: '#4cd7f6',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: Math.max(1, seconds),
      channelId: 'aura-calls-v2',
    },
  });

  return id;
}

/**
 * Handles incoming notification response actions (Answer, Decline, Tap).
 */
export async function handleNotificationResponse(response: any): Promise<void> {
  const data = response?.notification?.request?.content?.data;
  if (data?.type !== 'scheduled_call') return;

  const slot: CallSlotId = data.slot || 'morning';
  const historyId: string = data.historyId || `call-${slot}-${Date.now()}`;
  const actionId = response.actionIdentifier;

  const Notifications = getNotifications();

  if (actionId === 'DECLINE') {
    // User pressed Decline action
    await updateCallEntry(historyId, { status: 'declined' });
    if (Notifications) {
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    }
  } else if (actionId === 'ANSWER') {
    // User pressed Answer action -> Go straight to active call
    await updateCallEntry(historyId, {
      status: 'answered',
      answeredAt: Date.now(),
    });
    if (Notifications) {
      await Notifications.dismissNotificationAsync(response.notification.request.identifier);
    }
    router.push({
      pathname: '/call',
      params: { slot, historyId },
    });
  } else {
    // User pressed notification body / full-screen intent -> Show incoming-call screen
    router.push({
      pathname: '/incoming-call',
      params: { slot, historyId },
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

  // Foreground notification received: if app is already open, show incoming-call screen directly
  const subReceived = Notifications.addNotificationReceivedListener((notification: any) => {
    const data = notification?.request?.content?.data;
    if (data?.type === 'scheduled_call') {
      const slot: CallSlotId = data.slot || 'morning';
      const historyId: string = data.historyId || `call-${slot}-${Date.now()}`;
      router.push({
        pathname: '/incoming-call',
        params: { slot, historyId },
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
