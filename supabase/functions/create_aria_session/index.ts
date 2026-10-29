import { createClient } from 'npm:@supabase/supabase-js@2';

type CreateAriaSessionBody = {
  member_id?: string;
  phone?: string;
  ttl_hours?: number;
};

type MemberRow = {
  id: string;
  shop_id: string;
  role: string | null;
  phone: string;
};

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

function clampTtlHours(value: unknown): number {
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours <= 0) return 24;
  return Math.min(Math.max(Math.floor(hours), 1), 168);
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, '');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function generateTokenPair() {
  const rawBytes = crypto.getRandomValues(new Uint8Array(48));
  const rawToken = base64UrlEncode(rawBytes);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
  const tokenHash = Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { rawToken, tokenHash };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: CreateAriaSessionBody;
  try {
    body = (await req.json()) as CreateAriaSessionBody;
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const memberId = body.member_id?.trim();
  const phone = body.phone ? normalizePhone(body.phone) : '';
  const ttlHours = clampTtlHours(body.ttl_hours);

  if (!memberId || !phone) {
    return new Response(JSON.stringify({ error: 'member_id and phone are required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: member, error: memberError } = await supabase
    .from('members')
    .select('id, shop_id, role, phone')
    .eq('id', memberId)
    .eq('phone', phone)
    .maybeSingle<MemberRow>();

  if (memberError) {
    return new Response(JSON.stringify({ error: memberError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!member) {
    return new Response(JSON.stringify({ error: 'Member not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { rawToken, tokenHash } = await generateTokenPair();
  const expiresAt = Date.now() + ttlHours * 60 * 60 * 1000;

  const { error: insertError } = await supabase.from('app_sessions').insert({
    token_hash: tokenHash,
    shop_id: member.shop_id,
    member_id: member.id,
    role: member.role ?? 'MEMBER',
    expires_at: expiresAt,
  });

  if (insertError) {
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(
    JSON.stringify({
      access_token: rawToken,
      token_type: 'bearer',
      expires_in_hours: ttlHours,
      shop_id: member.shop_id,
      member_id: member.id,
      role: member.role ?? 'MEMBER',
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
});