import { Link, Stack } from 'expo-router';
import { Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Oops!' }} />
      <View testID="not-found-screen" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', padding: 20 }}>
        <Text style={{ fontSize: 20, fontWeight: '700', color: '#000000' }}>
          This screen doesn't exist.
        </Text>

        <Link href="/" testID="go-home-link" style={{ marginTop: 16, paddingVertical: 16 }}>
          <Text style={{ fontSize: 14, color: '#3B82F6' }}>Go to home screen!</Text>
        </Link>
      </View>
    </>
  );
}
