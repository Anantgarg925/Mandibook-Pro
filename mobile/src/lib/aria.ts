// mobile/src/lib/aria.ts
import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ARIA_TOKEN_KEY = 'mandibook_aria_token';
export const ARIA_TOKEN_EXPIRES_KEY = 'mandibook_aria_token_expires';

type CreateAriaResponse = { access_token?: string; expires_in_hours?: number; error?: string };
type LoginResponse = { access_token?: string; token_type?: string; expires_in_hours?: number; error?: string };
type QueryAriaResponse = {
  response?: string;
  answer?: string;
  transcript?: string;
  data?: { response?: string; answer?: string };
  error?: string;
};

function getAriaBaseUrl(): string | null {
  const configured =
    process.env.EXPO_PUBLIC_ARIA_API_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;

  if (!configured) return null;

  return configured
    .replace(/\/$/, '')
    .replace(/\/create_aria_session$/, '')
    .replace(/\/query_aria$/, '')
    .replace(/\/aria\/query$/, '');
}

export async function createAriaSessionForMember(options: {
  memberId?: string;
  phone?: string;
  ttl_hours?: number;
}): Promise<CreateAriaResponse> {
  const functionsBase = getAriaBaseUrl();
  if (!functionsBase) {
    return { error: 'ARIA API URL missing (EXPO_PUBLIC_ARIA_API_URL or EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL)' };
  }

  // Get current Supabase access token so Edge Function can authenticate caller
  const sessionResult = await supabase.auth.getSession();
  const accessToken = sessionResult?.data?.session?.access_token;

  const res = await fetch(`${functionsBase}/create_aria_session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({
      member_id: options.memberId,
      phone: options.phone,
      ttl_hours: options.ttl_hours ?? 24,
    }),
  });

  if (!res.ok) {
    try {
      const j = await res.json();
      return { error: j?.error || `Edge function error: ${res.status}` };
    } catch {
      return { error: `Edge function error: ${res.status}` };
    }
  }

  const payload = (await res.json()) as CreateAriaResponse;
  if (payload.access_token) {
    try {
      await AsyncStorage.setItem(ARIA_TOKEN_KEY, payload.access_token);
      const expiresMs = Date.now() + ((payload.expires_in_hours ?? 24) * 3600 * 1000);
      await AsyncStorage.setItem(ARIA_TOKEN_EXPIRES_KEY, String(expiresMs));
    } catch {
      // ignore storage error (optional: log)
    }
  }
  return payload;
}

export async function loginAriaSession(options: {
  phone: string;
  memberId: string;
}): Promise<LoginResponse> {
  const functionsBase = getAriaBaseUrl();
  if (!functionsBase) {
    return { error: 'ARIA API URL missing (EXPO_PUBLIC_ARIA_API_URL or EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL)' };
  }

  const res = await fetch(`${functionsBase}/aria/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      phone: options.phone,
      member_id: options.memberId,
    }),
  });

  if (!res.ok) {
    try {
      const j = await res.json();
      return { error: j?.detail || j?.error || `Edge function error: ${res.status}` };
    } catch {
      return { error: `Edge function error: ${res.status}` };
    }
  }

  return (await res.json()) as LoginResponse;
}

export async function getStoredAriaToken(): Promise<string | null> {
  const token = await AsyncStorage.getItem(ARIA_TOKEN_KEY);
  const expires = await AsyncStorage.getItem(ARIA_TOKEN_EXPIRES_KEY);
  if (!token || !expires) return null;
  if (Number(expires) < Date.now()) {
    // expired
    await AsyncStorage.removeItem(ARIA_TOKEN_KEY).catch(()=>{});
    await AsyncStorage.removeItem(ARIA_TOKEN_EXPIRES_KEY).catch(()=>{});
    return null;
  }
  return token;
}

export async function queryAria(options: {
  query: string;
  token?: string;
}): Promise<QueryAriaResponse> {
  const functionsBase = getAriaBaseUrl();
  if (!functionsBase) {
    return { error: 'ARIA API URL missing (EXPO_PUBLIC_ARIA_API_URL or EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL)' };
  }

  const res = await fetch(`${functionsBase}/aria/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify({ query: options.query }),
  });

  if (!res.ok) {
    try {
      const j = await res.json();
      return { error: j?.error || `Edge function error: ${res.status}` };
    } catch {
      return { error: `Edge function error: ${res.status}` };
    }
  }

  const contentType = res.headers.get('content-type') || '';
  const raw = contentType.includes('application/json')
    ? await res.json()
    : { response: await res.text() };
  const payload = raw as QueryAriaResponse;
  return {
    ...payload,
    response: payload.response ?? payload.answer ?? payload.data?.response ?? payload.data?.answer,
  };
}

export async function queryAriaByVoice(options: {
  audioBase64: string;
  audioFormat?: string;
  token?: string;
}): Promise<QueryAriaResponse> {
  const functionsBase = getAriaBaseUrl();
  if (!functionsBase) {
    return { error: 'ARIA API URL missing (EXPO_PUBLIC_ARIA_API_URL or EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL)' };
  }

  const res = await fetch(`${functionsBase}/aria/voice-query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: JSON.stringify({
      audio_base64: options.audioBase64,
      audio_format: options.audioFormat ?? 'm4a',
    }),
  });

  if (!res.ok) {
    try {
      const j = await res.json();
      return { error: j?.detail || j?.error || `Edge function error: ${res.status}` };
    } catch {
      return { error: `Edge function error: ${res.status}` };
    }
  }

  const payload = (await res.json()) as QueryAriaResponse;
  return {
    ...payload,
    response: payload.response ?? payload.answer ?? payload.data?.response ?? payload.data?.answer,
  };
}
