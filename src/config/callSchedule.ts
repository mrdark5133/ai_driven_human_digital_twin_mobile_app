/**
 * Call schedule slot configuration for AURA scheduled in-app check-ins.
 */

export type CallSlotId = 'morning' | 'evening';

export interface CallSlotConfig {
  id: CallSlotId;
  label: string;
  hour: number;
  minute: number;
}

export const CALL_SLOTS: Record<CallSlotId, CallSlotConfig> = {
  morning: {
    id: 'morning',
    label: 'Morning check-in',
    hour: 8,
    minute: 45,
  },
  evening: {
    id: 'evening',
    label: 'Evening check-in',
    hour: 21,
    minute: 0,
  },
};

export const MORNING_SLOT = CALL_SLOTS.morning;
export const EVENING_SLOT = CALL_SLOTS.evening;

/**
 * Returns the next Date object for a given slot.
 * If the scheduled time for today has already passed, returns tomorrow at the scheduled time.
 */
export function getNextSlotDate(slot: CallSlotConfig, fromDate: Date = new Date()): Date {
  const target = new Date(fromDate);
  target.setHours(slot.hour, slot.minute, 0, 0);

  if (target.getTime() <= fromDate.getTime()) {
    // Already passed today, schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }

  return target;
}
