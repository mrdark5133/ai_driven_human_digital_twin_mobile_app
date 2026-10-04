import { Platform } from 'react-native';
import {
  initialize,
  requestPermission,
  readRecords,
  aggregateRecord,
  getSdkStatus,
  SdkAvailabilityStatus,
  HeartRateRecord,
  StepsRecord,
} from 'react-native-health-connect';

export interface HeartRateDataPoint {
  bpm: number;
  time: string;
}

export interface StepsDataPoint {
  steps: number;
  count: number;
  label: string;
  time: string;
  lastUpdated: string;
}

let isModuleAvailable: boolean | null = null;
let isInitialized = false;
let initPromise: Promise<boolean> | null = null;

/**
 * Initializes the Health Connect SDK if available on Android.
 * Returns true if initialization succeeded.
 */
export async function initHealthConnect(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  if (isModuleAvailable === false) {
    return false;
  }

  if (isInitialized) {
    return true;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const status = await getSdkStatus();
      isModuleAvailable = true;
      if (status !== SdkAvailabilityStatus.SDK_AVAILABLE) {
        return false;
      }
      const initialized = await initialize();
      isInitialized = !!initialized;
      return isInitialized;
    } catch (err: any) {
      if (err?.message?.includes?.("doesn't seem to be linked") || err?.message?.includes?.('Expo Go')) {
        if (isModuleAvailable === null) {
          console.info(
            '[HealthConnect] Running in Expo Go. Native Health Connect requires a Development Build / APK. Manual readings active.'
          );
        }
        isModuleAvailable = false;
      } else {
        console.warn('[HealthConnect] Failed to initialize Health Connect:', err);
      }
      return false;
    } finally {
      initPromise = null;
    }
  })();

  return initPromise;
}

/**
 * Requests read permissions for HeartRate and Steps.
 * Returns true if permissions were successfully requested/granted.
 */
export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return false;
  }

  const ready = await initHealthConnect();
  if (!ready) {
    return false;
  }

  try {
    const granted = await requestPermission([
      { accessType: 'read', recordType: 'HeartRate' },
      { accessType: 'read', recordType: 'Steps' },
    ]);
    return Array.isArray(granted) && granted.length > 0;
  } catch (err) {
    console.warn('[HealthConnect] Failed to request permissions:', err);
    return false;
  }
}

/**
 * Gets the latest heart rate reading across all data sources.
 * Returns { bpm, time } or null if no data exists.
 */
export async function getLatestHeartRate(): Promise<HeartRateDataPoint | null> {
  if (Platform.OS !== 'android' || isModuleAvailable === false) {
    return null;
  }

  const ready = await initHealthConnect();
  if (!ready) {
    return null;
  }

  try {
    // Read heart rate records within the last 30 days without dataOriginFilter to read from all data sources
    const startTime = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const result = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'after',
        startTime,
      },
      ascendingOrder: false,
      pageSize: 100,
    });

    if (!result || !result.records || result.records.length === 0) {
      return null;
    }

    let latestSample: { bpm: number; time: string } | null = null;

    for (const record of result.records as HeartRateRecord[]) {
      if (record.samples && record.samples.length > 0) {
        for (const sample of record.samples) {
          const sampleTime = sample.time;
          if (
            !latestSample ||
            new Date(sampleTime).getTime() > new Date(latestSample.time).getTime()
          ) {
            latestSample = {
              bpm: Math.round(sample.beatsPerMinute),
              time: sampleTime,
            };
          }
        }
      }
    }

    return latestSample;
  } catch (err: any) {
    if (err?.message?.includes?.("doesn't seem to be linked") || err?.message?.includes?.('Expo Go')) {
      isModuleAvailable = false;
    } else {
      console.warn('[HealthConnect] Failed to get latest heart rate:', err);
    }
    return null;
  }
}

/**
 * Gets all heart rate samples recorded today across all data sources.
 * Returns array of { bpm, time } sorted chronologically, or null if no data exists.
 */
export async function getTodayHeartRates(): Promise<HeartRateDataPoint[] | null> {
  if (Platform.OS !== 'android' || isModuleAvailable === false) {
    return null;
  }

  const ready = await initHealthConnect();
  if (!ready) {
    return null;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const result = await readRecords('HeartRate', {
      timeRangeFilter: {
        operator: 'after',
        startTime: startOfDay.toISOString(),
      },
      ascendingOrder: true,
    });

    if (!result || !result.records || result.records.length === 0) {
      return null;
    }

    const allSamples: HeartRateDataPoint[] = [];

    for (const record of result.records as HeartRateRecord[]) {
      if (record.samples && record.samples.length > 0) {
        for (const sample of record.samples) {
          allSamples.push({
            bpm: Math.round(sample.beatsPerMinute),
            time: sample.time,
          });
        }
      }
    }

    if (allSamples.length === 0) {
      return null;
    }

    // Sort ascending by time
    allSamples.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    return allSamples;
  } catch (err: any) {
    if (err?.message?.includes?.("doesn't seem to be linked") || err?.message?.includes?.('Expo Go')) {
      isModuleAvailable = false;
    } else {
      console.warn('[HealthConnect] Failed to get today heart rates:', err);
    }
    return null;
  }
}

/**
 * Gets total steps recorded today using aggregateRecord to apply Health Connect's data source priority.
 * Reads from start of today to now so steps are not double-counted.
 * Returns { steps, count, label: "Steps (phone)", time, lastUpdated } or null if no data exists.
 */
export async function getTodaySteps(): Promise<StepsDataPoint | null> {
  if (Platform.OS !== 'android' || isModuleAvailable === false) {
    return null;
  }

  const ready = await initHealthConnect();
  if (!ready) {
    return null;
  }

  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const now = new Date();

    const result = await aggregateRecord({
      recordType: 'Steps',
      timeRangeFilter: {
        operator: 'between',
        startTime: startOfDay.toISOString(),
        endTime: now.toISOString(),
      },
    });

    if (
      !result ||
      typeof result.COUNT_TOTAL !== 'number' ||
      isNaN(result.COUNT_TOTAL) ||
      (result.COUNT_TOTAL === 0 && (!result.dataOrigins || result.dataOrigins.length === 0))
    ) {
      return null;
    }

    const totalSteps = Math.round(result.COUNT_TOTAL);
    const nowIso = now.toISOString();

    return {
      steps: totalSteps,
      count: totalSteps,
      label: 'Steps (phone)',
      time: nowIso,
      lastUpdated: nowIso,
    };
  } catch (err: any) {
    if (err?.message?.includes?.("doesn't seem to be linked") || err?.message?.includes?.('Expo Go')) {
      isModuleAvailable = false;
    } else {
      console.warn('[HealthConnect] Failed to get today steps:', err);
    }
    return null;
  }
}
