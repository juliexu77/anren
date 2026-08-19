import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

/** How many Claude generations a person gets on Anren's own key. */
export const FREE_GENERATIONS = 150;

const AI_KEY_SECRET = Deno.env.get('AI_KEY_SECRET');

/** Thrown when someone has used up the house allowance and needs their own key. */
export class QuotaError extends Error {
  constructor() {
    super('needs_own_key');
    this.name = 'QuotaError';
  }
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
}

async function keyMaterial(): Promise<CryptoKey> {
  if (!AI_KEY_SECRET) throw new Error('AI_KEY_SECRET is not configured');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(AI_KEY_SECRET));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

/** AES-GCM encrypt a personal API key. Returns base64 of iv + ciphertext. */
export async function encryptKey(plain: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      await keyMaterial(),
      new TextEncoder().encode(plain),
    ),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return btoa(String.fromCharCode(...packed));
}

export async function decryptKey(packed: string): Promise<string> {
  const bytes = Uint8Array.from(atob(packed), (c) => c.charCodeAt(0));
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: bytes.slice(0, 12) },
    await keyMaterial(),
    bytes.slice(12),
  );
  return new TextDecoder().decode(plain);
}

/** The user's own Anthropic key, if they've connected one. */
export async function ownKeyFor(userId: string): Promise<string | null> {
  const admin = adminClient();
  const { data } = await admin
    .from('user_ai_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data?.encrypted_key) return null;
  try {
    return await decryptKey(data.encrypted_key);
  } catch (error) {
    console.error('could not decrypt stored key:', error);
    return null;
  }
}

/** True when this account never draws down the free allowance. */
async function isExempt(userId: string): Promise<boolean> {
  const admin = adminClient();
  const { data } = await admin
    .from('profiles')
    .select('ai_exempt')
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data?.ai_exempt);
}

/** Throws QuotaError when the house allowance is spent. */
export async function assertHouseAllowance(userId: string): Promise<void> {
  if (await isExempt(userId)) return;
  const admin = adminClient();
  const { data } = await admin
    .from('ai_usage')
    .select('used_count')
    .eq('user_id', userId)
    .maybeSingle();
  if ((data?.used_count ?? 0) >= FREE_GENERATIONS) throw new QuotaError();
}

/**
 * Record one house-key generation and its real cost. Never shown to the user —
 * this is bookkeeping so the allowance can be tuned against actual spend.
 */
export async function recordHouseUsage(userId: string, microCents: number): Promise<void> {
  const admin = adminClient();
  const { data } = await admin
    .from('ai_usage')
    .select('used_count, micro_cents_used')
    .eq('user_id', userId)
    .maybeSingle();

  await admin.from('ai_usage').upsert(
    {
      user_id: userId,
      used_count: (data?.used_count ?? 0) + 1,
      micro_cents_used: (data?.micro_cents_used ?? 0) + Math.round(microCents),
    },
    { onConflict: 'user_id' },
  );
}
