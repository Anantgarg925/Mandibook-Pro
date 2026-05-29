import React, { useState, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import * as Contacts from 'expo-contacts';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Clock,
  Phone,
  Search,
  SlidersHorizontal,
  UserPlus,
  Users,
  Plus,
  Trash2,
} from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { DraggableFAB } from '@/components/common/DraggableFAB';
import { useBuyers } from '@/hooks/useBuyers';
import { useShop } from '@/context/ShopContext';
import { supabase } from '@/lib/supabase';
import { toIndianCurrency, toIndianDate } from '@/lib/formatters';
import { generateCode } from '@/utils/buyerCode';
import { FontSize, Spacing, Radius } from '@/lib/theme';
import type { Buyer } from '@/types/inquiry';

export default function BuyerListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isSmall = width < 380;
  const { shop } = useShop();
  const { buyers, loading } = useBuyers();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [addVisible, setAddVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhones, setNewPhones] = useState<string[]>(['']);
  const [openingAmount, setOpeningAmount] = useState('');
  const [openingType, setOpeningType] = useState<'DR' | 'CR'>('DR');
  const [notes, setNotes] = useState('');
  const addBuyerPhoneRef = useRef<TextInput>(null);
  const addBuyerOpeningRef = useRef<TextInput>(null);
  const addBuyerNotesRef = useRef<TextInput>(null);

  const fillBuyerFromContact = (contact: Contacts.Contact | Contacts.ExistingContact) => {
    const phones: string[] = [];
    if (contact.phoneNumbers) {
      contact.phoneNumbers.forEach(p => {
        const cleaned = p.number?.replace(/\D/g, '').slice(-10);
        if (cleaned && !phones.includes(cleaned)) phones.push(cleaned);
      });
    }
    const name =
      contact.name ||
      [contact.firstName, contact.middleName, contact.lastName].filter(Boolean).join(' ');
    if (name) setNewName(name);
    if (phones.length > 0) setNewPhones(phones);
  };

  const pickBuyerContact = async () => {
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Contacts permission needed', 'Contact access is required to select buyer details.');
        return;
      }
      const contact = await Contacts.presentContactPickerAsync();
      if (contact) fillBuyerFromContact(contact);
    } catch (err) {
      console.log('Buyer contact picker error:', err);
      Alert.alert('Could not open contacts', 'Please enter buyer details manually.');
    }
  };

  const sorted = useMemo(
    () =>
      [...buyers]
        .sort((a, b) => b.outstandingBalance - a.outstandingBalance)
        .filter(
          (b) =>
            !search ||
            b.name.toLowerCase().includes(search.toLowerCase()) ||
            b.phone.includes(search) ||
            b.code.toLowerCase().includes(search.toLowerCase())
        ),
    [buyers, search]
  );

  const totalOutstanding = buyers.reduce((s, b) => s + b.outstandingBalance, 0);

  const addBuyerMutation = useMutation({
    mutationFn: async () => {
      if (!shop?.shopId) throw new Error('Missing shop');
      if (!newName.trim()) throw new Error('Name is required');
      const now = Date.now();
      const amount = parseFloat(openingAmount) || 0;
      const signedBalance = openingType === 'CR' ? -amount : amount;
      const code = generateCode(newName, buyers.map((b) => b.code));
      const phoneString = newPhones.map(p => p.trim()).filter(Boolean).join(', ');
      const { error } = await supabase.from('buyers').insert({
        shop_id: shop.shopId,
        code,
        name: newName.trim(),
        phone: phoneString,
        outstanding_balance: signedBalance,
        opening_balance: amount,
        opening_balance_type: openingType,
        opening_balance_date: amount > 0 ? now : null,
        opening_balance_set: amount > 0,
        notes: notes.trim(),
        last_transaction_date: now,
        created_at: now,
      });
      if (error) throw new Error(error.message);
      if (amount > 0) {
        const { error: txError } = await supabase.from('transactions').insert({
          shop_id: shop.shopId,
          buyer_code: code,
          type: 'OPENING',
          amount,
          date: now,
          note: openingType,
          description: 'Opening Balance',
          created_at: now,
        });
        if (txError) throw new Error(txError.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buyers', shop?.shopId] });
      setAddVisible(false);
      setNewName('');
      setNewPhones(['']);
      setOpeningAmount('');
      setOpeningType('DR');
      setNotes('');
    },
    onError: (err) => Alert.alert('Could not add buyer', (err as Error).message),
  });

  const ListHeader = (
    <>
      {/* Unified Header */}
      <View
        style={{
          backgroundColor: '#00450d',
          borderBottomWidth: 0,
          paddingHorizontal: 20,
          paddingVertical: 14,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Pressable
              onPress={() => router.navigate('/' as any)}
              testID="buyers-back"
              hitSlop={8}
            >
              <ArrowLeft size={24} color="#ffffff" />
            </Pressable>
            <View>
              <Text
                style={{
                  fontSize: 26,
                  fontWeight: '700',
                  color: '#ffffff',
                  letterSpacing: -0.5,
                }}
              >
                Buyers / ग्राहक
              </Text>
              <Text style={{ fontSize: 13, color: 'rgba(255, 255, 255, 0.8)', marginTop: 2 }}>
                {buyers.length} active buyer accounts
              </Text>
            </View>
          </View>

          {totalOutstanding > 0 ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text
                style={{
                  fontSize: 10,
                  color: '#64748B',
                  textTransform: 'uppercase',
                  letterSpacing: 0.8,
                  textAlign: 'right',
                }}
              >
                TOTAL RECEIVABLE
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '800',
                  color: '#ba1a1a',
                  textAlign: 'right',
                  marginTop: 2,
                }}
              >
                {toIndianCurrency(totalOutstanding)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Page content starts here */}
      <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>

        {/* Search + Filter row */}
        <View
          style={{
            flexDirection: 'row',
            gap: 12,
            marginBottom: 20,
          }}
        >
          <View style={{ flex: 1, position: 'relative', justifyContent: 'center' }}>
            <TextInput
              testID="buyers-search"
              placeholder="Search by name or code..."
              placeholderTextColor="#9CA3AF"
              value={search}
              onChangeText={setSearch}
              style={{
                height: 56,
                backgroundColor: '#ffffff',
                borderWidth: 1,
                borderColor: '#E5E7EB',
                borderRadius: 14,
                paddingLeft: 48,
                paddingRight: 16,
                fontSize: 15,
                color: '#071e27',
              }}
            />
            <View
              style={{
                position: 'absolute',
                left: 16,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
              }}
              pointerEvents="none"
            >
              <Search size={18} color="#717a6d" />
            </View>
          </View>
          <Pressable
            testID="buyers-filter-btn"
            style={{
              width: 56,
              height: 56,
              backgroundColor: '#ffffff',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: 14,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SlidersHorizontal size={20} color="#41493e" />
          </Pressable>
        </View>
      </View>
    </>
  );

  const renderBuyerCard = ({ item }: { item: Buyer }) => {
    const daysOld =
      (Date.now() - item.lastTransactionDate) / (1000 * 60 * 60 * 24);

    let statusLabel = 'Cleared / भुगतान';
    let statusBg = '#acf4a4';
    let statusText = '#0c5216';
    if (item.outstandingBalance > 0 && daysOld > 7) {
      statusLabel = 'Overdue / बकाया';
      statusBg = '#ffdad6';
      statusText = '#93000a';
    } else if (item.outstandingBalance > 0) {
      statusLabel = 'Pending / लंबित';
      statusBg = '#ffdad6';
      statusText = '#93000a';
    }

    const isPending = item.outstandingBalance > 0;

    return (
      <Pressable
        testID={`buyer-row-${item.code}`}
        onPress={() => router.push(`/buyers/${item.code}` as any)}
        style={{
          marginHorizontal: 16,
          marginBottom: Spacing.md,
        }}
      >
        {({ pressed }) => (
          <View style={{
            backgroundColor: pressed ? '#F8FAFC' : '#FFFFFF',
            borderRadius: 14,
            padding: isSmall ? Spacing.sm : Spacing.md,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            overflow: 'hidden',
          }}>
            {/* Top Row: Name and Status */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm }}>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: FontSize.md, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
                  {item.name}
                </Text>
                <Text numberOfLines={2} style={{ fontSize: isSmall ? FontSize.xs : FontSize.sm, lineHeight: isSmall ? 18 : 20, color: '#111827' }}>
                  Code: {item.code} | {item.notes ? item.notes : (item.phone ? item.phone : 'No details')}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: statusBg,
                  paddingHorizontal: isSmall ? 8 : 12,
                  paddingVertical: 6,
                  borderRadius: 22,
                  alignItems: 'center',
                  minWidth: isSmall ? 86 : 104,
                }}
              >
                {statusLabel.split(' / ').map((part, index, arr) => (
                  <Text key={index} numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: '800', color: statusText }}>
                    {part} {index === 0 && arr.length > 1 ? '/' : ''}
                  </Text>
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: Spacing.md }} />

            {/* Bottom Row: Last Transaction and Amount */}
            <View style={{ flexDirection: isSmall ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmall ? 'flex-start' : 'center', gap: isSmall ? 8 : 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Clock size={14} color="#333" />
                <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, flexShrink: 1 }}>
                  Last: {item.lastTransactionDate > 0 ? toIndianDate(item.lastTransactionDate) : 'N/A'}
                </Text>
              </View>
              <Text style={{ fontSize: FontSize.sm, color: isPending ? '#B91C1C' : '#003D0A', fontWeight: '800', marginLeft: isSmall ? 20 : 8, textAlign: isSmall ? 'left' : 'right' }}>
                {isPending ? `₹ ${toIndianCurrency(item.outstandingBalance).replace('₹', '')}` : '₹ 0.00'}
              </Text>
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: '#f3faff' }}
      edges={['top', 'left', 'right']}
    >
      <View style={{ flex: 1 }}>
        {loading ? (
          <>
            {ListHeader}
            <View
              testID="buyers-loading"
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
            >
              <ActivityIndicator color="#00450d" size="large" />
            </View>
          </>
        ) : (
          <FlatList
            testID="buyers-list"
            data={sorted}
            keyExtractor={(b) => b.code}
            renderItem={renderBuyerCard}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <View
                testID="buyers-empty"
                style={{
                  alignItems: 'center',
                  paddingVertical: 64,
                  paddingHorizontal: 32,
                }}
              >
                <Users size={56} color="#9CA3AF" />
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: '#071e27',
                    marginTop: 16,
                  }}
                >
                  कोई ग्राहक नहीं
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: '#64748B',
                    textAlign: 'center',
                    marginTop: 8,
                  }}
                >
                  Customers appear after first UDHAARI sale
                </Text>
              </View>
            }
          />
        )}

        <DraggableFAB
          onPress={() => setAddVisible(true)}
          testID="add-buyer-fab"
          initialBottom={8}
          initialRight={20}
        >
          <View style={{
            width: 60,
            height: 60,
            borderRadius: 30,
            backgroundColor: '#1b5e20',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <UserPlus size={26} color="#ffffff" />
          </View>
        </DraggableFAB>
      </View>

      <Modal visible={addVisible} transparent animationType="slide" onRequestClose={() => setAddVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <Pressable style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)' }} onPress={() => setAddVisible(false)} />
          <KeyboardAwareScrollView
            onStartShouldSetResponder={() => true}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              maxHeight: '86%',
            }}
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 20 + insets.bottom,
              }}
              keyboardShouldPersistTaps="handled"
              bottomOffset={96}
              extraKeyboardSpace={16}
              disableScrollOnKeyboardHide
            >
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#071e27', marginBottom: 14 }}>
                Add Buyer / ग्राहक जोड़ें
              </Text>
              <Pressable
                testID="add-buyer-contact-picker"
                onPress={pickBuyerContact}
                style={{
                  minHeight: 44,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: '#C8E6C9',
                  backgroundColor: '#E8F5E9',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'row',
                  gap: 8,
                  marginBottom: 10,
                }}
              >
                <Phone size={18} color="#1b5e20" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#1b5e20' }}>
                  Select from contacts
                </Text>
              </Pressable>
              <TextInput
                testID="add-buyer-name"
                value={newName}
                onChangeText={setNewName}
                placeholder="Name / नाम"
                placeholderTextColor="#94A3B8"
                returnKeyType="next"
                onSubmitEditing={() => addBuyerPhoneRef.current?.focus()}
                style={modalInputStyle}
              />
              <View style={{ gap: 8 }}>
                {newPhones.map((phone, index) => (
                  <View key={index} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput
                      value={phone}
                      onChangeText={(text) => {
                        const updated = [...newPhones];
                        updated[index] = text;
                        setNewPhones(updated);
                      }}
                      placeholder={index === 0 ? "Phone / मोबाइल" : "Additional Phone"}
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      returnKeyType="next"
                      ref={index === 0 ? addBuyerPhoneRef : undefined}
                      onSubmitEditing={() => addBuyerOpeningRef.current?.focus()}
                      style={[modalInputStyle, { flex: 1, marginBottom: 0 }]}
                    />
                    {index === Math.max(0, newPhones.length - 1) ? (
                      <Pressable 
                        onPress={() => setNewPhones([...newPhones, ''])} 
                        style={{ padding: 12, backgroundColor: '#F1F5F9', borderRadius: 8, height: 48, justifyContent: 'center' }}>
                        <Plus size={20} color="#64748B" />
                      </Pressable>
                    ) : (
                      <Pressable 
                        onPress={() => setNewPhones(newPhones.filter((_, i) => i !== index))} 
                        style={{ padding: 12, backgroundColor: '#FEE2E2', borderRadius: 8, height: 48, justifyContent: 'center' }}>
                        <Trash2 size={20} color="#EF4444" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TextInput
                  testID="add-buyer-opening"
                  value={openingAmount}
                  onChangeText={setOpeningAmount}
                  placeholder="Opening Balance"
                  placeholderTextColor="#94A3B8"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  ref={addBuyerOpeningRef}
                  onSubmitEditing={() => addBuyerNotesRef.current?.focus()}
                  style={{ ...modalInputStyle, flex: 1 }}
                />
                {(['DR', 'CR'] as const).map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setOpeningType(type)}
                    style={{
                      width: 56,
                      minHeight: 44,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: openingType === type ? '#1b5e20' : '#C8E6C9',
                      backgroundColor: openingType === type ? '#E8F5E9' : '#FFF',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: '800', color: '#1b5e20' }}>{type}</Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                testID="add-buyer-notes"
                value={notes}
                onChangeText={setNotes}
                placeholder="Notes / टिप्पणी"
                placeholderTextColor="#94A3B8"
                returnKeyType="done"
                ref={addBuyerNotesRef}
                style={modalInputStyle}
              />
              <Pressable
                testID="save-add-buyer"
                onPress={() => addBuyerMutation.mutate()}
                disabled={addBuyerMutation.isPending}
                style={{
                  height: 52,
                  borderRadius: 8,
                  backgroundColor: addBuyerMutation.isPending ? '#C8E6C9' : '#1b5e20',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '800' }}>
                  {addBuyerMutation.isPending ? 'Saving...' : 'Save Buyer'}
                </Text>
              </Pressable>
            </KeyboardAwareScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const modalInputStyle = {
  minHeight: 44,
  borderWidth: 1,
  borderColor: '#E5E7EB',
  borderRadius: 8,
  paddingHorizontal: 12,
  fontSize: 14,
  color: '#071e27',
  marginBottom: 10,
  backgroundColor: '#FFFFFF',
};
