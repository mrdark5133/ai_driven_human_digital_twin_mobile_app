import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, radius, space, type } from '../theme/tokens';
import { isModelDownloaded, downloadModel, cancelModelDownload } from '../src/services/voice/modelManager';
import { callAgent, CallAgentEvent } from '../src/services/voice/callAgent';
import { getAsrLocale, setAsrLocale, AsrLocale } from '../src/services/voice/asr';

export default function CallScreen() {
  const router = useRouter();

  // Model download state
  const [modelReady, setModelReady] = useState<boolean | null>(null);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadBytes, setDownloadBytes] = useState({ written: 0, total: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

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
  });

  const [currentLocale, setCurrentLocale] = useState<AsrLocale>(getAsrLocale());

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // 1. Initial check for model file
  useEffect(() => {
    let mounted = true;
    (async () => {
      const ready = await isModelDownloaded();
      if (mounted) {
        setModelReady(ready);
        if (ready) {
          callAgent.startCall();
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
  }, []);

  // 2. Continuous pulse animation based on state
  useEffect(() => {
    let pulseLoop: Animated.CompositeAnimation | null = null;

    if (agentEvent.state === 'listening' || agentEvent.state === 'speaking') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.18,
            duration: agentEvent.state === 'speaking' ? 700 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0.95,
            duration: agentEvent.state === 'speaking' ? 700 : 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else if (agentEvent.state === 'thinking') {
      pulseLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1.0,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ])
      );
      pulseLoop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      if (pulseLoop) pulseLoop.stop();
    };
  }, [agentEvent.state]);

  // Handle Model Download
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
      // Start call immediately after download completes
      await callAgent.startCall();
    } catch (err: any) {
      setIsDownloading(false);
      setDownloadError(err?.message || 'Download failed. Please check network connection.');
    }
  };

  const handleEndCall = async () => {
    await callAgent.endCall();
    router.back();
  };

  const handleToggleMute = async () => {
    await callAgent.toggleMute();
  };

  const handleToggleLocale = () => {
    const nextLocale: AsrLocale = currentLocale === 'en-IN' ? 'ta-IN' : 'en-IN';
    setAsrLocale(nextLocale);
    setCurrentLocale(nextLocale);
  };

  const formatMb = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(1);
  };

  // State color helper
  const getStateColor = () => {
    switch (agentEvent.state) {
      case 'listening':
        return colors.teal; // Bright teal/cyan
      case 'thinking':
        return colors.amber; // Warm amber
      case 'speaking':
        return colors.green; // Bio-emerald
      case 'error':
        return colors.red;
      default:
        return colors.outline;
    }
  };

  const getStateText = () => {
    switch (agentEvent.state) {
      case 'listening':
        return 'Listening...';
      case 'thinking':
        return 'Thinking...';
      case 'speaking':
        return 'Speaking...';
      case 'error':
        return 'Error';
      default:
        return 'Connecting...';
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={handleEndCall} activeOpacity={0.7}>
          <MaterialIcons name="chevron-left" size={28} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>AURA</Text>
          <Text style={styles.headerSubtitle}>
            On-Device Phone Call • Tanglish ({currentLocale})
          </Text>
        </View>
        <TouchableOpacity
          style={styles.localeChip}
          onPress={handleToggleLocale}
          activeOpacity={0.8}
        >
          <Text style={styles.localeChipText}>{currentLocale}</Text>
        </TouchableOpacity>
      </View>

      {/* Model Download Screen (First Use) */}
      {modelReady === false ? (
        <View style={styles.downloadContainer}>
          <View style={styles.downloadIconRing}>
            <MaterialIcons name="cloud-download" size={44} color={colors.primary} />
          </View>
          <Text style={styles.downloadTitle}>Setup AURA Voice Intelligence</Text>
          <Text style={styles.downloadDescription}>
            To run 100% on-device with zero server delay or subscription, AURA requires the
            Qwen2.5-1.5B model (~1.1 GB). This is downloaded once to your phone.
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
        /* Active Call UI */
        <View style={styles.callContent}>
          {/* Debug Telemetry Overlay */}
          <View style={styles.debugCard}>
            <View style={styles.debugHeaderRow}>
              <MaterialIcons name="speed" size={14} color={colors.teal} />
              <Text style={styles.debugTitle}>ON-DEVICE LATENCY TELEMETRY</Text>
            </View>
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
            </View>
          </View>

          {/* Central Pulsing AURA Orb */}
          <View style={styles.orbArea}>
            <Animated.View
              style={[
                styles.orbOuterRing,
                {
                  borderColor: getStateColor(),
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.orbMiddleRing,
                  { borderColor: getStateColor() + '66' },
                ]}
              >
                <View
                  style={[
                    styles.orbInnerCore,
                    { backgroundColor: getStateColor() + '22' },
                  ]}
                >
                  <MaterialIcons
                    name={
                      agentEvent.isMuted
                        ? 'mic-off'
                        : agentEvent.state === 'speaking'
                        ? 'volume-up'
                        : agentEvent.state === 'thinking'
                        ? 'psychology'
                        : 'mic'
                    }
                    size={38}
                    color={getStateColor()}
                  />
                </View>
              </View>
            </Animated.View>

            {/* State Pill */}
            <View style={[styles.statePill, { borderColor: getStateColor() + '55' }]}>
              <View style={[styles.stateDot, { backgroundColor: getStateColor() }]} />
              <Text style={[styles.statePillText, { color: getStateColor() }]}>
                {getStateText()}
              </Text>
            </View>
          </View>

          {/* Real-time Subtitles Area */}
          <View style={styles.subtitlesSection}>
            {agentEvent.userTranscript ? (
              <View style={styles.userBubble}>
                <Text style={styles.speakerLabel}>You</Text>
                <Text style={styles.userSpeechText}>{agentEvent.userTranscript}</Text>
              </View>
            ) : null}

            {agentEvent.aiResponse ? (
              <View style={styles.aiBubble}>
                <Text style={styles.aiSpeakerLabel}>AURA</Text>
                <Text style={styles.aiSpeechText}>{agentEvent.aiResponse}</Text>
              </View>
            ) : null}

            {agentEvent.errorMessage ? (
              <View style={styles.errorBubble}>
                <Text style={styles.errorText}>{agentEvent.errorMessage}</Text>
              </View>
            ) : null}
          </View>

          {/* Call Controls Footer */}
          <View style={styles.controlsRow}>
            {/* Mute Button */}
            <TouchableOpacity
              style={[
                styles.controlButton,
                agentEvent.isMuted && styles.controlButtonActive,
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
                  styles.controlLabel,
                  agentEvent.isMuted && { color: colors.teal },
                ]}
              >
                {agentEvent.isMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>

            {/* End Call Button */}
            <TouchableOpacity
              style={styles.endCallButton}
              onPress={handleEndCall}
              activeOpacity={0.85}
            >
              <MaterialIcons name="call-end" size={32} color="#ffffff" />
            </TouchableOpacity>

            {/* Language Switch Button */}
            <TouchableOpacity
              style={styles.controlButton}
              onPress={handleToggleLocale}
              activeOpacity={0.8}
            >
              <MaterialIcons name="translate" size={26} color={colors.text} />
              <Text style={styles.controlLabel}>{currentLocale}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.cardHigh,
  },
  backButton: {
    padding: space.xs,
    marginRight: space.xs,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerTitle: {
    ...type.title,
    color: colors.text,
    fontWeight: '700',
  },
  headerSubtitle: {
    ...type.bodySm,
    color: colors.textDim,
    fontSize: 11,
  },
  localeChip: {
    backgroundColor: colors.cardHigh,
    paddingHorizontal: space.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  localeChipText: {
    ...type.labelSm,
    color: colors.primary,
    fontWeight: '600',
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

  /* Active Call UI */
  callContent: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingBottom: space.lg,
  },
  debugCard: {
    backgroundColor: colors.cardLow,
    borderRadius: radius.md,
    padding: space.sm,
    borderWidth: 1,
    borderColor: colors.cardHigh,
    marginTop: space.xs,
  },
  debugHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  debugTitle: {
    ...type.labelSm,
    color: colors.teal,
    letterSpacing: 1,
    fontSize: 10,
    fontWeight: '700',
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

  /* Orb Area */
  orbArea: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xl,
  },
  orbOuterRing: {
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbMiddleRing: {
    width: 136,
    height: 136,
    borderRadius: 68,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orbInnerCore: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.card,
    borderWidth: 1,
    marginTop: space.md,
  },
  stateDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statePillText: {
    ...type.labelSm,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  /* Subtitles */
  subtitlesSection: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: space.sm,
    gap: space.sm,
  },
  userBubble: {
    backgroundColor: colors.card,
    padding: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  speakerLabel: {
    fontSize: 10,
    color: colors.teal,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  userSpeechText: {
    ...type.body,
    color: colors.text,
  },
  aiBubble: {
    backgroundColor: colors.cardHigh,
    padding: space.md,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.green,
  },
  aiSpeakerLabel: {
    fontSize: 10,
    color: colors.green,
    fontWeight: '700',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  aiSpeechText: {
    ...type.body,
    color: colors.text,
    lineHeight: 22,
  },
  errorBubble: {
    backgroundColor: colors.cardHigh,
    padding: space.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.red,
  },
  errorText: {
    ...type.bodySm,
    color: colors.red,
  },

  /* Call Controls */
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: space.md,
  },
  controlButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.cardHigh,
    borderWidth: 1,
    borderColor: colors.outline,
  },
  controlButtonActive: {
    backgroundColor: colors.teal,
  },
  controlLabel: {
    fontSize: 10,
    color: colors.textDim,
    marginTop: 2,
    fontWeight: '600',
  },
  endCallButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#dc2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
});
