const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;

type ApiResponse<T> = { data: T };

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        message = body?.error?.message ?? message;
      } catch {}
      throw new Error(message);
    }
    if (res.status === 204) return undefined as T;
    const json = (await res.json()) as ApiResponse<T>;
    return json.data;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err?.name === 'AbortError') {
      throw new Error('Request timed out');
    }
    throw err;
  }
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'DELETE' });
  },
};
