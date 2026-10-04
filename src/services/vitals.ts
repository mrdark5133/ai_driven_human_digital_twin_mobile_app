import { initHealthConnect, getLatestHeartRate } from './healthConnect';
import { getLatestManualReading } from './manualReadings';

export type VitalSource = 'Health Connect' | 'Entered from watch';

export interface VitalMetric<T = number> {
  value: T;
  source: VitalSource;
  timestamp: string; // ISO 8601 string
}

export interface CurrentVitals {
  heartRate: VitalMetric<number> | null;
  spo2: VitalMetric<number> | null;
  latestTimestamp: string | null;
  latestSource: VitalSource | null;
  isRecent: boolean;
  hasData: boolean;
}

const TEN_MINUTES_MS = 10 * 60 * 1000;

/**
 * Retrieves the current vitals:
 * - Heart rate: from Android Health Connect if present, else latest manual heart rate, else null.
 * - SpO2: from latest manual entry, else null.
 * Includes a source ("Health Connect" or "Entered from watch") and the real timestamp for each.
 */
export async function getCurrentVitals(): Promise<CurrentVitals> {
  let hcHeartRate: { bpm: number; time: string } | null = null;

  try {
    await initHealthConnect();
    hcHeartRate = await getLatestHeartRate();
  } catch (err) {
    console.warn('[VitalsService] Health Connect query error:', err);
  }

  let manualReading = null;
  try {
    manualReading = await getLatestManualReading();
  } catch (err) {
    console.warn('[VitalsService] Manual reading fetch error:', err);
  }

  // 1. Resolve Heart Rate
  let resolvedHeartRate: VitalMetric<number> | null = null;
  if (hcHeartRate && typeof hcHeartRate.bpm === 'number' && !isNaN(hcHeartRate.bpm)) {
    resolvedHeartRate = {
      value: hcHeartRate.bpm,
      source: 'Health Connect',
      timestamp: hcHeartRate.time,
    };
  } else if (
    manualReading &&
    typeof manualReading.heartRate === 'number' &&
    !isNaN(manualReading.heartRate)
  ) {
    resolvedHeartRate = {
      value: manualReading.heartRate,
      source: 'Entered from watch',
      timestamp: manualReading.timestamp,
    };
  }

  // 2. Resolve SpO2
  let resolvedSpo2: VitalMetric<number> | null = null;
  if (
    manualReading &&
    typeof manualReading.spo2 === 'number' &&
    !isNaN(manualReading.spo2)
  ) {
    resolvedSpo2 = {
      value: manualReading.spo2,
      source: 'Entered from watch',
      timestamp: manualReading.timestamp,
    };
  }

  // 3. Resolve most recent timestamp & source
  let latestTimestamp: string | null = null;
  let latestSource: VitalSource | null = null;

  if (resolvedHeartRate && resolvedSpo2) {
    const hrTime = new Date(resolvedHeartRate.timestamp).getTime();
    const spo2Time = new Date(resolvedSpo2.timestamp).getTime();
    if (hrTime >= spo2Time) {
      latestTimestamp = resolvedHeartRate.timestamp;
      latestSource = resolvedHeartRate.source;
    } else {
      latestTimestamp = resolvedSpo2.timestamp;
      latestSource = resolvedSpo2.source;
    }
  } else if (resolvedHeartRate) {
    latestTimestamp = resolvedHeartRate.timestamp;
    latestSource = resolvedHeartRate.source;
  } else if (resolvedSpo2) {
    latestTimestamp = resolvedSpo2.timestamp;
    latestSource = resolvedSpo2.source;
  }

  // 4. Calculate if reading is recent (< 10 minutes old)
  let isRecent = false;
  if (latestTimestamp) {
    const timeDiff = Date.now() - new Date(latestTimestamp).getTime();
    isRecent = timeDiff >= 0 && timeDiff < TEN_MINUTES_MS;
  }

  const hasData = resolvedHeartRate !== null || resolvedSpo2 !== null;

  return {
    heartRate: resolvedHeartRate,
    spo2: resolvedSpo2,
    latestTimestamp,
    latestSource,
    isRecent,
    hasData,
  };
}
