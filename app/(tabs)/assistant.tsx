import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radii, typography } from '../../theme';
import { Header } from '../../components/Header';
import { DataService } from '../../services/dataService';
import { ChatMessage } from '../../types';

export default function AssistantScreen() {
  const [messages, setMessages] = useState<ChatMessage[]>(DataService.getChatHistory());
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const settings = DataService.getSettings();

  useEffect(() => {
    const unsubscribe = DataService.subscribe(() => {
      setMessages(DataService.getChatHistory());
    });
    return unsubscribe;
  }, []);

  const handleSendMessage = async (textToSend?: string) => {
    const content = textToSend || inputText;
    if (!content.trim()) return;

    setInputText('');
    setIsSending(true);
    await DataService.sendChatMessage(content);
    setIsSending(false);

    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleToggleMic = () => {
    setIsListening(!isListening);
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <Header screenTitle="Assistant" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
        >
          {/* Top Status Diagnostic Header */}
          <View style={styles.agentStatusCard}>
            <View style={styles.statusHeaderRow}>
              <View style={styles.agentInfoGroup}>
                <View style={styles.pulseDotWrapper}>
                  <View style={styles.pulseDotPing} />
                  <View style={styles.pulseDot} />
                </View>
                <View>
                  <Text style={styles.agentTitle}>AURA • BIOMETRIC CLINICAL AGENT</Text>
                  <Text style={styles.agentSub}>SYNAPSE ENGINE v4.8 • BIO-VOICE LINK</Text>
                </View>
              </View>

              <View style={styles.neuralPill}>
                <MaterialIcons name="sensors" size={13} color={colors.tertiary} />
                <Text style={styles.neuralText}>NEURAL LINK ACTIVE</Text>
              </View>
            </View>
          </View>

          {/* Holographic Voice Visualizer & Voice Orb Area */}
          <View style={styles.voiceOrbCard}>
            {/* Ambient Cyan Glows */}
            <View style={styles.ambientGlow} />

            {/* Concentric rings with Center Glowing Mic Orb Button (80px) */}
            <View style={styles.concentricRings}>
              <View style={styles.ringOuter}>
                <View style={styles.ringMiddle}>
                  <View style={styles.ringInner} />
                </View>
              </View>

              {/* Holographic Equalizer Wave */}
              <View style={styles.waveOverlay}>
                <Svg width={180} height={70} viewBox="0 0 200 80">
                  <Path
                    d="M10 40 Q 30 15, 55 40 T 100 40 T 145 40 T 190 40"
                    fill="none"
                    stroke="#4cd7f6"
                    strokeWidth={2}
                    opacity={isListening ? 0.9 : 0.25}
                  />
                  <Path
                    d="M15 40 Q 40 60, 70 40 T 120 40 T 165 40 T 185 40"
                    fill="none"
                    stroke="#5de6ff"
                    strokeWidth={1.5}
                    opacity={isListening ? 0.6 : 0.2}
                  />
                  <Path
                    d="M25 40 Q 60 5, 95 40 T 140 40 T 175 40"
                    fill="none"
                    stroke="#45dfa4"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                    opacity={isListening ? 0.7 : 0.2}
                  />
                </Svg>
              </View>

              {/* 80px Glowing Mic Orb Button */}
              <TouchableOpacity
                style={[
                  styles.micOrbButton,
                  !isListening && styles.micOrbButtonMuted,
                ]}
                onPress={handleToggleMic}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isListening ? 'mic' : 'mic-off'}
                  size={34}
                  color="#070e1c"
                />
              </TouchableOpacity>
            </View>

            {/* Live State & Status Text */}
            <View style={styles.agentStateColumn}>
              <View style={styles.listeningBadge}>
                <View
                  style={[
                    styles.stateDot,
                    { backgroundColor: isListening ? colors.secondary : colors.outline },
                  ]}
                />
                <Text
                  style={[
                    styles.listeningBadgeText,
                    { color: isListening ? colors.secondary : colors.outline },
                  ]}
                >
                  {isListening ? 'LISTENING CONTINUOUSLY' : 'MICROPHONE MUTED'}
                </Text>
              </View>
              <Text style={styles.agentStateSubtitle}>
                {isListening
                  ? 'Aura is analyzing continuous ECG telemetry and ambient biometric context...'
                  : 'Continuous speech stream paused. Tap orb to reactivate voice.'}
              </Text>
            </View>
          </View>

          {/* Quick Action Chips (Horizontal Scroll) */}
          <View style={styles.chipsSection}>
            <View style={styles.chipsHeaderRow}>
              <Text style={styles.chipsTitle}>SUGGESTED INQUIRIES</Text>
              <Text style={styles.chipsSubtitle}>REALTIME TWIN FEED</Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              {/* Chip 1 */}
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage("Check my full health score and today's readiness.")}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.tertiary }]} />
                <Text style={styles.chipText}>Check my full health score</Text>
              </TouchableOpacity>

              {/* Chip 2 */}
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage('Why did my heart rate spike at 4:12 AM during REM sleep?')}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.secondary }]} />
                <Text style={styles.chipText}>Why did my heart rate spike?</Text>
              </TouchableOpacity>

              {/* Chip 3 (Dynamic Emergency Contact) */}
              <TouchableOpacity
                style={[styles.chipBtn, styles.emergencyChip]}
                onPress={() => handleSendMessage(`Initiate telemetry relay and contact ${settings.emergencyContactName}.`)}
                activeOpacity={0.8}
              >
                <MaterialIcons name="emergency" size={13} color="#ffdad6" />
                <Text style={[styles.chipText, { color: '#ffdad6', fontWeight: '700' }]}>
                  Call {settings.emergencyContactName.split(' ')[0]} (Emergency)
                </Text>
              </TouchableOpacity>

              {/* Chip 4 */}
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage("Explain my twin's lung data and SpO2 trends.")}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.chipText}>Explain twin's lung data</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Conversation Stream */}
          <View style={styles.conversationList}>
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.messageRow,
                    isUser ? styles.userMessageRow : styles.auraMessageRow,
                  ]}
                >
                  <View style={styles.msgHeader}>
                    <MaterialIcons
                      name={isUser ? 'person' : 'psychology'}
                      size={12}
                      color={isUser ? colors.primary : colors.secondary}
                    />
                    <Text
                      style={[
                        styles.msgSender,
                        { color: isUser ? colors.primary : colors.secondary },
                      ]}
                    >
                      {isUser ? 'You (Voice)' : 'Aura • Biometric Insight'}
                    </Text>
                    <Text style={styles.msgTime}>{msg.timeStr}</Text>
                  </View>

                  <View
                    style={[
                      styles.msgBubble,
                      isUser ? styles.userBubble : styles.auraBubble,
                    ]}
                  >
                    <Text style={styles.msgBodyText}>{msg.text}</Text>

                    {/* Embedded Telemetry Micro-Widget */}
                    {msg.telemetryWidget ? (
                      <View style={styles.embeddedWidget}>
                        <View style={styles.widgetLeft}>
                          <View style={styles.widgetIconBox}>
                            <MaterialIcons name="battery-charging-full" size={16} color={colors.secondary} />
                          </View>
                          <View>
                            <Text style={styles.widgetLabel}>{msg.telemetryWidget.label}</Text>
                            <Text style={styles.widgetVal}>{msg.telemetryWidget.value}</Text>
                          </View>
                        </View>

                        <View style={styles.widgetRight}>
                          <Text style={styles.targetStrainLabel}>TARGET STRAIN</Text>
                          <Text style={styles.targetStrainVal}>{msg.telemetryWidget.targetStrain}</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Input Dock & Transmission Console */}
        <View style={styles.bottomDock}>
          <View style={styles.inputConsole}>
            {/* Biomarker attachment button */}
            <TouchableOpacity style={styles.attachBtn} activeOpacity={0.7}>
              <MaterialIcons name="attachment" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Aura about vitals, sleep, or twin..."
              placeholderTextColor={colors.outline}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
            />

            {/* Audio Waveform Signal Indicator */}
            <View style={styles.audioBars}>
              <View style={[styles.audioBar, { height: 10 }]} />
              <View style={[styles.audioBar, { height: 16 }]} />
              <View style={[styles.audioBar, { height: 12 }]} />
              <View style={[styles.audioBar, { height: 18 }]} />
            </View>

            {/* Send Button */}
            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleSendMessage()}
              disabled={isSending || !inputText.trim()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-upward" size={18} color="#070e1c" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingHorizontal: spacing.margin,
    paddingTop: 12,
    paddingBottom: 110,
    gap: spacing.spaceMd,
  },
  agentStatusCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.45)',
  },
  statusHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  agentInfoGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  pulseDotWrapper: {
    width: 10,
    height: 10,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDotPing: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.secondary,
    opacity: 0.4,
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  agentTitle: {
    ...typography.labelCapsMd,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 10.5,
  },
  agentSub: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  neuralPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  neuralText: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    fontWeight: '700',
    fontSize: 8,
  },
  voiceOrbCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceLg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    minHeight: 270,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.2)',
  },
  ambientGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(76, 215, 246, 0.08)',
  },
  concentricRings: {
    width: 190,
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringOuter: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(25, 32, 46, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringMiddle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(35, 42, 57, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(46, 53, 68, 0.4)',
  },
  waveOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOrbButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 8,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  micOrbButtonMuted: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.outline,
    shadowOpacity: 0.1,
  },
  agentStateColumn: {
    alignItems: 'center',
    marginTop: 14,
    gap: 4,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(35, 42, 57, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listeningBadgeText: {
    ...typography.labelCapsMd,
    fontSize: 9.5,
    fontWeight: '700',
  },
  agentStateSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  chipsSection: {
    gap: 8,
  },
  chipsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chipsTitle: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    fontSize: 9,
  },
  chipsSubtitle: {
    ...typography.labelCapsXs,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 8.5,
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 2,
  },
  chipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  emergencyChip: {
    backgroundColor: colors.errorContainer,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...typography.labelCapsMd,
    color: colors.onSurface,
    fontSize: 10,
    textTransform: 'none',
  },
  conversationList: {
    gap: 14,
    marginTop: 4,
  },
  messageRow: {
    gap: 4,
  },
  userMessageRow: {
    alignItems: 'flex-end',
    alignSelf: 'flex-end',
    maxWidth: '85%',
  },
  auraMessageRow: {
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  msgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 4,
  },
  msgSender: {
    ...typography.labelCapsXs,
    fontWeight: '700',
    fontSize: 9,
  },
  msgTime: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  msgBubble: {
    borderRadius: radii.lg,
    padding: spacing.spaceMd,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    borderTopRightRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  auraBubble: {
    backgroundColor: colors.surfaceContainer,
    borderTopLeftRadius: radii.sm,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.6)',
    gap: 10,
  },
  msgBodyText: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontSize: 13.5,
    lineHeight: 20,
  },
  embeddedWidget: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(35, 42, 57, 0.75)',
    padding: 10,
    borderRadius: radii.md,
  },
  widgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  widgetIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(93, 230, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  widgetLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  widgetVal: {
    ...typography.headlineMetricMobile,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 15,
  },
  widgetRight: {
    alignItems: 'flex-end',
  },
  targetStrainLabel: {
    ...typography.labelCapsXs,
    color: colors.tertiary,
    fontSize: 8,
  },
  targetStrainVal: {
    ...typography.dataMono,
    color: colors.secondary,
    fontWeight: '700',
    fontSize: 11,
  },
  bottomDock: {
    paddingHorizontal: spacing.margin,
    paddingBottom: Platform.OS === 'ios' ? 24 : 80,
    paddingTop: 6,
    backgroundColor: colors.background,
  },
  inputConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.full,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  attachBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 12.5,
  },
  audioBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
    paddingHorizontal: 4,
  },
  audioBar: {
    width: 3,
    borderRadius: 1.5,
    backgroundColor: colors.primary,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 3,
  },
});
