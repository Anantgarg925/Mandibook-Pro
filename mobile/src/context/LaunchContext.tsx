import React, { createContext, useContext, useState } from 'react';

interface LaunchContextValue {
  launchComplete: boolean;
  setLaunchComplete: (v: boolean) => void;
}

const LaunchContext = createContext<LaunchContextValue>({
  launchComplete: false,
  setLaunchComplete: () => {},
});

export function LaunchProvider({ children }: { children: React.ReactNode }) {
  const [launchComplete, setLaunchComplete] = useState(false);
  return (
    <LaunchContext.Provider value={{ launchComplete, setLaunchComplete }}>
      {children}
    </LaunchContext.Provider>
  );
}

export function useLaunch() {
  return useContext(LaunchContext);
}
