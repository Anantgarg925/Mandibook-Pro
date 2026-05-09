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
import { ArrowLeft, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react-native';
import { useShop, type Grade } from '@/context/ShopContext';
import { Colors, FontSize, Spacing, Radius } from '@/lib/theme';

export default function EditGradesScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const [grades, setGrades] = useState<Grade[]>(shop?.grades ?? []);
  const [saving, setSaving] = useState(false);

  const update = (idx: number, field: keyof Grade, value: string) => {
    setGrades(prev => prev.map((g, i) => (i === idx ? { ...g, [field]: value } : g)));
  };

  const remove = (idx: number) => {
    if (grades.length <= 1) {
      Alert.alert('Cannot remove', 'At least one grade required.');
      return;
    }
    setGrades(prev => prev.filter((_, i) => i !== idx));
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setGrades(prev => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    if (idx === grades.length - 1) return;
    setGrades(prev => {
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const addGrade = () => setGrades(prev => [...prev, { code: '', name: '' }]);

  const handleSave = async () => {
    const invalid = grades.some(g => !g.code.trim() || !g.name.trim());
    if (invalid) {
      Alert.alert('Error', 'All grades need a code and name.');
      return;
    }
    setSaving(true);
    try {
      await updateShop({ grades });
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save. Try again.');
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
        <Pressable testID="grades-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>
        <Text style={{ flex: 1, fontSize: FontSize.lg, fontWeight: '800', color: Colors.text }}>
          Grades / ग्रेड
        </Text>
        <Pressable
          testID="save-grades"
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => ({
            paddingVertical: 8,
            paddingHorizontal: Spacing.md,
            borderRadius: Radius.round,
            backgroundColor: saving ? Colors.border : pressed ? Colors.primaryPressed : Colors.primary,
          })}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" size="small" />
          ) : (
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: '#FFF' }}>Save</Text>
          )}
        </Pressable>
      </View>

      <FlatList
        data={grades}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              paddingHorizontal: Spacing.md,
              paddingVertical: 10,
              backgroundColor: Colors.surface,
              borderBottomWidth: 1,
              borderBottomColor: Colors.border,
            }}
          >
            {/* Up/Down arrows */}
            <View style={{ gap: 2 }}>
              <Pressable
                testID={`grade-up-${index}`}
                onPress={() => moveUp(index)}
                style={{ padding: 4 }}
              >
                <ChevronUp size={16} color={index === 0 ? Colors.border : Colors.textSecond} />
              </Pressable>
              <Pressable
                testID={`grade-down-${index}`}
                onPress={() => moveDown(index)}
                style={{ padding: 4 }}
              >
                <ChevronDown
                  size={16}
                  color={index === grades.length - 1 ? Colors.border : Colors.textSecond}
                />
              </Pressable>
            </View>

            {/* Code input */}
            <TextInput
              testID={`grade-code-${index}`}
              value={item.code}
              onChangeText={v => update(index, 'code', v.toUpperCase())}
              placeholder="II"
              placeholderTextColor={Colors.textSecond}
              autoCapitalize="characters"
              style={{
                width: 52,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: Radius.sm,
                paddingHorizontal: 8,
                paddingVertical: 8,
                fontSize: FontSize.sm,
                fontWeight: '800',
                color: Colors.text,
                textAlign: 'center',
                backgroundColor: Colors.background,
              }}
            />

            {/* Name input */}
            <TextInput
              testID={`grade-name-${index}`}
              value={item.name}
              onChangeText={v => update(index, 'name', v)}
              placeholder="Medium"
              placeholderTextColor={Colors.textSecond}
              style={{
                flex: 1,
                borderWidth: 1,
                borderColor: Colors.border,
                borderRadius: Radius.sm,
                paddingHorizontal: Spacing.sm,
                paddingVertical: 8,
                fontSize: FontSize.sm,
                color: Colors.text,
                backgroundColor: Colors.background,
              }}
            />

            {/* Delete */}
            <Pressable
              testID={`grade-delete-${index}`}
              onPress={() => remove(index)}
              style={{ padding: 8 }}
            >
              <Trash2 size={18} color={Colors.danger} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <Pressable
            testID="add-grade"
            onPress={addGrade}
            style={({ pressed }) => ({
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              margin: Spacing.md,
              height: 48,
              borderRadius: Radius.sm,
              borderWidth: 2,
              borderColor: Colors.primary,
              borderStyle: 'dashed',
              backgroundColor: pressed ? '#FFF3E0' : Colors.surface,
            })}
          >
            <Plus size={18} color={Colors.primary} />
            <Text style={{ fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary }}>
              + Grade जोड़ें
            </Text>
          </Pressable>
        }
      />
    </SafeAreaView>
  );
}
