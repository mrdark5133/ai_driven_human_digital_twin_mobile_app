import { Redirect } from 'expo-router';

export default function Index() {
  // Direct entry to main dashboard for frictionless immediate testing
  return <Redirect href="/(tabs)/home" />;
}
