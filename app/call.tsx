import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
  TextInput,
  Modal,
  ScrollView,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme/tokens';
import { isModelDownloaded, downloadModel, cancelModelDownload } from '../src/services/voice/modelManager';
import { callAgent, CallAgentEvent, MAX_TURNS } from '../src/services/voice/callAgent';
import {
  getAsrLocale,
  setAsrLocale,
  AsrLocale,
  checkOfflineLocaleInstalled,
  triggerOfflineModelDownload,
  checkDefaultRecognizer,
  isAsrAvailable,
} from '../src/services/voice/asr';
import { warmupLlmContext } from '../src/services/voice/llm';
import { CallSlotId } from '../src/config/callSchedule';
import { ASSISTANT_NAME } from '../src/config/appConfig';
import {
  getLocalVoicesAsync,
  getSelectedVoice,
  setSelectedVoice,
  playVoiceSample,
} from '../src/services/voice/tts';
import type { Voice } from 'expo-speech';
import { startRingtone, stopRingtone } from '../src/services/ringtonePlayer';
import { updateCallEntry, saveCallEntry } from '../src/services/callHistory';

export default function CallScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    slot?: CallSlotId | 'night';
    historyId?: string;
    mode?: 'incoming' | 'active';
  }>();

  const [callMode, setCallMode] = useState<'incoming' | 'active'>(
    params.mode === 'incoming' ? 'incoming' : 'active'
  );

  // Model download state
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState({ written: 0, total: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Call duration timer
  const [callSeconds, setCallSeconds] = useState(0);

  // Offline speech pack state
  const [isOfflineInstalled, setIsOfflineInstalled] = useState(true);
  const [isDownloadingOffline, setIsDownloadingOffline] = useState(false);
  const [offlineStatusMsg, setOfflineStatusMsg] = useState<string | null>(null);

  // Debug bottom sheet modal state
  const [showDebugModal, setShowDebugModal] = useState(false);

  // Agent call state
  const [agentEvent, setAgentEvent] = useState<CallAgentEvent>({
    state: 'idle',
    userTranscript: '',
    aiResponse: '',
    debugMetrics: {
      timeToFirstTokenMs: null,
      timeToFirstSpokenSentenceMs: null,
      tokensPerSecond: null,
      tokensGenerated: null,
    },
    errorMessage: null,
    isMuted: false,
    turnCount: 0,
    micLevel: -2,
    cycleMaxLevel: -2,
    tapToTalkMode: false,
    micActive: false,
    isTapToTalk: false,
    requiresSettings: false,
    notGoogleRecognizer: false,
    recognizerPackage: '',
    asrMode: 'online',
    activeLocale: 'en-IN',
    isAllLocal: false,
    isLanguagePackMissing: false,
    isAsrAvailable: isAsrAvailable(),
  });

  const [currentLocale, setCurrentLocale] = useState<AsrLocale>('en-IN');
  const [typedMessage, setTypedMessage] = useState('');
  const [devInputText, setDevInputText] = useState('');
  const [localVoices, setLocalVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(undefined);
  const asrAvailable = agentEvent.isAsrAvailable ?? isAsrAvailable();

  // Voice wave reactive animations
  const micAnim = useRef(new Animated.Value(1)).current;
  const speakingPulse = useRef(new Animated.Value(1)).current;

  // Incoming call pulsing rings animation
  const incomingPulse1 = useRef(new Animated.Value(1)).current;
  const incomingPulse2 = useRef(new Animated.Value(1)).current;
  const incomingPulse3 = useRef(new Animated.Value(1)).current;

  // Incoming ringing & 45-second timeout effect
  useEffect(() => {
    if (callMode !== 'incoming') return;

    startRingtone();

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

    const loop1 = createPulse(incomingPulse1, 0);
    const loop2 = createPulse(incomingPulse2, 400);
    const loop3 = createPulse(incomingPulse3, 800);
    loop1.start();
    loop2.start();
    loop3.start();

    const rawSlot = params.slot;
    const normalizedSlot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
    const historyId = params.historyId || `call-${normalizedSlot}-${Date.now()}`;

    const timeout = setTimeout(async () => {
      stopRingtone();
      await updateCallEntry(historyId, { status: 'missed' });
      router.back();
    }, 45000);

    return () => {
      stopRingtone();
      clearTimeout(timeout);
      loop1.stop();
      loop2.stop();
      loop3.stop();
    };
  }, [callMode, params.slot, params.historyId]);

  const handleAcceptIncoming = async () => {
    stopRingtone();
    const rawSlot = params.slot;
    const normalizedSlot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
    const historyId = params.historyId || `call-${normalizedSlot}-${Date.now()}`;

    await saveCallEntry({
      id: historyId,
      slot: normalizedSlot,
      scheduledAt: Date.now(),
      status: 'answered',
      answeredAt: Date.now(),
    });

    warmupLlmContext({ slot: normalizedSlot }).catch((err) => {
      console.warn('[CallScreen] Warm-up error (non-critical):', err);
    });

    setCallMode('active');
  };

  const handleDeclineIncoming = async () => {
    stopRingtone();
    const rawSlot = params.slot;
    const normalizedSlot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
    const historyId = params.historyId || `call-${normalizedSlot}-${Date.now()}`;

    await updateCallEntry(historyId, { status: 'missed' });
    router.back();
  };

  // 1. Check offline language pack availability
  useEffect(() => {
    let active = true;
    checkOfflineLocaleInstalled(currentLocale).then((installed) => {
      if (active) setIsOfflineInstalled(installed);
    });
    return () => {
      active = false;
    };
  }, [currentLocale]);

  // 2. Initial check for model file, background LLM warm-up & start call
  useEffect(() => {
    if (callMode === 'incoming') return;

    let mounted = true;

    // Reset locale to en-IN for call
    setAsrLocale('en-IN');
    setCurrentLocale('en-IN');

    (async () => {
      const ready = await isModelDownloaded();
      if (mounted) {
        setModelReady(ready);
        if (ready) {
          const rawSlot = params.slot;
          const normalizedSlot: CallSlotId = rawSlot === 'night' ? 'evening' : (rawSlot || 'morning');
          // Warm up LLM context with real prefix for this specific slot
          warmupLlmContext({ slot: normalizedSlot }).catch((err) => {
            console.warn('[CallScreen] Warm-up error (non-critical):', err);
          });

          await callAgent.startCall({
            slot: normalizedSlot,
            historyId: params.historyId,
          });
        }
      }
    })();

    const unsubscribe = callAgent.subscribe((event) => {
      if (mounted) {
        setAgentEvent(event);
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
      callAgent.endCall();
      cancelModelDownload();
    };
  }, [callMode, params.slot, params.historyId]);

  // 3. Call seconds elapsed timer
  useEffect(() => {
    let timer: any = null;
    if (callMode === 'active' && modelReady && agentEvent.state !== 'error') {
      timer = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [callMode, modelReady, agentEvent.state]);

  // 4. Live Mic volume reactive wave scaling
  useEffect(() => {
    if (agentEvent.state === 'listening' && agentEvent.micLevel > 0) {
      // micLevel ranges between 0 and 10; scale outer wave dynamically
      const targetScale = 1 + Math.min(0.28, agentEvent.micLevel * 0.028);
      Animated.timing(micAnim, {
        toValue: targetScale,
        duration: 120,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(micAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [agentEvent.micLevel, agentEvent.state]);

  // 5. Speaking pulse wave animation
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    if (agentEvent.state === 'speaking') {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(speakingPulse, {
            toValue: 1.15,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(speakingPulse, {
            toValue: 0.96,
            duration: 650,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    } else {
      speakingPulse.setValue(1);
    }

    return () => {
      if (loop) loop.stop();
    };
  }, [agentEvent.state]);

  // Actions
  const handleEndCall = async () => {
    await callAgent.endCall();
    router.back();
  };

  const handleToggleMute = async () => {
    await callAgent.toggleMute();
  };

  const handleToggleTapToTalk = async () => {
    await callAgent.toggleTapToTalkMode();
  };

  const handleTapToTalkMicPress = async () => {
    await callAgent.handleTapToTalkPress();
  };

  const handleRetryListening = async () => {
    await callAgent.retryAfterError();
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      console.warn('Failed to open app settings:', err);
    }
  };

  const handleToggleLocale = () => {
    const nextLocale: AsrLocale = currentLocale === 'en-IN' ? 'ta-IN' : 'en-IN';
    setAsrLocale(nextLocale);
    setCurrentLocale(nextLocale);
  };

  const handleSendTypedMessage = async () => {
    const text = typedMessage.trim();
    if (!text) return;
    setTypedMessage('');
    await callAgent.sendTextMessage(text);
  };

  const handleSendDevText = async () => {
    if (!devInputText.trim()) return;
    const text = devInputText.trim();
    setDevInputText('');
    await callAgent.sendDevUtterance(text);
  };

  const handleDownloadOfflinePack = async () => {
    setIsDownloadingOffline(true);
    setOfflineStatusMsg('Requesting offline speech pack...');
    try {
      const res = await triggerOfflineModelDownload(currentLocale);
      setOfflineStatusMsg(res.message || 'Speech pack download initiated.');
      setTimeout(async () => {
        const installed = await checkOfflineLocaleInstalled(currentLocale);
        setIsOfflineInstalled(installed);
        setIsDownloadingOffline(false);
        if (installed) {
          setOfflineStatusMsg(null);
        }
      }, 3000);
    } catch (err: any) {
      setIsDownloadingOffline(false);
      setOfflineStatusMsg(err?.message || 'Download request failed.');
    }
  };

  const handleStartDownload = async () => {
    setIsDownloading(true);
    setDownloadError(null);
    try {
      await downloadModel((progress, written, total) => {
        setDownloadProgress(progress);
        setDownloadBytes({ written, total });
      });
      setModelReady(true);
      setIsDownloading(false);
      warmupLlmContext().catch(() => {});
      const normalizedSlot: CallSlotId = params.slot === 'night' ? 'evening' : (params.slot || 'morning');
      await callAgent.startCall({
        slot: normalizedSlot,
        historyId: params.historyId,
      });
    } catch (err: any) {
      setIsDownloading(false);
      setDownloadError(err?.message || 'Download failed. Please check network connection.');
    }
  };

  const formatTimer = (totalSeconds: number) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const formatMb = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  const getStatusColor = () => {
    switch (agentEvent.state) {
      case 'listening':
        return colors.teal;
      case 'thinking':
        return colors.amber;
      case 'speaking':
        return colors.green;
      case 'error':
        return colors.red;
      default:
        return colors.outline;
    }
  };

  const getStatusText = () => {
    if (agentEvent.isMuted) return 'Muted';
    switch (agentEvent.state) {
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return 'Notice';
      case 'idle':
        return !asrAvailable ? 'Type to reply' : agentEvent.tapToTalkMode ? 'Tap mic to talk' : 'Connected';
      default:
        return 'Connecting...';
    }
  };

  // Load available local en-IN voices when debug modal opens
  useEffect(() => {
    if (showDebugModal) {
      getLocalVoicesAsync().then((voices) => {
        setLocalVoices(voices);
        setSelectedVoiceId(getSelectedVoice());
      });
    }
  }, [showDebugModal]);

  if (callMode === 'incoming') {
    const rawSlot = params.slot;
    const isMorning = rawSlot === 'morning' || (!rawSlot && new Date().getHours() < 12);
    const slotLabel = isMorning ? 'Morning check-in' : 'Evening check-in';

    return (
      <SafeAreaView style={styles.incomingContainer} edges={['top', 'bottom']}>
        {/* Top Caller Information */}
        <View style={styles.incomingTopSection}>
          <View style={styles.incomingBadge}>
            <MaterialIcons name="schedule" size={14} color={colors.primary} />
            <Text style={styles.incomingBadgeText}>{slotLabel.toUpperCase()}</Text>
          </View>

          <Text style={styles.incomingCallerName}>Pallavi</Text>
          <Text style={styles.incomingCallingStatusText}>Pallavi is calling...</Text>
        </View>

        {/* Central Pulsing Caller Orb */}
        <View style={styles.incomingOrbContainer}>
          <Animated.View
            style={[
              styles.incomingAnimatedRing,
              {
                transform: [{ scale: incomingPulse1 }],
                opacity: incomingPulse1.interpolate({
                  inputRange: [1, 1.45],
                  outputRange: [0.6, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.incomingAnimatedRing,
              {
                transform: [{ scale: incomingPulse2 }],
                opacity: incomingPulse2.interpolate({
                  inputRange: [1, 1.45],
                  outputRange: [0.5, 0],
                }),
              },
            ]}
          />
          <Animated.View
            style={[
              styles.incomingAnimatedRing,
              {
                transform: [{ scale: incomingPulse3 }],
                opacity: incomingPulse3.interpolate({
                  inputRange: [1, 1.45],
                  outputRange: [0.4, 0],
                }),
              },
            ]}
          />

          <View style={styles.incomingOrbCore}>
            <Text style={styles.incomingAvatarLetter}>P</Text>
          </View>
        </View>

        {/* Bottom Accept / Decline Buttons */}
        <View style={styles.incomingBottomSection}>
          <View style={styles.incomingActionButtonsRow}>
            {/* Decline Button */}
            <View style={styles.incomingActionCol}>
              <TouchableOpacity
                style={styles.incomingDeclineBtn}
                onPress={handleDeclineIncoming}
                activeOpacity={0.8}
              >
                <MaterialIcons name="call-end" size={32} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.incomingActionLabel}>Decline</Text>
            </View>

            {/* Accept Button */}
            <View style={styles.incomingActionCol}>
              <TouchableOpacity
                style={styles.incomingAcceptBtn}
                onPress={handleAcceptIncoming}
                activeOpacity={0.8}
              >
                <MaterialIcons name="call" size={32} color="#ffffff" />
              </TouchableOpacity>
              <Text style={styles.incomingActionLabel}>Accept</Text>
            </View>
          </View>

          <Text style={styles.incomingTimeoutHint}>Auto-closes in 45s if unanswered</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header: WhatsApp / Telegram voice call style */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={handleEndCall}
          activeOpacity={0.7}
        >
          <MaterialIcons name="keyboard-arrow-down" size={30} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.headerSecurityPill}>
          <MaterialIcons
            name={agentEvent.isAllLocal ? 'lock' : 'cloud-queue'}
            size={11}
            color={colors.teal}
          />
          <Text
            style={
              agentEvent.isAllLocal
                ? styles.headerSecurityText
                : styles.headerSecurityTextHybrid
            }
          >
            {agentEvent.isAllLocal ? '100% On-Device' : 'On-device AI + Google speech'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          onPress={() => setShowDebugModal(true)}
          activeOpacity={0.7}
        >
          <MaterialIcons name="tune" size={22} color={colors.textDim} />
        </TouchableOpacity>
      </View>

      {/* Model Download Screen (First Use) */}
      {modelReady === false ? (
        <View style={styles.downloadContainer}>
          <View style={styles.downloadIconRing}>
            <MaterialIcons name="cloud-download" size={44} color={colors.primary} />
          </View>
          <Text style={styles.downloadTitle}>Setup {ASSISTANT_NAME} Intelligence</Text>
          <Text style={styles.downloadDescription}>
            To run 100% on-device with zero server subscription or latency, {ASSISTANT_NAME} uses
            Qwen2.5-1.5B (~1.1 GB). This is downloaded once to your phone.
          </Text>

          {isDownloading ? (
            <View style={styles.progressSection}>
              <View style={styles.progressBarTrack}>
                <View
                  style={[
                    styles.progressBarFill,
                    { width: `${Math.round(downloadProgress * 100)}%` },
                  ]}
                />
              </View>
              <View style={styles.progressLabelsRow}>
                <Text style={styles.progressPercentText}>
                  {Math.round(downloadProgress * 100)}%
                </Text>
                {downloadBytes.total > 0 && (
                  <Text style={styles.progressMbText}>
                    {formatMb(downloadBytes.written)} MB / {formatMb(downloadBytes.total)} MB
                  </Text>
                )}
              </View>
              <Text style={styles.downloadingHintText}>
                Please keep the app open while downloading...
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={handleStartDownload}
              activeOpacity={0.85}
            >
              <MaterialIcons name="download" size={20} color="#070e1c" />
              <Text style={styles.downloadButtonText}>Download Model (1.1 GB)</Text>
            </TouchableOpacity>
          )}

          {downloadError && (
            <View style={styles.errorBanner}>
              <MaterialIcons name="error-outline" size={18} color={colors.red} />
              <Text style={styles.errorBannerText}>{downloadError}</Text>
            </View>
          )}
        </View>
      ) : (
        /* Active WhatsApp/Telegram Call Interface */
        <View style={styles.callContent}>
          {/* Caller Identity Block */}
          <View style={styles.callerIdentity}>
            <Text style={styles.callerName}>{ASSISTANT_NAME}</Text>
            <Text style={styles.callTimerText}>{formatTimer(callSeconds)}</Text>

            {/* Calm Status Line under Name */}
            {agentEvent.errorMessage ? (
              <View style={styles.calmErrorRow}>
                <Text style={styles.calmErrorText} numberOfLines={2}>
                  {agentEvent.errorMessage}
                </Text>
                {agentEvent.isLanguagePackMissing ? (
                  <View style={styles.calmActionsGroup}>
                    <TouchableOpacity
                      style={styles.calmActionBtnSecondary}
                      onPress={handleDownloadOfflinePack}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.calmActionBtnSecondaryText}>Download pack</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.calmActionBtn}
                      onPress={handleRetryListening}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.calmActionBtnText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : agentEvent.requiresSettings ? (
                  <TouchableOpacity
                    style={styles.calmActionBtn}
                    onPress={handleOpenSettings}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calmActionBtnText}>Settings</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.calmActionBtn}
                    onPress={handleRetryListening}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.calmActionBtnText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
                <Text style={[styles.statusText, { color: getStatusColor() }]}>
                  {getStatusText()}
                </Text>
              </View>
            )}
          </View>

          {/* Central Avatar & Soft Wave Rings */}
          <View style={styles.avatarStage}>
            <TouchableOpacity
              onLongPress={() => setShowDebugModal(true)}
              activeOpacity={0.9}
              style={styles.avatarTouchTarget}
            >
              {/* Outer pulsing ring reacting to mic level or speaking */}
              <Animated.View
                style={[
                  styles.waveRingOuter,
                  {
                    borderColor: getStatusColor() + '33',
                    transform: [
                      {
                        scale:
                          agentEvent.state === 'speaking'
                            ? speakingPulse
                            : agentEvent.state === 'listening'
                            ? micAnim
                            : 1,
                      },
                    ],
                  },
                ]}
              >
                {/* Inner soft ring */}
                <View
                  style={[
                    styles.waveRingInner,
                    { borderColor: getStatusColor() + '66' },
                  ]}
                >
                  {/* Avatar Center Core */}
                  <View style={[styles.avatarCircle, { backgroundColor: colors.cardHigh }]}>
                    <Text style={styles.avatarLetter}>P</Text>
                  </View>
                </View>
              </Animated.View>
            </TouchableOpacity>

            {/* Live Mic Audio Meter */}
            <View style={styles.micMeterContainer}>
              {[0, 1, 2, 3, 4].map((i) => {
                const threshold = (i + 1) * 1.8;
                const isLit = agentEvent.micLevel >= threshold;
                return (
                  <View
                    key={i}
                    style={[
                      styles.micMeterBar,
                      { height: 8 + i * 4 },
                      isLit && styles.micMeterBarActive,
                    ]}
                  />
                );
              })}
            </View>
          </View>

          {/* Live Captions (Telegram/WhatsApp Voice Call style) */}
          <View style={styles.captionsContainer}>
            {agentEvent.aiResponse ? (
              <View style={styles.captionAiBox}>
                <Text style={styles.captionAiLabel}>{ASSISTANT_NAME}</Text>
                <Text style={styles.captionAiText} numberOfLines={2}>
                  {agentEvent.aiResponse}
                </Text>
              </View>
            ) : null}

            <View style={styles.captionUserBox}>
              <Text style={styles.captionUserLabel}>You</Text>
              <Text style={styles.captionUserText} numberOfLines={2}>
                {agentEvent.userTranscript ? (
                  agentEvent.userTranscript
                ) : agentEvent.state === 'listening' ? (
                  <Text style={styles.captionListeningHint}>Listening...</Text>
                ) : !asrAvailable ? (
                  'Type your reply below...'
                ) : (
                  '...'
                )}
              </Text>
            </View>
          </View>

          {/* Bottom Call Controls Bar */}
          <View style={styles.bottomControlsBar}>
            {!asrAvailable ? (
              /* Fallback Typed Input Controls when ASR is unavailable */
              <View style={styles.typedContainer}>
                <View style={styles.asrFallbackNoticeBox}>
                  <MaterialIcons name="info-outline" size={16} color={colors.amber} style={{ marginTop: 1 }} />
                  <Text style={styles.asrFallbackNoticeText}>
                    Voice input needs the installed app build. You can type your reply instead.
                  </Text>
                </View>
                <View style={styles.typedInputRow}>
                  <TextInput
                    style={styles.typedInput}
                    placeholder={
                      agentEvent.state === 'thinking' || agentEvent.state === 'speaking'
                        ? `${ASSISTANT_NAME} is replying...`
                        : 'Type your reply...'
                    }
                    placeholderTextColor={colors.textDim}
                    value={typedMessage}
                    onChangeText={setTypedMessage}
                    onSubmitEditing={handleSendTypedMessage}
                    editable={agentEvent.state !== 'thinking' && agentEvent.state !== 'speaking'}
                    returnKeyType="send"
                  />
                  <TouchableOpacity
                    style={[
                      styles.typedSendBtn,
                      (!typedMessage.trim() ||
                        agentEvent.state === 'thinking' ||
                        agentEvent.state === 'speaking') &&
                        styles.typedSendBtnDisabled,
                    ]}
                    onPress={handleSendTypedMessage}
                    disabled={
                      !typedMessage.trim() ||
                      agentEvent.state === 'thinking' ||
                      agentEvent.state === 'speaking'
                    }
                    activeOpacity={0.8}
                  >
                    <MaterialIcons name="send" size={20} color="#070e1c" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.endCallCircleBtnSmall}
                    onPress={handleEndCall}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons name="call-end" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>
              </View>
            ) : agentEvent.tapToTalkMode ? (
              /* Tap-to-Talk Mode Controls */
              <View style={styles.controlsRow}>
                {/* Mode Toggle Button: Switch back to Hands-Free */}
                <TouchableOpacity
                  style={styles.controlCircleBtn}
                  onPress={handleToggleTapToTalk}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="hearing" size={24} color={colors.text} />
                  <Text style={styles.controlBtnLabel}>Hands-free</Text>
                </TouchableOpacity>

                {/* Big Center Push-to-Talk Mic Button */}
                <TouchableOpacity
                  style={[
                    styles.bigPushToTalkBtn,
                    agentEvent.micActive && styles.bigPushToTalkBtnActive,
                  ]}
                  onPress={handleTapToTalkMicPress}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name={agentEvent.micActive ? 'send' : 'mic'}
                    size={36}
                    color={agentEvent.micActive ? '#ffffff' : '#070e1c'}
                  />
                  <Text
                    style={[
                      styles.bigPushToTalkLabel,
                      agentEvent.micActive && { color: '#ffffff' },
                    ]}
                  >
                    {agentEvent.micActive ? 'Tap to Send' : 'Tap to Talk'}
                  </Text>
                </TouchableOpacity>

                {/* End Call Button */}
                <TouchableOpacity
                  style={styles.endCallCircleBtn}
                  onPress={handleEndCall}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="call-end" size={30} color="#ffffff" />
                </TouchableOpacity>
              </View>
            ) : (
              /* Hands-Free Standard Call Controls */
              <View style={styles.controlsRow}>
                {/* Mute Button */}
                <TouchableOpacity
                  style={[
                    styles.controlCircleBtn,
                    agentEvent.isMuted && styles.controlCircleBtnMuted,
                  ]}
                  onPress={handleToggleMute}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name={agentEvent.isMuted ? 'mic-off' : 'mic'}
                    size={26}
                    color={agentEvent.isMuted ? '#070e1c' : colors.text}
                  />
                  <Text
                    style={[
                      styles.controlBtnLabel,
                      agentEvent.isMuted && { color: colors.teal },
                    ]}
                  >
                    {agentEvent.isMuted ? 'Unmute' : 'Mute'}
                  </Text>
                </TouchableOpacity>

                {/* Tap to Talk Mode Button */}
                <TouchableOpacity
                  style={styles.controlCircleBtn}
                  onPress={handleToggleTapToTalk}
                  activeOpacity={0.8}
                >
                  <MaterialIcons name="touch-app" size={24} color={colors.text} />
                  <Text style={styles.controlBtnLabel}>Tap to talk</Text>
                </TouchableOpacity>

                {/* End Call Button */}
                <TouchableOpacity
                  style={styles.endCallCircleBtn}
                  onPress={handleEndCall}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="call-end" size={30} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Debug & Diagnostics BottomSheet Modal */}
      <Modal
        visible={showDebugModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDebugModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalTitleRow}>
                <MaterialIcons name="tune" size={18} color={colors.teal} />
                <Text style={styles.modalTitle}>Diagnostics & Debug</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowDebugModal(false)}
                style={styles.modalCloseBtn}
              >
                <MaterialIcons name="close" size={20} color={colors.textDim} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScrollContent}>
              {/* Latency Telemetry Grid */}
              <View style={styles.debugCard}>
                <Text style={styles.debugCardHeading}>ON-DEVICE LATENCY TELEMETRY</Text>
                <View style={styles.debugGrid}>
                  <View style={styles.debugMetricItem}>
                    <Text style={styles.debugMetricLabel}>1st Token</Text>
                    <Text style={styles.debugMetricValue}>
                      {agentEvent.debugMetrics.timeToFirstTokenMs !== null
                        ? `${agentEvent.debugMetrics.timeToFirstTokenMs}ms`
                        : '--'}
                    </Text>
                  </View>
                  <View style={styles.debugMetricItem}>
                    <Text style={styles.debugMetricLabel}>1st Spoken</Text>
                    <Text style={styles.debugMetricValue}>
                      {agentEvent.debugMetrics.timeToFirstSpokenSentenceMs !== null
                        ? `${agentEvent.debugMetrics.timeToFirstSpokenSentenceMs}ms`
                        : '--'}
                    </Text>
                  </View>
                  <View style={styles.debugMetricItem}>
                    <Text style={styles.debugMetricLabel}>LLM Speed</Text>
                    <Text style={styles.debugMetricValue}>
                      {agentEvent.debugMetrics.tokensPerSecond !== null
                        ? `${agentEvent.debugMetrics.tokensPerSecond} t/s`
                        : '--'}
                    </Text>
                  </View>
                  <View style={styles.debugMetricItem}>
                    <Text style={styles.debugMetricLabel}>Tokens</Text>
                    <Text style={styles.debugMetricValue}>
                      {agentEvent.debugMetrics.tokensGenerated !== null
                        ? `${agentEvent.debugMetrics.tokensGenerated}`
                        : '--'}
                    </Text>
                  </View>
                  <View style={styles.debugMetricItem}>
                    <Text style={styles.debugMetricLabel}>Max Mic</Text>
                    <Text style={styles.debugMetricValue}>
                      {agentEvent.cycleMaxLevel > -2
                        ? `${agentEvent.cycleMaxLevel.toFixed(1)}`
                        : '--'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Recognizer Diagnostics (Read-only) */}
              <View style={styles.debugSectionRow}>
                <Text style={styles.debugSectionLabel}>Recognizer Package:</Text>
                <Text style={styles.debugSectionValue} numberOfLines={1}>
                  {agentEvent.recognizerPackage || 'Default system service'}
                </Text>
              </View>

              <View style={styles.debugSectionRow}>
                <Text style={styles.debugSectionLabel}>Active Locale & Mode:</Text>
                <Text style={styles.debugSectionValue}>
                  {agentEvent.activeLocale || 'en-IN'} • {agentEvent.asrMode === 'offline' ? 'Offline (On-Device)' : 'Online (Google)'}
                </Text>
              </View>

              {/* Language Switcher */}
              <View style={styles.debugSectionRow}>
                <Text style={styles.debugSectionLabel}>ASR Language:</Text>
                <TouchableOpacity
                  style={styles.debugChip}
                  onPress={handleToggleLocale}
                  activeOpacity={0.8}
                >
                  <Text style={styles.debugChipText}>
                    {currentLocale === 'en-IN' ? 'Tanglish (en-IN)' : 'Tamil script (ta-IN)'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Offline Speech Pack Download */}
              {!isOfflineInstalled && (
                <TouchableOpacity
                  style={styles.offlineDownloadBar}
                  onPress={handleDownloadOfflinePack}
                  disabled={isDownloadingOffline}
                  activeOpacity={0.85}
                >
                  <MaterialIcons name="cloud-download" size={16} color={colors.teal} />
                  <Text style={styles.offlineDownloadBarText} numberOfLines={1}>
                    {offlineStatusMsg ||
                      `Download offline pack for ${currentLocale} (uses online)`}
                  </Text>
                </TouchableOpacity>
              )}

              {/* Tap to Talk Toggle Switch */}
              <View style={styles.debugSectionRow}>
                <Text style={styles.debugSectionLabel}>Tap-to-Talk fallback:</Text>
                <TouchableOpacity
                  style={[
                    styles.debugToggleBtn,
                    agentEvent.tapToTalkMode && styles.debugToggleBtnActive,
                  ]}
                  onPress={handleToggleTapToTalk}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.debugToggleBtnText,
                      agentEvent.tapToTalkMode && { color: '#070e1c' },
                    ]}
                  >
                    {agentEvent.tapToTalkMode ? 'ENABLED' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* LOCAL en-IN Voice Picker */}
              <View style={styles.debugCard}>
                <Text style={styles.debugCardHeading}>LOCAL EN-IN TTS VOICES</Text>
                {localVoices.length === 0 ? (
                  <Text style={styles.debugEmptyText}>No local en-IN voices found</Text>
                ) : (
                  localVoices.map((v) => {
                    const isSelected = selectedVoiceId === v.identifier;
                    return (
                      <View key={v.identifier} style={styles.voiceItemRow}>
                        <TouchableOpacity
                          style={styles.voiceSelectBtn}
                          onPress={async () => {
                            await setSelectedVoice(v.identifier);
                            setSelectedVoiceId(v.identifier);
                          }}
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name={isSelected ? 'radio-button-checked' : 'radio-button-unchecked'}
                            size={18}
                            color={isSelected ? colors.teal : colors.textDim}
                          />
                          <View style={styles.voiceInfoCol}>
                            <Text
                              style={[
                                styles.voiceNameText,
                                isSelected && { color: colors.teal, fontWeight: '700' },
                              ]}
                              numberOfLines={1}
                            >
                              {v.name || v.identifier}
                            </Text>
                            <Text style={styles.voiceIdText} numberOfLines={1}>
                              {v.identifier}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.playSampleBtn}
                          onPress={() => playVoiceSample(v.identifier)}
                          activeOpacity={0.8}
                        >
                          <MaterialIcons name="volume-up" size={15} color="#070e1c" />
                          <Text style={styles.playSampleBtnText}>Sample</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })
                )}
              </View>

              {/* DEV Text Turn Input Box (__DEV__ only) */}
              {__DEV__ && (
                <View style={styles.devSection}>
                  <Text style={styles.devSectionTitle}>DEV MANUAL SPEECH TURN</Text>
                  <View style={styles.devBarContainer}>
                    <TextInput
                      style={styles.devTextInput}
                      placeholder="Type test speech turn..."
                      placeholderTextColor={colors.outline}
                      value={devInputText}
                      onChangeText={setDevInputText}
                      editable={agentEvent.state === 'listening' || agentEvent.state === 'idle'}
                      onSubmitEditing={handleSendDevText}
                      returnKeyType="send"
                    />
                    <TouchableOpacity
                      style={[
                        styles.devSendButton,
                        (!devInputText.trim() ||
                          agentEvent.state === 'thinking' ||
                          agentEvent.state === 'speaking') &&
                          styles.devSendButtonDisabled,
                      ]}
                      onPress={handleSendDevText}
                      disabled={
                        !devInputText.trim() ||
                        agentEvent.state === 'thinking' ||
                        agentEvent.state === 'speaking'
                      }
                      activeOpacity={0.8}
                    >
                      <MaterialIcons name="send" size={16} color="#070e1c" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0f19', // Deep dark backdrop like WhatsApp/Telegram
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
  },
  headerIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.cardLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerSecurityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.cardLow,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  headerSecurityText: {
    ...type.labelSm,
    fontSize: 10.5,
    color: colors.teal,
    fontWeight: '600',
  },
  headerSecurityTextHybrid: {
    ...type.labelSm,
    fontSize: 9.5,
    color: colors.teal,
    fontWeight: '500',
  },

  /* Active Call Layout */
  callContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
  },

  /* Caller Identity */
  callerIdentity: {
    alignItems: 'center',
    marginTop: space.sm,
  },
  callerName: {
    fontSize: 28,
    lineHeight: 34,
    color: colors.text,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  callTimerText: {
    ...type.bodySm,
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.cardLow,
    marginTop: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    ...type.labelSm,
    fontSize: 11,
    fontWeight: '600',
  },
  calmErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    marginTop: 6,
    maxWidth: '90%',
  },
  calmErrorText: {
    ...type.bodySm,
    fontSize: 11.5,
    color: colors.amberText,
    flexShrink: 1,
  },
  calmActionBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  calmActionBtnText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#070e1c',
  },
  calmActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  calmActionBtnSecondary: {
    backgroundColor: colors.cardLow,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  calmActionBtnSecondaryText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textDim,
  },

  /* Avatar & Wave Stage */
  avatarStage: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: space.md,
  },
  avatarTouchTarget: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRingOuter: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  waveRingInner: {
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 124,
    height: 124,
    borderRadius: 62,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  avatarLetter: {
    fontSize: 48,
    fontWeight: '700',
    color: colors.primary,
  },

  /* Live Mic Audio Meter */
  micMeterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: space.md,
    height: 24,
  },
  micMeterBar: {
    width: 4,
    borderRadius: 2,
    backgroundColor: colors.cardHigh,
  },
  micMeterBarActive: {
    backgroundColor: colors.teal,
  },

  /* Live Captions */
  captionsContainer: {
    gap: space.xs,
    paddingHorizontal: space.xs,
    marginBottom: space.sm,
  },
  captionAiBox: {
    backgroundColor: colors.cardLow,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  captionAiLabel: {
    fontSize: 10,
    color: colors.green,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  captionAiText: {
    ...type.body,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 19,
  },
  captionUserBox: {
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  captionUserLabel: {
    fontSize: 10,
    color: colors.teal,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  captionUserText: {
    ...type.body,
    fontSize: 13.5,
    color: colors.text,
    lineHeight: 19,
  },
  captionListeningHint: {
    color: colors.textDim,
    fontStyle: 'italic',
  },

  /* Bottom Controls */
  bottomControlsBar: {
    paddingTop: space.xs,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  controlCircleBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlCircleBtnMuted: {
    backgroundColor: colors.teal,
  },
  controlBtnLabel: {
    fontSize: 9.5,
    color: colors.textDim,
    marginTop: 2,
    fontWeight: '600',
  },
  bigPushToTalkBtn: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  bigPushToTalkBtnActive: {
    backgroundColor: colors.teal,
  },
  bigPushToTalkLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#070e1c',
    marginTop: 2,
  },
  endCallCircleBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },

  /* Debug BottomSheet Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '80%',
    paddingBottom: space.xl,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardHigh,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: space.xs,
  },
  modalScrollContent: {
    padding: space.lg,
    gap: space.md,
  },
  debugCard: {
    backgroundColor: colors.cardLow,
    borderRadius: radius.md,
    padding: space.md,
    borderWidth: 1,
    borderColor: colors.cardHigh,
  },
  debugCardHeading: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: '700',
    color: colors.teal,
    marginBottom: space.sm,
  },
  debugGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  debugMetricItem: {
    alignItems: 'center',
    flex: 1,
  },
  debugMetricLabel: {
    fontSize: 9,
    color: colors.outline,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  debugMetricValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  debugSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardLow,
    padding: space.md,
    borderRadius: radius.md,
  },
  debugSectionLabel: {
    ...type.bodySm,
    color: colors.textDim,
  },
  debugSectionValue: {
    ...type.bodySm,
    color: colors.text,
    fontWeight: '600',
    maxWidth: '55%',
  },
  debugChip: {
    backgroundColor: colors.cardHigh,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  debugChipText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  debugToggleBtn: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.cardHigh,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  debugToggleBtnActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  debugToggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },
  offlineDownloadBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.cardLow,
    borderWidth: 1,
    borderColor: colors.teal + '55',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.md,
  },
  offlineDownloadBarText: {
    ...type.bodySm,
    color: colors.teal,
    fontSize: 11.5,
    fontWeight: '600',
    flex: 1,
  },
  devSection: {
    backgroundColor: colors.cardLow,
    padding: space.md,
    borderRadius: radius.md,
    gap: space.xs,
  },
  devSectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.outline,
    letterSpacing: 0.5,
  },
  devBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.card,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.outline + '44',
  },
  devTextInput: {
    flex: 1,
    ...type.bodySm,
    color: colors.text,
    paddingVertical: 6,
    paddingHorizontal: space.xs,
  },
  devSendButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  devSendButtonDisabled: {
    opacity: 0.35,
  },

  /* Model Download Section */
  downloadContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  downloadIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.lg,
  },
  downloadTitle: {
    ...type.headline,
    color: colors.text,
    textAlign: 'center',
    marginBottom: space.sm,
  },
  downloadDescription: {
    ...type.body,
    color: colors.textDim,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: space.xl,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.primary,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.full,
  },
  downloadButtonText: {
    ...type.title,
    color: '#070e1c',
    fontWeight: '700',
  },
  progressSection: {
    width: '100%',
    alignItems: 'center',
  },
  progressBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: colors.cardHigh,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: space.sm,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  progressLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: space.xs,
  },
  progressPercentText: {
    ...type.title,
    color: colors.primary,
    fontWeight: '700',
  },
  progressMbText: {
    ...type.bodySm,
    color: colors.textDim,
  },
  downloadingHintText: {
    ...type.bodySm,
    color: colors.outline,
    marginTop: space.xs,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    backgroundColor: colors.cardHigh,
    padding: space.md,
    borderRadius: radius.md,
    marginTop: space.lg,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorBannerText: {
    ...type.bodySm,
    color: colors.red,
    flex: 1,
  },
  voiceItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outline + '22',
  },
  voiceSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flex: 1,
    paddingRight: space.xs,
  },
  voiceInfoCol: {
    flex: 1,
  },
  voiceNameText: {
    ...type.bodySm,
    color: colors.text,
    fontSize: 12,
  },
  voiceIdText: {
    ...type.labelSm,
    color: colors.textDim,
    fontSize: 10,
  },
  playSampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal,
    paddingHorizontal: space.sm,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  playSampleBtnText: {
    ...type.labelSm,
    color: '#070e1c',
    fontWeight: '700',
    fontSize: 11,
  },
  debugEmptyText: {
    ...type.bodySm,
    color: colors.textDim,
    fontStyle: 'italic',
    paddingVertical: space.xs,
  },
  asrFallbackNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1f1b0a',
    borderWidth: 1,
    borderColor: colors.amber + '66',
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    marginBottom: space.sm,
  },
  asrFallbackNoticeText: {
    ...type.bodySm,
    color: colors.amber,
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  typedContainer: {
    width: '100%',
    paddingBottom: space.xs,
  },
  typedInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    width: '100%',
  },
  typedInput: {
    flex: 1,
    height: 48,
    backgroundColor: colors.cardLow,
    borderWidth: 1,
    borderColor: colors.outline,
    borderRadius: radius.full,
    paddingHorizontal: space.md,
    color: colors.text,
    fontSize: 14,
  },
  typedSendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typedSendBtnDisabled: {
    backgroundColor: colors.cardLow,
    opacity: 0.5,
  },
  endCallCircleBtnSmall: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incomingContainer: {
    flex: 1,
    backgroundColor: '#070e1c',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
  },
  incomingTopSection: {
    alignItems: 'center',
    paddingTop: space.lg,
  },
  incomingBadge: {
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
  incomingBadgeText: {
    ...type.labelSm,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1,
  },
  incomingCallerName: {
    ...type.headline,
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 36,
    letterSpacing: 1.5,
    marginBottom: space.xs,
  },
  incomingCallingStatusText: {
    ...type.title,
    color: colors.textDim,
    fontSize: 16,
    fontWeight: '500',
  },
  incomingOrbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 260,
    position: 'relative',
  },
  incomingAnimatedRing: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: 'rgba(76, 215, 246, 0.06)',
  },
  incomingOrbCore: {
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
  incomingAvatarLetter: {
    ...type.headline,
    color: colors.primary,
    fontWeight: '800',
    fontSize: 48,
  },
  incomingBottomSection: {
    alignItems: 'center',
    gap: space.md,
    paddingBottom: space.md,
  },
  incomingActionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: space.lg,
  },
  incomingActionCol: {
    alignItems: 'center',
    gap: 8,
  },
  incomingDeclineBtn: {
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
  incomingAcceptBtn: {
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
  incomingActionLabel: {
    ...type.bodySm,
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 13,
  },
  incomingTimeoutHint: {
    ...type.bodySm,
    color: colors.outline,
    fontSize: 11,
  },
});
