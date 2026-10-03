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
import { colors, spacing, radii, typography } from '../../theme';
import { DataService } from '../../services/dataService';

export default function ProfileSetupScreen() {
  const router = useRouter();
  const initialProfile = DataService.getProfile();

  const [name, setName] = useState(initialProfile.name);
  const [age, setAge] = useState(initialProfile.chronologicalAge.toString());
  const [height, setHeight] = useState(initialProfile.heightCm.toString());
  const [weight, setWeight] = useState(initialProfile.weightKg.toString());

  const handleSave = () => {
    DataService.updateProfile({
      name,
      chronologicalAge: parseInt(age) || 28,
      heightCm: parseFloat(height) || 178,
      weightKg: parseFloat(weight) || 71.0,
    });
    router.push('/(auth)/connect-watch');
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
          {/* Header Bar */}
          <View style={styles.topHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <MaterialIcons name="arrow-back" size={20} color={colors.onSurface} />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Set Up Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Stepper Header */}
          <View style={styles.stepperCard}>
            <View style={styles.stepperRow}>
              <View style={styles.stepIndicator}>
                <View style={styles.stepDot} />
                <Text style={styles.stepTitle}>Step 2 of 3: Biometric Baseline</Text>
              </View>
              <View style={styles.precalBadge}>
                <Text style={styles.precalText}>PRE-CALIBRATED</Text>
              </View>
            </View>

            {/* Stepper Track */}
            <View style={styles.progressTrack}>
              <View style={styles.progressBar} />
            </View>

            {/* Biometric Cluster Bento Grid Preview */}
            <View style={styles.bentoGrid}>
              <View style={styles.bentoCard}>
                <Text style={styles.bentoLabel}>Profile Identity</Text>
                <Text style={styles.bentoVal}>{name || 'Dark'}</Text>
                <Text style={styles.bentoSubId}>ID: #SYN-89410</Text>
              </View>

              <View style={styles.bentoCard}>
                <Text style={styles.bentoLabel}>Biological Age</Text>
                <View style={styles.valWithUnit}>
                  <Text style={styles.bentoVal}>{age}</Text>
                  <Text style={styles.bentoUnit}>yrs</Text>
                </View>
                <Text style={styles.bentoSubCyan}>Cellular: 26.2y</Text>
              </View>

              <View style={styles.bentoCard}>
                <Text style={styles.bentoLabel}>Stature / Height</Text>
                <View style={styles.valWithUnit}>
                  <Text style={styles.bentoVal}>{height}</Text>
                  <Text style={styles.bentoUnit}>cm</Text>
                </View>
                <Text style={styles.bentoSubMuted}>5' 10"</Text>
              </View>

              <View style={styles.bentoCard}>
                <Text style={styles.bentoLabel}>Dry Mass / Weight</Text>
                <View style={styles.valWithUnit}>
                  <Text style={styles.bentoVal}>{weight}</Text>
                  <Text style={styles.bentoUnit}>kg</Text>
                </View>
                <Text style={styles.bentoSubMint}>BMI: 22.4 (Optimal)</Text>
              </View>
            </View>
          </View>

          {/* Form Input Adjustments */}
          <View style={styles.formContainer}>
            <Text style={styles.sectionHeader}>CALIBRATE YOUR BIOLOGY</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={name}
                onChangeText={setName}
                placeholder="Dark"
                placeholderTextColor={colors.outline}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>CHRONOLOGICAL AGE</Text>
              <TextInput
                style={styles.fieldInput}
                value={age}
                onChangeText={setAge}
                keyboardType="numeric"
                placeholder="28"
                placeholderTextColor={colors.outline}
              />
            </View>

            <View style={styles.fieldRow}>
              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>HEIGHT (CM)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={height}
                  onChangeText={setHeight}
                  keyboardType="numeric"
                  placeholder="178"
                  placeholderTextColor={colors.outline}
                />
              </View>

              <View style={[styles.fieldGroup, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>WEIGHT (KG)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={weight}
                  onChangeText={setWeight}
                  keyboardType="numeric"
                  placeholder="71.0"
                  placeholderTextColor={colors.outline}
                />
              </View>
            </View>
          </View>

          {/* Primary Action Button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleSave}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>Save Baseline & Pair Watch</Text>
            <MaterialIcons name="arrow-forward" size={18} color="#070e1c" />
          </TouchableOpacity>
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
    paddingTop: 8,
    paddingBottom: 40,
  },
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
  },
  stepperCard: {
    backgroundColor: 'rgba(25, 32, 46, 0.75)',
    borderRadius: radii.xxl,
    padding: spacing.spaceMd,
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.25)',
    marginBottom: 20,
    gap: spacing.spaceSm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  stepTitle: {
    ...typography.labelCapsMd,
    color: colors.primary,
    fontWeight: '700',
  },
  precalBadge: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
  },
  precalText: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  progressTrack: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressBar: {
    width: '66%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.full,
  },
  bentoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  bentoCard: {
    width: '48.5%',
    backgroundColor: colors.surfaceContainerLow,
    padding: 10,
    borderRadius: radii.md,
    gap: 2,
  },
  bentoLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 8.5,
  },
  bentoVal: {
    ...typography.headlineMetricMobile,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 18,
  },
  valWithUnit: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  bentoUnit: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  bentoSubId: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 9.5,
  },
  bentoSubCyan: {
    ...typography.dataMono,
    color: colors.secondary,
    fontSize: 9.5,
  },
  bentoSubMuted: {
    ...typography.dataMono,
    color: colors.onSurfaceVariant,
    fontSize: 9.5,
  },
  bentoSubMint: {
    ...typography.dataMono,
    color: colors.tertiary,
    fontSize: 9.5,
  },
  formContainer: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.spaceMd,
    gap: 14,
    borderWidth: 1,
    borderColor: 'rgba(30, 41, 59, 0.5)',
    marginBottom: 24,
  },
  sectionHeader: {
    ...typography.labelCapsXs,
    color: colors.secondary,
    fontWeight: '700',
    letterSpacing: 1,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    ...typography.labelCapsXs,
    color: colors.onSurfaceVariant,
    fontSize: 9,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldInput: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    height: 46,
    ...typography.bodySm,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: 'rgba(61, 73, 76, 0.5)',
  },
  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radii.full,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
  },
  continueBtnText: {
    ...typography.labelCapsMd,
    color: '#070e1c',
    fontWeight: '700',
    fontSize: 12,
  },
});
