import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, spacing, radii, typography } from '../theme';
import { DataService } from '../services/dataService';

interface HeaderProps {
  screenTitle?: string;
  onProfilePress?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ screenTitle, onProfilePress }) => {
  const router = useRouter();
  const watch = DataService.getWatch();
  const profile = DataService.getProfile();
  const avatarLetter = profile.name ? profile.name.charAt(0).toUpperCase() : 'D';

  const handleProfile = () => {
    if (onProfilePress) {
      onProfilePress();
    } else {
      router.push('/(tabs)/profile');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        {/* Holographic Logo Icon */}
        <View style={styles.logoIcon}>
          <MaterialIcons name="auto-awesome" size={18} color={colors.primary} />
        </View>

        <View style={styles.titleColumn}>
          <Text style={styles.brandTitle} numberOfLines={1}>
            AI-Driven Human
          </Text>

          {/* Sync indicator pill */}
          <View style={styles.statusPill}>
            <View style={styles.liveDotWrapper}>
              <View style={styles.liveDotPing} />
              <View style={styles.liveDot} />
            </View>
            <Text style={styles.statusText} numberOfLines={1}>
              {watch.lastSyncedText}
            </Text>
          </View>
        </View>
      </View>

      {/* Right "D" Avatar */}
      <TouchableOpacity
        style={styles.avatarButton}
        onPress={handleProfile}
        activeOpacity={0.8}
        accessibilityLabel="Open Profile"
      >
        <Text style={styles.avatarText}>{avatarLetter}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 68,
    paddingHorizontal: spacing.margin,
    backgroundColor: 'rgba(21, 27, 42, 0.92)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(30, 41, 59, 0.5)',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.spaceSm,
    marginRight: spacing.spaceSm,
  },
  logoIcon: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: 'rgba(76, 215, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.3)',
  },
  titleColumn: {
    flex: 1,
    justifyContent: 'center',
  },
  brandTitle: {
    ...typography.titleMd,
    color: colors.onSurface,
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: -0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(25, 32, 46, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radii.full,
    marginTop: 2,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(76, 215, 246, 0.15)',
    maxWidth: 240,
  },
  liveDotWrapper: {
    width: 6,
    height: 6,
    position: 'relative',
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  liveDotPing: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.tertiary,
    opacity: 0.4,
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.tertiary,
  },
  statusText: {
    ...typography.labelCapsXs,
    color: colors.secondary,
    fontSize: 9,
    letterSpacing: 0.2,
    textTransform: 'none',
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    fontFamily: 'Inter_700Bold',
    fontSize: 16,
    fontWeight: '700',
    color: colors.onPrimary,
  },
});
