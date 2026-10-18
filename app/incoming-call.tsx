import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme/tokens';
import { CallSlotId, CALL_SLOTS } from '../src/config/callSchedule';
import { updateCallEntry, saveCallEntry } from '../src/services/callHistory';
import { ASSISTANT_NAME } from '../src/config/appConfig';
import { warmupLlmContext } from '../src/services/voice/llm';

export default function IncomingCallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ slot?: CallSlotId; historyId?: string }>();

  const slot: CallSlotId = params.slot || 'morning';
  const historyId = params.historyId || `call-${slot}-${Date.now()}`;
  const slotLabel = CALL_SLOTS[slot]?.label || 'Scheduled check-in';

  // Pulse animation values
  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseAnim3 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Start continuous vibration pattern: 1s vibrate, 1s rest
    Vibration.vibrate([0, 1000, 1000], true);

    // 2. Pulse animations for concentric caller rings
    const createPulse = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1.45,
            duration: 1800,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 1.0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
    };

    const loop1 = createPulse(pulseAnim1, 0);
    const loop2 = createPulse(pulseAnim2, 400);
    const loop3 = createPulse(pulseAnim3, 800);

    loop1.start();
    loop2.start();
    loop3.start();

    // 3. 45-Second timeout: if unanswered, mark as missed and dismiss
    const timeout = setTimeout(async () => {
      Vibration.cancel();
      await updateCallEntry(historyId, { status: 'missed' });
      router.back();
    }, 45000);

    return () => {
      Vibration.cancel();
      clearTimeout(timeout);
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [historyId]);

  const handleAnswer = async () => {
    Vibration.cancel();

    // Trigger LLM prefix warm-up immediately so it processes the real system prompt while the opener plays
    warmupLlmContext({ slot }).catch((err) => {
      console.warn('[IncomingCall] Warm-up error (non-critical):', err);
    });

    // Ensure entry exists and is marked answered
    await saveCallEntry({
      id: historyId,
      slot,
      scheduledAt: Date.now(),
      status: 'answered',
      answeredAt: Date.now(),
    });

    router.replace({
      pathname: '/call',
      params: { slot, historyId },
    });
  };

  const handleDecline = async () => {
    Vibration.cancel();

    await saveCallEntry({
      id: historyId,
      slot,
      scheduledAt: Date.now(),
      status: 'declined',
    });

    router.back();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Caller Information */}
      <View style={styles.topSection}>
        <View style={styles.badge}>
          <MaterialIcons name="schedule" size={14} color={colors.primary} />
          <Text style={styles.badgeText}>{slotLabel.toUpperCase()}</Text>
        </View>

        <Text style={styles.callerName}>{ASSISTANT_NAME}</Text>
        <Text style={styles.callingStatusText}>{ASSISTANT_NAME} is calling...</Text>
      </View>

      {/* Central Pulsing Calling Orb */}
      <View style={styles.orbContainer}>
        {/* Animated Expanding Rings */}
        <Animated.View
          style={[
            styles.animatedRing,
            {
              transform: [{ scale: pulseAnim1 }],
              opacity: pulseAnim1.interpolate({
                inputRange: [1, 1.45],
                outputRange: [0.6, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animatedRing,
            {
              transform: [{ scale: pulseAnim2 }],
              opacity: pulseAnim2.interpolate({
                inputRange: [1, 1.45],
                outputRange: [0.5, 0],
              }),
            },
          ]}
        />
        <Animated.View
          style={[
            styles.animatedRing,
            {
              transform: [{ scale: pulseAnim3 }],
              opacity: pulseAnim3.interpolate({
                inputRange: [1, 1.45],
                outputRange: [0.4, 0],
              }),
            },
          ]}
        />

        {/* Central Core Avatar */}
        <View style={styles.orbCore}>
          <MaterialIcons name="psychology" size={54} color={colors.primary} />
        </View>
      </View>

      {/* Bottom Answer / Decline Action Buttons (WhatsApp Style) */}
      <View style={styles.bottomSection}>
        <View style={styles.actionButtonsRow}>
          {/* Decline Button */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.declineButton}
              onPress={handleDecline}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call-end" size={32} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Decline</Text>
          </View>

          {/* Answer Button */}
          <View style={styles.actionCol}>
            <TouchableOpacity
              style={styles.answerButton}
              onPress={handleAnswer}
              activeOpacity={0.8}
            >
              <MaterialIcons name="call" size={32} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.actionLabel}>Answer</Text>
          </View>
        </View>

        <Text style={styles.timeoutHint}>Auto-closes in 45s if unanswered</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070e1c',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  topSection: {
    alignItems: 'center',
    paddingTop: space.lg,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.3)',
    marginBottom: space.md,
  },
  badgeText: {
    ...type.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  callerName: {
    ...type.headline,
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 36,
    letterSpacing: 1.5,
    marginBottom: space.xs,
  },
  callingStatusText: {
    ...type.title,
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '500',
  },

  /* Orb Area */
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    position: 'relative',
  },
  animatedRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(76, 215, 246, 0.06)',
  },
  orbCore: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    borderWidth: 2.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 8,
  },

  /* Actions */
  bottomSection: {
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.md,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: space.lg,
  },
  actionCol: {
    alignItems: 'center',
    gap: 8,
  },
  declineButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  answerButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  actionLabel: {
    ...type.bodySm,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  timeoutHint: {
    ...type.bodySm,
    color: colors.outline,
    fontSize: 11,
  },
});
