import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Path } from 'react-native-svg';
import { colors, spacing, radii, typography } from '../../theme';

export default function LoginScreen() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<'login' | 'create'>('login');
  const [email, setEmail] = useState('alex.vance@digitaltwin.bio');
  const [password, setPassword] = useState('••••••••••••');
  const [showPassword, setShowPassword] = useState(false);

  const handleInitialize = () => {
    router.push('/(auth)/profile-setup');
  };

  const handleSkipToTabs = () => {
    router.replace('/(tabs)/home');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Top Engine Version Badge */}
          <View style={styles.topBadgeContainer}>
            <View style={styles.engineBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.engineBadgeText}>v2.4 Telemetry Engine Active</Text>
            </View>
          </View>

          {/* Hero Branding Section */}
          <View style={styles.heroSection}>
            <View style={styles.logoCircle}>
              <MaterialIcons name="auto-awesome" size={32} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Your AI Digital Twin</Text>
            <Text style={styles.heroSubtitle}>
              Real-time biometric mirror predicting health trajectories powered by continuous wearable data stream.
            </Text>
          </View>

          {/* Auth Mode Toggle Tabs (Log In / Create Twin) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'login' ? styles.tabButtonActive : null]}
              onPress={() => setAuthMode('login')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'login' ? styles.tabButtonTextActive : null,
                ]}
              >
                Log In
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'create' ? styles.tabButtonActive : null]}
              onPress={() => setAuthMode('create')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  authMode === 'create' ? styles.tabButtonTextActive : null,
                ]}
              >
                Create Twin
              </Text>
            </TouchableOpacity>
          </View>

          {/* Neural Node Form Card */}
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <View style={styles.formHeaderLeft}>
                <MaterialIcons name="fingerprint" size={20} color={colors.primary} />
                <Text style={styles.formHeaderText}>Access Neural Node</Text>
              </View>
              <Text style={styles.encryptedText}>ENCRYPTED_TLS3</Text>
            </View>

            {/* Email / Bio-Identifier Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bio-Identifier / Email</Text>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="alternate-email" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alex.vance@digitaltwin.bio"
                  placeholderTextColor={colors.outline}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Passkey Field */}
            <View style={styles.inputGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Security Matrix Passkey</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={styles.forgotText}>Forgot key?</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.inputWrapper}>
                <MaterialIcons name="shield" size={18} color={colors.onSurfaceVariant} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••••••"
                  placeholderTextColor={colors.outline}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                  style={styles.eyeBtn}
                >
                  <MaterialIcons
                    name={showPassword ? 'visibility-off' : 'visibility'}
                    size={18}
                    color={colors.onSurfaceVariant}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Initialize Twin CTA */}
            <TouchableOpacity
              style={styles.primaryCta}
              onPress={handleInitialize}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryCtaText}>
                {authMode === 'login' ? 'Initialize Digital Twin' : 'Create Biological Twin'}
              </Text>
              <MaterialIcons name="arrow-forward" size={18} color="#070e1c" />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or authenticate with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Social Auth */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleInitialize}
              activeOpacity={0.85}
            >
              <Svg width={18} height={18} viewBox="0 0 24 24">
                <Path
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  fill="#4285F4"
                />
                <Path
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  fill="#34A853"
                />
                <Path
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  fill="#FBBC05"
                />
                <Path
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  fill="#EA4335"
                />
              </Svg>
              <Text style={styles.googleBtnText}>Continue with Google</Text>
            </TouchableOpacity>

            {/* Quick direct bypass to dashboard */}
            <TouchableOpacity
              style={styles.bypassBtn}
              onPress={handleSkipToTabs}
              activeOpacity={0.7}
            >
              <Text style={styles.bypassText}>Skip directly to Live Dashboard →</Text>
            </TouchableOpacity>
          </View>

          {/* Legal Compliance Footnote */}
          <View style={styles.footer}>
            <View style={styles.complianceRow}>
              <MaterialIcons name="verified-user" size={14} color={colors.outline} />
              <Text style={styles.complianceText}>HIPAA • GDPR Bio-Compliant</Text>
            </View>
            <Text style={styles.legalNotice}>
              By initializing, you agree to our Neural Terms and Medical Safety Disclosures. Not intended for direct diagnostic replacement.
            </Text>
          </View>
        </ScrollView>
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  topBadgeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  engineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(25, 32, 46, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.2)',
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  engineBadgeText: {
    ...typography.labelCapsXs,
    color: colors.primary,
    fontSize: 9.5,
  },
  heroSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginBottom: 24,
  },
  logoCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.3)',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 4,
  },
  heroTitle: {
    ...typography.displayLgMobile,
    color: colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    maxWidth: 320,
    marginTop: 6,
    lineHeight: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.full,
    padding: 3,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.full,
  },
  tabButtonActive: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 3,
  },
  tabButtonText: {
    ...typography.labelCapsMd,
    color: colors.onSurfaceVariant,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: colors.onPrimary,
    fontWeight: '700',
  },
  formCard: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xxl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
    gap: spacing.spaceMd,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(46, 53, 68, 0.4)',
  },
  formHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  formHeaderText: {
    ...typography.labelCapsMd,
    color: colors.primary,
    fontWeight: '700',
  },
  encryptedText: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 9.5,
  },
  inputGroup: {
    gap: 6,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  inputLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  forgotText: {
    ...typography.labelCapsXs,
    color: colors.primary,
    fontSize: 9,
    textTransform: 'uppercase',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 48,
    borderWidth: 1,
    borderColor: 'rgba(61, 73, 76, 0.6)',
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    ...typography.bodySm,
    color: colors.onSurface,
    height: '100%',
  },
  eyeBtn: {
    padding: 4,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.full,
    marginTop: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  primaryCtaText: {
    ...typography.labelCapsMd,
    color: '#070e1c',
    fontWeight: '700',
    fontSize: 12,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.surfaceContainerHighest,
  },
  dividerText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 12,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: 'rgba(46, 53, 68, 0.8)',
  },
  googleBtnText: {
    ...typography.bodySm,
    color: colors.onSurface,
    fontWeight: '600',
  },
  bypassBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  bypassText: {
    ...typography.bodySm,
    color: colors.secondary,
    fontSize: 12,
  },
  footer: {
    alignItems: 'center',
    marginTop: 28,
    gap: 8,
  },
  complianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  complianceText: {
    ...typography.labelCapsXs,
    color: colors.outline,
    fontSize: 9,
  },
  legalNotice: {
    ...typography.labelCapsXs,
    color: colors.outline,
    textAlign: 'center',
    lineHeight: 14,
    fontSize: 8.5,
    maxWidth: 280,
    textTransform: 'none',
  },
});
