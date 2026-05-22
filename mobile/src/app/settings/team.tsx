import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, Alert,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus, Trash2, Edit2, Info, User, Eye, EyeOff } from 'lucide-react-native';
import { useShop, type TeamMember } from '@/context/ShopContext';
import { Colors, Radius, Spacing } from '@/lib/theme';
import { supabase } from '@/lib/supabase';

export default function TeamScreen() {
  const router = useRouter();
  const { shop, updateShop } = useShop();
  const [members, setMembers] = useState<TeamMember[]>(shop?.teamMembers ?? []);
  
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newNameHi, setNewNameHi] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState('STAFF');
  const [showPin, setShowPin] = useState(false);
  
  const [saving, setSaving] = useState(false);

  const openAdd = () => {
    setEditingId(null);
    setNewName('');
    setNewNameHi('');
    setNewPhone('');
    setNewPin('');
    setNewRole('STAFF');
    setIsAdding(true);
  };

  const openEdit = (m: TeamMember) => {
    setEditingId(m.id);
    setNewName(m.name);
    setNewNameHi((m as any).nameHi || '');
    setNewPhone(m.phone);
    setNewPin('');
    setNewRole(m.role || 'STAFF');
    setIsAdding(true);
  };

  const saveMember = async () => {
    const name = newName.trim();
    const phone = newPhone.trim();
    const pin = newPin.trim();
    
    if (!name || !phone || !pin) {
      Alert.alert('Missing Info', 'Please enter Name, Phone, and PIN.');
      return;
    }
    if (phone.length !== 10) {
      Alert.alert('Invalid Phone', 'Phone number must be exactly 10 digits.');
      return;
    }
    if (pin.length < 4) {
      Alert.alert('Invalid PIN', 'PIN must be at least 4 digits.');
      return;
    }
    
    if (members.find(m => m.phone === phone && m.id !== editingId)) {
      Alert.alert('Exists', 'A member with this phone number already exists.');
      return;
    }
    
    setSaving(true);
    try {
      if (!shop?.shopId) throw new Error('Shop is not loaded.');
      const memberId = editingId ?? Date.now().toString();
      const { data, error } = await supabase.rpc('upsert_shop_member_pin', {
        p_shop_id: shop.shopId,
        p_member_id: memberId,
        p_name: name,
        p_phone: phone,
        p_pin: pin,
        p_role: newRole,
      });
      if (error) throw new Error(error.message);
      const savedMember = data as TeamMember;
      const updatedMembers = editingId
        ? members.map(m => m.id === editingId ? { ...savedMember, pin: '' } : m)
        : [...members, { ...savedMember, pin: '' }];
      await updateShop({ teamMembers: updatedMembers });
      setMembers(updatedMembers);
      setIsAdding(false);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Could not save member.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (id: string, name: string) => {
    Alert.alert('Delete Member', `Are you sure you want to remove ${name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          const updated = members.filter(m => m.id !== id);
          setSaving(true);
          try {
            await updateShop({ teamMembers: updated });
            setMembers(updated);
          } catch {
            Alert.alert('Error', 'Could not remove member.');
          } finally {
            setSaving(false);
          }
        }
      }
    ]);
  };

  if (isAdding) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAF9' }} edges={['top', 'bottom']}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', padding: Spacing.md,
            backgroundColor: Colors.primary, borderBottomWidth: 0
          }}>
            <Pressable onPress={() => setIsAdding(false)}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </Pressable>
            <View style={{ marginLeft: Spacing.md }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#FFFFFF' }}>
                {editingId ? 'Edit Member' : 'Add New Member'}
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)' }}>नया सदस्य जोड़ें</Text>
            </View>
          </View>

          <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
            <View style={{ alignItems: 'center', marginVertical: Spacing.md }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center' }}>
                <User size={36} color="#1A5C1F" />
              </View>
            </View>

            <View style={{
              backgroundColor: '#FFF', borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.lg,
              borderWidth: 1, borderColor: '#EAEAEC'
            }}>
              <View>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>Member Information</Text>
                <Text style={{ fontSize: 13, color: '#6A6A6A' }}>सदस्य की जानकारी</Text>
              </View>
              
              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 }}>Member Name (English)</Text>
                <Text style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>सदस्य का नाम (अंग्रेजी)</Text>
                <TextInput
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Enter Full Name"
                  style={{ borderWidth: 1, borderColor: '#CED4DA', borderRadius: Radius.sm, padding: 12, fontSize: 16, color: '#1A1A1A' }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 }}>Member Name (Hindi)</Text>
                <Text style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>सदस्य का नाम (हिंदी)</Text>
                <TextInput
                  value={newNameHi}
                  onChangeText={setNewNameHi}
                  placeholder="पूरा नाम दर्ज करें"
                  style={{ borderWidth: 1, borderColor: '#CED4DA', borderRadius: Radius.sm, padding: 12, fontSize: 16, color: '#1A1A1A' }}
                />
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 }}>Mobile Number</Text>
                <Text style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>मोबाइल नंबर</Text>
                <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
                   <View style={{ paddingHorizontal: 16, justifyContent: 'center', backgroundColor: '#E8F5E9', borderTopLeftRadius: Radius.sm, borderBottomLeftRadius: Radius.sm, borderWidth: 1, borderColor: '#CED4DA', borderRightWidth: 0 }}>
                     <Text style={{ fontSize: 16, color: '#1A1A1A' }}>+91</Text>
                   </View>
                   <TextInput
                     value={newPhone}
                     onChangeText={setNewPhone}
                     placeholder="98765 43210"
                     keyboardType="number-pad"
                     maxLength={10}
                     style={{ flex: 1, borderWidth: 1, borderColor: '#CED4DA', borderTopRightRadius: Radius.sm, borderBottomRightRadius: Radius.sm, padding: 12, fontSize: 16, color: '#1A1A1A' }}
                   />
                </View>
              </View>

              <View>
                <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginBottom: 2 }}>4-Digit Security PIN</Text>
                <Text style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>4 अंकों का सुरक्षा पिन</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#CED4DA', borderRadius: Radius.sm }}>
                  <TextInput
                    value={newPin}
                    onChangeText={setNewPin}
                    placeholder="••••"
                    keyboardType="number-pad"
                    maxLength={4}
                    secureTextEntry={!showPin}
                    style={{ flex: 1, padding: 12, fontSize: 18, letterSpacing: 8, color: '#1A1A1A' }}
                  />
                  <Pressable onPress={() => setShowPin(!showPin)} style={{ padding: 12 }}>
                    {showPin ? <EyeOff size={20} color="#6A6A6A" /> : <Eye size={20} color="#6A6A6A" />}
                  </Pressable>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: '#F0F7FC', padding: 12, borderRadius: Radius.sm }}>
                <Info size={20} color="#1D4ED8" />
                <View>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1D4ED8' }}>Used for portal access</Text>
                  <Text style={{ fontSize: 12, color: '#1D4ED8' }}>पोर्टल एक्सेस के लिए उपयोग किया जाता है</Text>
                </View>
              </View>

              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1A1A1A', marginTop: 8 }}>Role</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {['MANAGER', 'BILLING CLERK', 'STAFF'].map(r => (
                  <Pressable key={r} onPress={() => setNewRole(r)} style={{
                    paddingVertical: 8, paddingHorizontal: 16, borderRadius: Radius.round,
                    backgroundColor: newRole === r ? '#1A5C1F' : '#E8F5E9'
                  }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: newRole === r ? '#FFF' : '#1A5C1F' }}>{r}</Text>
                  </Pressable>
                ))}
              </View>

            </View>
            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={{ padding: Spacing.md, backgroundColor: '#F8FAF9' }}>
            <Pressable
              onPress={saveMember}
              disabled={saving}
              style={{
                backgroundColor: '#1A5C1F', paddingVertical: 14, borderRadius: Radius.sm, alignItems: 'center'
              }}
            >
              {saving ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>Save Member</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#CDDDCF' }}>सदस्य सुरक्षित करें</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // --- List Screen ---
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#F8FAF9' }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.sm,
          paddingHorizontal: Spacing.md,
          paddingVertical: Spacing.sm,
          backgroundColor: '#00450d',
          borderBottomWidth: 0,
        }}
      >
        <Pressable testID="team-back" onPress={() => router.back()} style={{ padding: 4 }}>
          <ArrowLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '800', color: '#FFFFFF', marginLeft: 8 }}>
          Team Members
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: Spacing.md }}>
        <Pressable
          onPress={openAdd}
          style={{
            backgroundColor: '#0F4D19',
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            paddingVertical: 14, borderRadius: Radius.sm, gap: 12
          }}
        >
          <UserPlus size={20} color="#FFF" />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>ADD NEW MEMBER</Text>
            <Text style={{ fontSize: 11, color: '#CDDDCF' }}>नया सदस्य जोड़ें</Text>
          </View>
        </Pressable>

        {members.map(item => (
          <View key={item.id} style={{
            backgroundColor: '#FFF', borderRadius: Radius.md, padding: Spacing.md,
            borderWidth: 1, borderColor: '#EAEAEC', flexDirection: 'row', alignItems: 'center'
          }}>
            <View style={{ flex: 1 }}>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                 <Text style={{ fontSize: 16, fontWeight: '700', color: '#1A1A1A' }}>{item.name}</Text>
                 <View style={{ backgroundColor: item.role === 'MANAGER' ? '#E8F5E9' : item.role === 'BILLING CLERK' ? '#FFF3E0' : '#E0F2FE', paddingHorizontal: 8, paddingVertical: 4, borderRadius: Radius.round }}>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#1A1A1A' }}>{item.role || 'STAFF'}</Text>
                 </View>
               </View>
               <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                 <Text style={{ fontSize: 14, color: '#4A4A4A' }}>+91 {item.phone 	|| 'N/A'}</Text>
               </View>
               <Text style={{ fontSize: 12, color: '#8A8A8A', marginTop: 2 }}>{item.role === 'MANAGER' ? 'प्रबंधक' : item.role === 'BILLING CLERK' ? 'बिलिंग क्लर्क' : 'स्टाफ'}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <Pressable
                onPress={() => openEdit(item)}
                style={{ backgroundColor: '#E0F2FE', width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' }}
              >
                <Edit2 size={20} color="#1D4ED8" />
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(item.id, item.name)}
                style={{ backgroundColor: '#FFF5F5', width: 44, height: 44, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' }}
              >
                <Trash2 size={20} color="#DC2626" />
              </Pressable>
            </View>
          </View>
        ))}

        <View style={{ backgroundColor: '#E0F2FE', padding: Spacing.md, borderRadius: Radius.md, flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: Spacing.lg }}>
          <View style={{ backgroundColor: '#FFF', width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
            <Info size={20} color="#1D4ED8" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A5C1F' }}>{members.length} Total Staff Members</Text>
            <Text style={{ fontSize: 12, color: '#4A4A4A' }}>You can add up to 5 members in the Pro plan.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
