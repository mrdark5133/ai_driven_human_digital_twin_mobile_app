import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ManualReading {
  heartRate: number | null; // bpm
  spo2: number | null;      // percentage (e.g., 98)
  timestamp: string;        // ISO string
}

const LATEST_MANUAL_READING_KEY = '@ai_twin_latest_manual_reading';
const MANUAL_READINGS_HISTORY_KEY = '@ai_twin_manual_readings_history';

/**
 * Saves a manual vital reading (heart rate bpm and/or SpO2 %) with a timestamp in AsyncStorage.
 */
export async function saveManualReading(data: {
  heartRate?: number | string | null;
  spo2?: number | string | null;
  timestamp?: string;
}): Promise<ManualReading> {
  try {
    const parsedHr =
      data.heartRate !== null && data.heartRate !== undefined && data.heartRate !== ''
        ? Math.round(Number(data.heartRate))
        : null;

    const parsedSpo2 =
      data.spo2 !== null && data.spo2 !== undefined && data.spo2 !== ''
        ? Math.round(Number(data.spo2))
        : null;

    const newReading: ManualReading = {
      heartRate: !isNaN(parsedHr as number) ? parsedHr : null,
      spo2: !isNaN(parsedSpo2 as number) ? parsedSpo2 : null,
      timestamp: data.timestamp || new Date().toISOString(),
    };

    // Save latest
    await AsyncStorage.setItem(
      LATEST_MANUAL_READING_KEY,
      JSON.stringify(newReading)
    );

    // Append to history
    const existingHistoryStr = await AsyncStorage.getItem(
      MANUAL_READINGS_HISTORY_KEY
    );
    const history: ManualReading[] = existingHistoryStr
      ? JSON.parse(existingHistoryStr)
      : [];
    history.unshift(newReading);

    // Keep last 100 entries
    if (history.length > 100) {
      history.length = 100;
    }

    await AsyncStorage.setItem(
      MANUAL_READINGS_HISTORY_KEY,
      JSON.stringify(history)
    );

    return newReading;
  } catch (err) {
    console.error('[ManualReadings] Failed to save manual reading:', err);
    throw err;
  }
}

/**
 * Reads the latest manual reading from AsyncStorage.
 * Returns null if no manual reading exists.
 */
export async function getLatestManualReading(): Promise<ManualReading | null> {
  try {
    const jsonStr = await AsyncStorage.getItem(LATEST_MANUAL_READING_KEY);
    if (!jsonStr) {
      return null;
    }
    const parsed = JSON.parse(jsonStr) as ManualReading;
    return parsed;
  } catch (err) {
    console.warn('[ManualReadings] Failed to get latest manual reading:', err);
    return null;
  }
}

/**
 * Reads all historical manual readings from AsyncStorage.
 */
export async function getManualReadingsHistory(): Promise<ManualReading[]> {
  try {
    const jsonStr = await AsyncStorage.getItem(MANUAL_READINGS_HISTORY_KEY);
    if (!jsonStr) {
      return [];
    }
    return JSON.parse(jsonStr) as ManualReading[];
  } catch (err) {
    console.warn('[ManualReadings] Failed to get manual readings history:', err);
    return [];
  }
}

/**
 * Clears stored manual readings (useful for testing or resetting).
 */
export async function clearManualReadings(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      LATEST_MANUAL_READING_KEY,
      MANUAL_READINGS_HISTORY_KEY,
    ]);
  } catch (err) {
    console.warn('[ManualReadings] Failed to clear manual readings:', err);
  }
}
