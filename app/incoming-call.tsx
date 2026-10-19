import React, { useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CallSlotId } from '../src/config/callSchedule';

/**
 * Forwarding screen: redirects incoming calls directly to app/call.tsx in incoming mode.
 */
export default function IncomingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: CallSlotId | 'night'; historyId?: string }>();

  useEffect(() => {
    router.replace({
      pathname: '/call',
      params: {
        mode: 'incoming',
        slot: params.slot,
        historyId: params.historyId,
      },
    });
  }, [params.slot, params.historyId]);

  return null;
}
