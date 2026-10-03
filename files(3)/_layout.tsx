import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { colors } from '../../theme/tokens';

const tabs = [
  ['home', 'Home', 'home'],
  ['twin', 'Twin', 'heart-pulse'],
  ['insights', 'Insights', 'chart-line'],
  ['assistant', 'Assistant', 'robot-outline'],
  ['profile', 'Profile', 'account-circle'],
] as const;

export default function TabLayout() {
  const insets = useSafeAreaInsets(); // keeps the labels above the phone's gesture bar
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.textDim,
        tabBarStyle: {
          backgroundColor: colors.surface, borderTopWidth: 0,
          height: 60 + insets.bottom, paddingBottom: insets.bottom + 6, paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '500' },
      }}
    >
      {tabs.map(([name, title, icon]) => (
        <Tabs.Screen key={name} name={name} options={{ title, tabBarIcon: ({ color }) => <Icon name={icon} size={24} color={color} /> }} />
      ))}
    </Tabs>
  );
}
