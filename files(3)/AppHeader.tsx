import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors, space, type } from '../theme/tokens';

export default function AppHeader({ syncText = 'Noise ColorFit • Synced 2m ago' }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top, height: 64 + insets.top }]}>
      <View style={s.left}>
        <View style={s.logo}><Icon name="heart-pulse" size={18} color={colors.teal} /></View>
        <View>
          <Text style={s.title}>AI-Driven Human</Text>
          <View style={s.row}>
            <View style={s.dot} />
            <Text style={s.sync}>{syncText}</Text>
          </View>
        </View>
      </View>
      <View style={s.avatar}><Text style={s.avatarText}>D</Text></View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.md, backgroundColor: colors.surface },
  left: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logo: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  title: { ...type.title, color: colors.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.green },
  sync: { ...type.labelSm, color: colors.textDim },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.cardHigh, alignItems: 'center', justifyContent: 'center' },
  avatarText: { ...type.title, color: colors.teal, fontWeight: '600' },
});
