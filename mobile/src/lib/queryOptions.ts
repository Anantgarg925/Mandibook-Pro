export const QUERY_TIMING = {
  liveStaleTime: 30_000,
  liveRefetchInterval: 120_000, // ✅ Reduced from 60s to 2min to reduce battery drain
  archiveStaleTime: 5 * 60_000,
  cacheTime: 10 * 60_000,
} as const;

export const liveQueryOptions = {
  staleTime: QUERY_TIMING.liveStaleTime,
  gcTime: QUERY_TIMING.cacheTime,
  refetchInterval: QUERY_TIMING.liveRefetchInterval,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true, // ✅ Only refetch when reconnecting (smart polling)
} as const;

export const archiveQueryOptions = {
  staleTime: QUERY_TIMING.archiveStaleTime,
  gcTime: QUERY_TIMING.cacheTime,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
} as const;
