import React from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import { Trash2, GripVertical, PlusCircle } from 'lucide-react-native';
import { Colors, Spacing, FontSize, Radius } from '@/lib/theme';
import type { Grade } from '@/context/ShopContext';

type Props = { grades: Grade[]; onChange: (grades: Grade[]) => void };

export default function Step3_Grades({ grades, onChange }: Props) {
  const updateGrade = (index: number, field: keyof Grade, value: string) => {
    const next = grades.map((g, i) => (i === index ? { ...g, [field]: value } : g));
    onChange(next);
  };

  const deleteGrade = (index: number) => {
    onChange(grades.filter((_, i) => i !== index));
  };

  const addGrade = () => {
    onChange([...grades, { code: '', name: '' }]);
  };

  return (
    <ScrollView
      contentContainerStyle={{ padding: Spacing.lg, paddingBottom: Spacing.xl }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Text style={{ fontSize: FontSize.md, fontWeight: '700', color: Colors.text, marginBottom: 4 }}>
        माल की ग्रेडिंग
      </Text>
      <Text style={{ fontSize: FontSize.sm, color: Colors.textSecond, marginBottom: Spacing.lg }}>
        Fruit Grades — Add or remove as needed
      </Text>

      {grades.map((grade, index) => (
        <View
          key={index}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: Spacing.sm,
            marginBottom: Spacing.sm,
            backgroundColor: Colors.surface,
            borderRadius: Radius.sm,
            borderWidth: 1,
            borderColor: Colors.border,
            paddingVertical: 10,
            paddingHorizontal: Spacing.sm,
          }}
        >
          <GripVertical size={18} color={Colors.border} />
          <TextInput
            testID={`grade-code-${index}`}
            style={{
              width: 64,
              height: 40,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 6,
              paddingHorizontal: 8,
              fontSize: FontSize.sm,
              color: Colors.text,
              backgroundColor: Colors.background,
              textAlign: 'center',
              fontWeight: '700',
            }}
            placeholder="Code"
            placeholderTextColor={Colors.border}
            value={grade.code}
            onChangeText={(v) => updateGrade(index, 'code', v.toUpperCase())}
            autoCapitalize="characters"
            maxLength={6}
          />
          <TextInput
            testID={`grade-name-${index}`}
            style={{
              flex: 1,
              height: 40,
              borderWidth: 1,
              borderColor: Colors.border,
              borderRadius: 6,
              paddingHorizontal: 8,
              fontSize: FontSize.sm,
              color: Colors.text,
              backgroundColor: Colors.background,
            }}
            placeholder="Grade name"
            placeholderTextColor={Colors.border}
            value={grade.name}
            onChangeText={(v) => updateGrade(index, 'name', v)}
          />
          <Pressable
            testID={`delete-grade-${index}`}
            onPress={() => deleteGrade(index)}
            style={{ padding: 4 }}
            disabled={grades.length <= 1}
          >
            <Trash2 size={18} color={grades.length <= 1 ? Colors.border : Colors.danger} />
          </Pressable>
        </View>
      ))}

      <Pressable
        testID="add-grade-button"
        onPress={addGrade}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingVertical: Spacing.md,
          marginTop: Spacing.xs,
        }}
      >
        <PlusCircle size={20} color={Colors.primary} />
        <Text style={{ fontSize: FontSize.md, color: Colors.primary, fontWeight: '600' }}>
          + Add Grade
        </Text>
      </Pressable>

      {grades.length === 0 ? (
        <Text style={{ color: Colors.danger, fontSize: FontSize.sm, marginTop: Spacing.xs }}>
          Minimum 1 grade required
        </Text>
      ) : null}
    </ScrollView>
  );
}
