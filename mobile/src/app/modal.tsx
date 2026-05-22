import { StatusBar } from 'expo-status-bar';
import { Platform, Text, View } from 'react-native';


export default function ModalScreen() {
  return (
    <View testID="modal-screen" style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#000000' }}>Modal</Text>
      <View style={{ marginVertical: 32, height: 1, width: '80%', backgroundColor: '#E5E7EB' }} />

      {/* Use a light status bar on iOS to account for the black space above the modal */}
      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </View>
  );
}
