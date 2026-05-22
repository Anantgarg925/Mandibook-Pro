import { Text, View, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
// Removed: import { api } from '@/lib/api/api';

interface SampleResponse {
  message: string;
  timestamp: string;
}

export default function TabTwoScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['sample'],
    queryFn: async (): Promise<SampleResponse> => {
      // Mocking sample route since backend server is removed
      return { message: 'Supabase Migration Active', timestamp: new Date().toISOString() };
    },
  });

  return (
    <ScrollView
      testID="tab-two-screen"
      style={{ flex: 1, backgroundColor: '#FFFFFF' }}
      contentContainerStyle={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 }}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      {isLoading ? (
        <ActivityIndicator testID="loading-indicator" size="large" />
      ) : null}

      {isError ? (
        <View testID="error-view" style={{ alignItems: 'center' }}>
          <Text style={{ color: '#EF4444', fontSize: 18, fontWeight: '600' }}>Connection Error</Text>
          <Text style={{ color: '#6B7280', marginTop: 8, textAlign: 'center' }}>
            Could not connect to the backend. Make sure the server is running.
          </Text>
        </View>
      ) : null}

      {data ? (
        <View testID="data-view" style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 24, fontWeight: '700', color: '#000000', textAlign: 'center' }}>
            {data.message}
          </Text>
          <Text style={{ fontSize: 14, color: '#6B7280', marginTop: 16 }}>
            Timestamp: {data.timestamp}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}
