import React from 'react';
import { View, Text } from 'react-native';
import type { ShopData } from '@/context/ShopContext';
import type { TruckGradeEntry } from '@/types/truck';
import { toIndianDate, toIndianWeight } from '@/lib/formatters';

type ReferenceSlipCardProps = {
  shop?: ShopData | null;
  slipNumber: string;
  generatedAt: number;
  itemName: string;
  truckNumber: string;
  totalKg: number;
  gradeRows?: { gradeLabel: string; weightKg: number }[];
  status?: 'draft' | 'authorized';
};

export function makeReferenceSlipNumber(date = new Date()) {
  const year = date.getFullYear();
  const day = String(Math.floor(date.getTime() / 1000) % 100000).padStart(5, '0');
  return `REF-${year}-${day}`;
}

export function normalizeGradeRows(rows: { gradeLabel: string; weightKg: string | number }[]) {
  return rows
    .map((row) => ({
      gradeLabel: row.gradeLabel.trim(),
      weightKg: typeof row.weightKg === 'number' ? row.weightKg : parseFloat(row.weightKg) || 0,
    }))
    .filter((row) => row.gradeLabel && row.weightKg > 0);
}

export function mapEntriesToSlipRows(entries: TruckGradeEntry[]) {
  return entries.map((entry) => ({
    gradeLabel: entry.gradeLabel,
    weightKg: entry.weightKg,
  }));
}

export function ReferenceSlipCard({
  shop,
  slipNumber,
  generatedAt,
  itemName,
  truckNumber,
  totalKg,
  gradeRows = [],
  status = 'draft',
}: ReferenceSlipCardProps) {
  const authorized = status === 'authorized';

  return (
    <View
      collapsable={false}
      style={{
        width: 420,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#111827',
        padding: 22,
      }}
    >
      <Text style={{ fontSize: 24, fontWeight: '900', color: '#111827', textAlign: 'center' }}>
        {shop?.firmName?.toUpperCase() ?? 'MANDIBOOK'}
      </Text>
      <Text style={{ fontSize: 14, color: '#111827', textAlign: 'center', marginTop: 4 }}>
        {[shop?.phone1, shop?.phone2].filter(Boolean).join(' / ')}
      </Text>

      <View
        style={{
          borderWidth: 2,
          borderColor: authorized ? '#166534' : '#111827',
          marginVertical: 16,
          paddingVertical: 8,
          paddingHorizontal: 10,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: '900', color: authorized ? '#166534' : '#111827', textAlign: 'center' }}>
          {authorized ? 'AUTHORIZED' : 'REFERENCE SLIP - NOT A FINAL BILL'}
        </Text>
        {!authorized ? (
          <Text style={{ fontSize: 16, fontWeight: '900', color: '#111827', textAlign: 'center', marginTop: 2 }}>
            संदर्भ पर्ची - अंतिम बिल नहीं
          </Text>
        ) : null}
      </View>

      <SlipRow label="Slip No." value={slipNumber} />
      <SlipRow label="Date / Time" value={`${toIndianDate(generatedAt)} ${new Date(generatedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`} />
      <SlipRow label="Fruit / Item" value={itemName} />
      <SlipRow label="Truck / Lot" value={truckNumber} />
      <SlipRow label="Total Weight" value={toIndianWeight(totalKg)} />
      <SlipRow label="Status" value={authorized ? 'Authorized' : 'Pending Authorization'} />

      {gradeRows.length > 0 ? (
        <View style={{ marginTop: 14, borderWidth: 1, borderColor: '#111827' }}>
          <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderBottomWidth: 1, borderBottomColor: '#111827' }}>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '900', color: '#111827', padding: 8 }}>Grade</Text>
            <Text style={{ width: 150, fontSize: 15, fontWeight: '900', color: '#111827', padding: 8, textAlign: 'right' }}>
              Weight (kg)
            </Text>
          </View>
          {gradeRows.map((row, index) => (
            <View
              key={`${row.gradeLabel}-${index}`}
              style={{ flexDirection: 'row', borderTopWidth: index === 0 ? 0 : 1, borderTopColor: '#D1D5DB' }}
            >
              <Text style={{ flex: 1, fontSize: 15, color: '#111827', padding: 8 }}>{row.gradeLabel}</Text>
              <Text style={{ width: 150, fontSize: 15, color: '#111827', padding: 8, textAlign: 'right' }}>
                {row.weightKg.toFixed(2)}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={{ marginTop: 24, borderBottomWidth: 1, borderBottomColor: '#111827', height: 24 }}>
        <Text style={{ fontSize: 14, color: '#111827' }}>Notes:</Text>
      </View>
    </View>
  );
}

function SlipRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
      <Text style={{ fontSize: 15, fontWeight: '800', color: '#111827' }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: 15, color: '#111827', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}
