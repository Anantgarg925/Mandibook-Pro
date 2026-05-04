import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react-native';
import { useShop } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

export default function TeamScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const [members, setMembers] = useState<string[]>(shop?.teamNames ?? []);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (members.includes(name)) {
      Alert.alert('Already exists');
      return;
    }
    setMembers(prev => [...prev, name]);
    setNewName('');
  };

  const remove = (idx: number) => setMembers(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateShop({ teamNames: members });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <Pressable testID="team-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Team Members
        </Text>
        <Pressable
          testID="save-team"
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.round,
            backgroundColor: saving ? Colors.border : pressed ? '#E55A00' : Colors.primary,
          })}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Save</Text>
          )}
        </Pressable>
      </View>

      {/* Add member row */}
      <View
        style={{
          flexDirection: 'row',
          gap: Spacing.sm,
          padding: Spacing.md,
          backgroundColor: Colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: Colors.border,
        }}
      >
        <TextInput
          testID="team-member-input"
          value={newName}
          onChangeText={setNewName}
          placeholder="Team member name..."
          placeholderTextColor={Colors.textSecond}
          onSubmitEditing={add}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: Radius.sm,
            paddingHorizontal: Spacing.sm,
            paddingVertical: 10,
            fontSize: FontSize.sm,
            color: Colors.text,
          }}
        />
        <Pressable
          testID="add-team-member"
          onPress={add}
          style={({ pressed }) => ({
            width: 44,
            height: 44,
            borderRadius: Radius.sm,
            backgroundColor: pressed ? '#E55A00' : Colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          })}
        >
          <Plus size={20} color="#FFF" />
        </Pressable>
      </View>

      <FlatList
        testID="team-list"
        data={members}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: Spacing.md,
              paddingVertical: 14,
              backgroundColor: Colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            <Text
              style={{ flex: 1, fontSize: FontSize.sm, fontWeight: '600', color: Colors.text }}
            >
              {item}
            </Text>
            <Pressable
              testID={`remove-member-${index}`}
              onPress={() => remove(index)}
              style={{ padding: 8 }}
            >
              <Trash2 size={18} color={Colors.danger} />
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          <View
            testID="team-empty"
            style={{ alignItems: 'center', paddingVertical: 48 }}
          >
            <Text style={{ color: Colors.textSecond }}>No team members yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
