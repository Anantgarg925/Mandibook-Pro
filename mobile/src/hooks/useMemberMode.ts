import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MEMBER_SESSION_KEY, type AppSession } from '@/lib/session';

export function useMemberMode() {
  const [isMemberMode, setIsMemberMode] = useState<boolean | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    AsyncStorage.getItem(MEMBER_SESSION_KEY)
      .then((raw) => {
        const session = raw ? JSON.parse(raw) as AppSession : null;
        if (session?.role === 'ADMIN') {
          AsyncStorage.removeItem(MEMBER_SESSION_KEY).catch(() => {});
        }
        if (mounted) setIsMemberMode(!!session && session.role !== 'ADMIN');
      })
      .catch(() => {
        if (mounted) setIsMemberMode(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return isMemberMode;
}
