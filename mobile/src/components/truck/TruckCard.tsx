import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { MapPin, Clock, CheckCircle } from 'lucide-react-native';
import { FontSize, Spacing, Radius } from '@/lib/theme';
import type { Truck } from '@/types/truck';
import { useResponsive } from '@/hooks/useResponsive';

type Props = { truck: Truck; onPress: () => void };

const formatTime = (ts: number | undefined, fallback: string) => {
  if (!ts) return { timeEn: fallback, timeHi: fallback.replace('AM', 'पूर्वाह्न').replace('PM', 'अपराह्न') };
  const d = new Date(ts);
  const timeEn = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  const timeHi = timeEn.replace('AM', 'पूर्वाह्न').replace('PM', 'अपराह्न');
  return { timeEn, timeHi };
};

export default function TruckCard({ truck, onPress }: Props) {
  const { contentHPad, isSmall } = useResponsive();
  const totalAllocated = truck.gradeInventory.reduce((s, g) => s + g.confirmedKg + g.provisionalKg, 0);
  const totalKg = truck.totalKg || 1; // prevent div by zero
  const progressPercent = Math.round((totalAllocated / totalKg) * 100);

  // Derive status from our naive data
  let displayStatus = 'ARRIVED';
  let badgeColor = '#005589';
  let badgeTextColor = '#FFFFFF';
  let badgeTextHi = 'पहुँची';

  let progressLabel = 'Waiting / प्रतीक्षारत';
  let progressColor = '#E6F6FF';

  const arrTime = formatTime(truck.arrivalTime || truck.createdAt, '10:30 AM');
  
  let lowerLeftIcon = <Clock size={14} color="#333" />;
  let lowerLeftText = `Arrival: ${arrTime.timeEn} / आगमन: ${arrTime.timeHi}`;
  let lowerRightText = 'Start / शुरू करें';

  if (truck.status === 'CLOSED' || totalAllocated >= truck.totalKg) {
    const outTime = formatTime(truck.gateOutTime || Date.now(), '12:45 PM');
    displayStatus = 'COMPLETED';
    badgeColor = '#10651D';
    badgeTextColor = '#FFFFFF';
    badgeTextHi = 'पूर्ण';
    progressLabel = 'Unloaded / खाली हो गया';
    progressColor = '#00450D';
    lowerLeftIcon = <CheckCircle size={14} color="#333" />;
    lowerLeftText = `Gate Out: ${outTime.timeEn} / गेट आउट: ${outTime.timeHi}`;
    lowerRightText = 'Receipt / रसीद';
  } else if (totalAllocated > 0) {
    const gateStr = truck.gateNo || '4';
    displayStatus = 'UNLOADING';
    badgeColor = '#FFB300';
    badgeTextColor = '#064014';
    badgeTextHi = 'अनलोडिंग';
    progressLabel = 'Progress / प्रगति';
    progressColor = '#8A5A00';
    lowerLeftIcon = <MapPin size={14} color="#333" />;
    lowerLeftText = `Gate No. ${gateStr} / गेट नं. ${gateStr}`;
    lowerRightText = 'Details / विवरण';
  }

  const driverNameEn = truck.senderName || 'Unknown';
  const driverNameHi = truck.senderNameHi || (driverNameEn === 'Ramesh Yadav' ? 'रमेश यादव' : driverNameEn);

  return (
    <Pressable
      testID={`truck-card-${truck.id}`}
      onPress={onPress}
      style={{
        marginHorizontal: Math.max(16, contentHPad),
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md, gap: Spacing.sm }}>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: FontSize.md, fontWeight: '700', color: '#111827', marginBottom: 4 }}>
            {truck.truckNumber}
          </Text>
          <Text numberOfLines={2} style={{ fontSize: isSmall ? FontSize.xs : FontSize.sm, lineHeight: isSmall ? 18 : 20, color: '#111827' }}>
            Driver: {driverNameEn} / {driverNameHi}
          </Text>
        </View>
        <View
          style={{
            backgroundColor: badgeColor,
            paddingHorizontal: isSmall ? 8 : 12,
            paddingVertical: 6,
            borderRadius: 22,
            alignItems: 'center',
            minWidth: isSmall ? 86 : 104,
          }}
        >
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: '800', color: badgeTextColor }}>{displayStatus} /</Text>
          <Text numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: 11, fontWeight: '800', color: badgeTextColor }}>{badgeTextHi}</Text>
        </View>
      </View>

      <View style={{ marginBottom: Spacing.md }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: FontSize.xs, color: '#374151' }}>{progressLabel}</Text>
          <Text style={{ fontSize: FontSize.xs, color: '#374151' }}>{progressPercent}%</Text>
        </View>
        <View style={{ height: 7, backgroundColor: '#E6F6FF', borderRadius: 4, overflow: 'hidden' }}>
          <View style={{ width: `${progressPercent}%`, height: '100%', backgroundColor: progressColor }} />
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: '#E5E7EB', marginBottom: Spacing.md }} />

      <View style={{ flexDirection: isSmall ? 'column' : 'row', justifyContent: 'space-between', alignItems: isSmall ? 'flex-start' : 'center', gap: isSmall ? 8 : 0 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
          {lowerLeftIcon}
          <Text style={{ fontSize: 12, color: '#374151', marginLeft: 6, flexShrink: 1 }}>
            {lowerLeftText}
          </Text>
        </View>
        <Text style={{ fontSize: FontSize.sm, color: '#003D0A', fontWeight: '800', marginLeft: isSmall ? 20 : 8, textAlign: isSmall ? 'left' : 'right' }}>
          {lowerRightText}
        </Text>
      </View>
        </View>
      )}
    </Pressable>
  );
}
