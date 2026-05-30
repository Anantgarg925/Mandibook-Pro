import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { Colors } from '@/lib/theme';

interface Props {
  label: string;
  value: string;
  isEditing: boolean;
  onToggle: () => void;
  isError?: boolean;
}

export default function EditableSlipRow({ label, value, isEditing, onToggle, isError }: Props) {
  return (
    <Pressable
      onPress={onToggle}
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#D1D5DB'
      }}
    >
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>{label}</Text>
      <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' }}>
        <Text
          style={{
            fontSize: 15,
            color: isError ? Colors.danger : '#111827',
            textAlign: 'right',
            fontWeight: isEditing ? '800' : '500'
          }}
        >
          {value || 'Tap to edit'}
        </Text>
        <ChevronDown
          size={16}
          color="#4B5563"
          style={{
            marginLeft: 4,
            transform: [{ rotate: isEditing ? '180deg' : '0deg' }]
          }}
        />
      </View>
    </Pressable>
  );
}
