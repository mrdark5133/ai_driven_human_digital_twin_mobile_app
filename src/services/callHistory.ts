import AsyncStorage from '@react-native-async-storage/async-storage';
import { CALL_SLOTS, CallSlotId } from '../config/callSchedule';

export type CallStatus = 'answered' | 'missed' | 'declined';

export interface CallTurnRecord {
  role: 'user' | 'assistant';
  text: string;
  ts: number;
}

export interface CallHistoryEntry {
  id: string;
  slot: CallSlotId;
  scheduledAt: number;
  status: CallStatus;
  answeredAt?: number;
  endedAt?: number;
  durationSec?: number;
  turns?: CallTurnRecord[];
}

const STORAGE_KEY = '@ai_twin_call_history';
const LAST_RECONCILE_KEY = '@ai_twin_last_reconcile_check';
const MAX_ENTRIES = 200;

type HistoryListener = (history: CallHistoryEntry[]) => void;
const listeners = new Set<HistoryListener>();

let memoryCache: CallHistoryEntry[] | null = null;

function notifyListeners(entries: CallHistoryEntry[]): void {
  listeners.forEach((fn) => fn(entries));
}

/**
 * Subscribes to call history changes.
 */
export function subscribeCallHistory(listener: HistoryListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Retrieves all call history entries (up to 200), newest first.
 */
export async function getCallHistory(): Promise<CallHistoryEntry[]> {
  if (memoryCache !== null) {
    return [...memoryCache];
  }

  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      memoryCache = [];
      return [];
    }
    const parsed: CallHistoryEntry[] = JSON.parse(raw);
    memoryCache = Array.isArray(parsed) ? parsed : [];
    return [...memoryCache];
  } catch (err) {
    console.warn('[CallHistory] Failed to read call history:', err);
    memoryCache = [];
    return [];
  }
}

/**
 * Persists the entire history array to AsyncStorage, trimmed to the latest 200 entries.
 */
async function saveHistory(entries: CallHistoryEntry[]): Promise<void> {
  const sorted = [...entries].sort((a, b) => (b.scheduledAt || 0) - (a.scheduledAt || 0));
  const trimmed = sorted.slice(0, MAX_ENTRIES);
  memoryCache = trimmed;

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (err) {
    console.warn('[CallHistory] Failed to save history:', err);
  }

  notifyListeners(trimmed);
}

/**
 * Adds or replaces an entry in call history.
 */
export async function saveCallEntry(entry: CallHistoryEntry): Promise<void> {
  const current = await getCallHistory();
  const existingIndex = current.findIndex((e) => e.id === entry.id);

  if (existingIndex >= 0) {
    current[existingIndex] = { ...current[existingIndex], ...entry };
  } else {
    current.unshift(entry);
  }

  await saveHistory(current);
}

/**
 * Updates specific fields of an existing call history entry.
 */
export async function updateCallEntry(
  id: string,
  updates: Partial<CallHistoryEntry>
): Promise<void> {
  const current = await getCallHistory();
  const idx = current.findIndex((e) => e.id === id);

  if (idx >= 0) {
    current[idx] = { ...current[idx], ...updates };
    await saveHistory(current);
  }
}

/**
 * Appends a conversation turn to an existing call entry.
 */
export async function appendTurnToCallEntry(
  id: string,
  turn: CallTurnRecord
): Promise<void> {
  const current = await getCallHistory();
  const idx = current.findIndex((e) => e.id === id);

  if (idx >= 0) {
    const turns = current[idx].turns || [];
    current[idx].turns = [...turns, turn];
    await saveHistory(current);
  }
}

/**
 * Reconciles scheduled call times that passed while the app was closed or inactive.
 * For every scheduled slot time between the last check and now without an existing entry,
 * creates a "missed" call entry.
 */
export async function reconcile(): Promise<void> {
  try {
    const now = Date.now();
    const rawLastCheck = await AsyncStorage.getItem(LAST_RECONCILE_KEY);
    const lastCheck = rawLastCheck ? parseInt(rawLastCheck, 10) : now - 24 * 60 * 60 * 1000;

    // Save now as the last check point
    await AsyncStorage.setItem(LAST_RECONCILE_KEY, now.toString());

    // Do not check intervals longer than 7 days
    const searchStart = Math.max(lastCheck, now - 7 * 24 * 60 * 60 * 1000);
    const existing = await getCallHistory();

    const newMissedEntries: CallHistoryEntry[] = [];
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    // Scan day by day from searchStart to now
    let cursorDay = new Date(searchStart);
    cursorDay.setHours(0, 0, 0, 0);

    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);

    while (cursorDay.getTime() <= todayEnd.getTime()) {
      for (const slotKey of Object.keys(CALL_SLOTS) as CallSlotId[]) {
        const slot = CALL_SLOTS[slotKey];
        const slotTime = new Date(cursorDay);
        slotTime.setHours(slot.hour, slot.minute, 0, 0);
        const slotTimestamp = slotTime.getTime();

        // If the slot time falls strictly between searchStart and now
        // and at least 2 minutes have passed after the scheduled time
        if (slotTimestamp > searchStart && slotTimestamp <= now - 2 * 60 * 1000) {
          // Check if an entry already exists within 20 minutes of this slot time
          const alreadyRecorded = existing.some(
            (e) =>
              e.slot === slotKey &&
              Math.abs(e.scheduledAt - slotTimestamp) < 20 * 60 * 1000
          );

          if (!alreadyRecorded) {
            newMissedEntries.push({
              id: `call-missed-${slotKey}-${slotTimestamp}`,
              slot: slotKey,
              scheduledAt: slotTimestamp,
              status: 'missed',
            });
          }
        }
      }

      cursorDay = new Date(cursorDay.getTime() + ONE_DAY_MS);
    }

    if (newMissedEntries.length > 0) {
      console.log(`[CallHistory] Reconciled ${newMissedEntries.length} missed scheduled calls`);
      await saveHistory([...newMissedEntries, ...existing]);
    }
  } catch (err) {
    console.warn('[CallHistory] Reconcile error:', err);
  }
}
