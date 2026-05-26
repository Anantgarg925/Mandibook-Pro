import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { APP_SESSION_KEY, MEMBER_SESSION_KEY } from '@/lib/session';

interface LaunchContextValue {
  launchComplete: boolean;
  setLaunchComplete: (v: boolean) => void;
  sessionHydrated: boolean;
}

const LaunchContext = createContext<LaunchContextValue>({
  launchComplete: false,
  setLaunchComplete: () => {},
  sessionHydrated: false,
});

export function LaunchProvider({ children }: { children: React.ReactNode }) {
  const [launchComplete, setLaunchComplete] = useState(false);
  const [sessionHydrated, setSessionHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      AsyncStorage.getItem(APP_SESSION_KEY),
      AsyncStorage.getItem(MEMBER_SESSION_KEY),
    ])
      .then(([appSession, memberSession]) => {
        if (!mounted) return;
        setLaunchComplete(Boolean(appSession || memberSession));
      })
      .catch(() => {
        if (!mounted) return;
        setLaunchComplete(false);
      })
      .finally(() => {
        if (mounted) setSessionHydrated(true);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <LaunchContext.Provider value={{ launchComplete, setLaunchComplete, sessionHydrated }}>
      {children}
    </LaunchContext.Provider>
  );
}

export function useLaunch() {
  return useContext(LaunchContext);
}
