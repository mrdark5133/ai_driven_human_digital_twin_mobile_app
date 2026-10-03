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
  const [isListening, setIsListening] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
    }, 150);
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
        >
          {/* Top Status Header */}
          <View style={styles.agentStatusCard}>
            <View style={styles.statusHeaderRow}>
              <View style={styles.agentInfoGroup}>
                <View style={styles.pulseDotWrapper}>
                  <View style={styles.pulseDotPing} />
                  <View style={styles.pulseDot} />
                </View>
                <View>
                  <Text style={styles.agentTitle}>AURA</Text>
                  <Text style={styles.agentSub}>Health Assistant</Text>
                </View>
              </View>

              <View style={styles.neuralPill}>
                <MaterialIcons name="check-circle" size={13} color={colors.tertiary} />
                <Text style={styles.neuralText}>Active</Text>
              </View>
            </View>
          </View>

          {/* Voice Orb Area - Fixed height block */}
          <View style={styles.voiceOrbCard}>
            {/* Concentric rings with Center Mic Button */}
            <View style={styles.concentricRings}>
              <View style={styles.ringOuter} />
              <View style={styles.ringMiddle} />
              <View style={styles.ringInner} />

              {/* Holographic Equalizer Wave */}
              <View style={styles.waveOverlay}>
                <Svg width={140} height={50} viewBox="0 0 200 80">
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

              {/* Mic Orb Button */}
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
                  size={30}
                  color={isListening ? '#070e1c' : colors.onSurfaceVariant}
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
                  {isListening ? 'Listening...' : 'Tap to speak'}
                </Text>
              </View>
              <Text style={styles.agentStateSubtitle} numberOfLines={1}>
                {isListening
                  ? 'Listening to your question...'
                  : 'Ask about your heart rate, sleep or stress.'}
              </Text>
            </View>
          </View>

          {/* Quick Action Chips (Horizontal Scroll) */}
          <View style={styles.chipsSection}>
            <Text style={styles.chipsTitle}>Suggested questions</Text>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipsRow}
            >
              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage('How is my health score today?')}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.tertiary }]} />
                <Text style={styles.chipText}>How is my health score?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage('Why did my heart rate spike at 4:12 AM?')}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.secondary }]} />
                <Text style={styles.chipText}>Why did my heart rate spike?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.chipBtn}
                onPress={() => handleSendMessage('How was my sleep last night?')}
                activeOpacity={0.8}
              >
                <View style={[styles.chipDot, { backgroundColor: colors.primary }]} />
                <Text style={styles.chipText}>How was my sleep?</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Conversation Stream */}
          <View style={styles.conversationList}>
            <View style={styles.convoHeaderRow}>
              <Text style={styles.convoTitle}>Conversation</Text>
              <View style={styles.demoPill}>
                <Text style={styles.demoText}>Demo data</Text>
              </View>
            </View>

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
                      size={14}
                      color={isUser ? colors.primary : colors.secondary}
                    />
                    <Text
                      style={[
                        styles.msgSender,
                        { color: isUser ? colors.primary : colors.secondary },
                      ]}
                    >
                      {isUser ? 'You' : 'AURA'}
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

                    {/* Embedded Health Widget Card */}
                    {msg.telemetryWidget ? (
                      <View style={styles.embeddedWidget}>
                        <View style={styles.widgetLeft}>
                          <View style={styles.widgetIconBox}>
                            <MaterialIcons name="bedtime" size={16} color={colors.secondary} />
                          </View>
                          <View>
                            <Text style={styles.widgetLabel}>
                              {msg.telemetryWidget.label}: <Text style={styles.widgetVal}>{msg.telemetryWidget.value}</Text>
                            </Text>
                            <Text style={styles.widgetSuggestion}>
                              {msg.telemetryWidget.suggestion || msg.telemetryWidget.targetStrain}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.demoPillSmall}>
                          <Text style={styles.demoTextSmall}>Demo data</Text>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* Bottom Input Dock */}
        <View style={styles.bottomDock}>
          <View style={styles.inputConsole}>
            <TextInput
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder="Ask Aura about heart rate, sleep or stress..."
              placeholderTextColor={colors.outline}
              onSubmitEditing={() => handleSendMessage()}
              returnKeyType="send"
            />

            <TouchableOpacity
              style={styles.sendBtn}
              onPress={() => handleSendMessage()}
              disabled={isSending || !inputText.trim()}
              activeOpacity={0.8}
            >
              <MaterialIcons name="arrow-upward" size={18} color="#070e1c" />
            </TouchableOpacity>
          </View>
          <Text style={styles.bottomDisclaimer}>Aura gives general tips, not medical advice.</Text>
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
    paddingBottom: 24,
    gap: 14,
  },
  agentStatusCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.spaceMd,
    paddingVertical: 12,
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
    ...typography.titleMd,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  agentSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11,
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
    fontSize: 9,
    textTransform: 'none',
  },
  voiceOrbCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    paddingVertical: 16,
    paddingHorizontal: spacing.spaceMd,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.2)',
    height: 200,
  },
  concentricRings: {
    width: 120,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ringOuter: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(25, 32, 46, 0.4)',
  },
  ringMiddle: {
    position: 'absolute',
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(35, 42, 57, 0.5)',
  },
  ringInner: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(46, 53, 68, 0.4)',
  },
  waveOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micOrbButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 6,
    borderWidth: 2.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  micOrbButtonMuted: {
    backgroundColor: colors.surfaceContainerHighest,
    borderColor: colors.outline,
    shadowOpacity: 0.1,
  },
  agentStateColumn: {
    alignItems: 'center',
    marginTop: 10,
    gap: 3,
  },
  listeningBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(35, 42, 57, 0.8)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  stateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  listeningBadgeText: {
    ...typography.bodySm,
    fontSize: 11,
    fontWeight: '700',
  },
  agentStateSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  chipsSection: {
    gap: 6,
  },
  chipsTitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
    fontSize: 12,
    paddingHorizontal: 2,
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
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  chipText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 12,
  },
  conversationList: {
    gap: 12,
    marginTop: 2,
  },
  convoHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  convoTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 15,
  },
  demoPill: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  demoText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    textTransform: 'none',
  },
  demoPillSmall: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  demoTextSmall: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8,
    textTransform: 'none',
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
    maxWidth: '94%',
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
    fontSize: 10,
  },
  msgTime: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  msgBubble: {
    borderRadius: radii.lg,
    padding: 12,
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
    gap: 8,
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
    gap: 8,
  },
  widgetLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
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
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
    fontSize: 12,
  },
  widgetVal: {
    color: colors.primary,
    fontWeight: '700',
  },
  widgetSuggestion: {
    ...typography.bodySm,
    color: colors.secondary,
    fontSize: 11,
    marginTop: 1,
  },
  bottomDock: {
    paddingHorizontal: spacing.margin,
    paddingBottom: Platform.OS === 'ios' ? 24 : 74,
    paddingTop: 6,
    backgroundColor: colors.background,
    gap: 4,
  },
  inputConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
  },
  textInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.onSurface,
    fontSize: 13,
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
  bottomDisclaimer: {
    ...typography.labelCapsXs,
    color: colors.outline,
    fontSize: 10,
    textAlign: 'center',
    textTransform: 'none',
    marginTop: 2,
  },
});
