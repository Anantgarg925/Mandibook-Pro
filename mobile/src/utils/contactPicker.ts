import { Platform, Alert } from 'react-native';
import * as Contacts from 'expo-contacts';

export interface UnifiedContact {
  name?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  phoneNumbers?: { number?: string }[];
}

export async function presentContactPicker(): Promise<UnifiedContact | null> {
  if (Platform.OS === 'web') {
    const nav = navigator as any;
    if (nav.contacts && typeof nav.contacts.select === 'function') {
      try {
        const contacts = await nav.contacts.select(['name', 'tel'], { multiple: false });
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const name = contact.name?.[0] || '';
          const phoneNumbers = contact.tel?.map((t: string) => ({ number: t })) || [];
          return { name, phoneNumbers };
        }
      } catch (err) {
        console.warn('Web Contacts select error:', err);
      }
    }
    Alert.alert(
      'Not Supported',
      'Select from contacts is not supported on this browser. Please enter details manually.'
    );
    return null;
  }

  // Native Implementation
  try {
    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert(
        'Contacts Permission Needed',
        'Contact access is required to select details. Please enable contacts permission in your device settings.'
      );
      return null;
    }
    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;

    return {
      name: contact.name || [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(' '),
      firstName: contact.firstName,
      middleName: contact.middleName,
      lastName: contact.lastName,
      phoneNumbers: contact.phoneNumbers?.map(p => ({ number: p.number || '' })) || []
    };
  } catch (err) {
    console.error('Native contact picker error:', err);
    Alert.alert('Error', 'Could not open contact list.');
    return null;
  }
}
