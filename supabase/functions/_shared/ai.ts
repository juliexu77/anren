import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { QuotaError, assertHouseAllowance, ownKeyFor, recordHouseUsage } from './usage.ts';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const GATEWAY = 'https://ai.gateway.lovable.dev/v1';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export const EMBEDDING_MODEL = 'google/gemini-embedding-001';
export const CHAT_MODEL = 'claude-sonnet-4-5';

// Sonnet list price, expressed as millionths of a cent per token so the maths
// stays in integers: $3 / M input, $15 / M output.
const INPUT_MICRO_CENTS_PER_TOKEN = 300;
const OUTPUT_MICRO_CENTS_PER_TOKEN = 1500;

export { QuotaError };

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** 402 body every caller returns when the free allowance is spent. */
export function needsOwnKeyResponse() {
  return jsonResponse({ error: 'needs_own_key' }, 402);
}

function requireKey(): string {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
  return LOVABLE_API_KEY;
}

/**
 * Chat completion against Claude. Returns the assistant message text.
 *
 * With a `userId`: uses that person's own key when they've connected one
 * (unmetered), otherwise draws on Anren's key until the free allowance runs
 * out, at which point it throws QuotaError.
 */
export async function chat(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number; maxTokens?: number; userId?: string } = {},
): Promise<string> {
  let apiKey = ANTHROPIC_API_KEY;
  let onHouseKey = true;

  if (options.userId) {
    const personal = await ownKeyFor(options.userId);
    if (personal) {
      apiKey = personal;
      onHouseKey = false;
    } else {
      await assertHouseAllowance(options.userId);
    }
  }

  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');

  // Anthropic takes the system prompt as a top-level field, not a message.
  const system = messages
    .filter((m) => m.role === 'system')
    .map((m) => m.content)
    .join('\n\n');

  const turns = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const response = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? CHAT_MODEL,
      max_tokens: options.maxTokens ?? 4096,
      ...(system ? { system } : {}),
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
      messages: turns.length ? turns : [{ role: 'user', content: system || 'Hello' }],
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`[${response.status}]: ${details}`);
  }

  const data = await response.json();

  if (options.userId && onHouseKey) {
    const usage = data.usage ?? {};
    const microCents =
      (usage.input_tokens ?? 0) * INPUT_MICRO_CENTS_PER_TOKEN +
      (usage.output_tokens ?? 0) * OUTPUT_MICRO_CENTS_PER_TOKEN;
    await recordHouseUsage(options.userId, microCents);
  }

  const parts = Array.isArray(data.content) ? data.content : [];
  return parts
    .filter((p: { type?: string }) => p?.type === 'text')
    .map((p: { text?: string }) => p.text ?? '')
    .join('')
    .trim();
}



/** Embed a batch of strings. Returns one vector per input. */
export async function embed(inputs: string[]): Promise<number[][]> {
  const response = await fetch(`${GATEWAY}/embeddings`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: inputs }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`[${response.status}]: ${details}`);
  }

  const data = await response.json();
  return (data.data ?? []).map((row: { embedding: number[] }) => row.embedding);
}

/** Extract the first JSON object from a model response that may be fenced. */
export function parseJsonBlock<T>(text: string): T | null {
  const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}

/** Split a transcript into overlapping passages for embedding. */
export function chunkText(text: string, size = 1200, overlap = 200): string[] {
  const clean = text.trim();
  if (clean.length <= size) return clean ? [clean] : [];
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < clean.length) {
    chunks.push(clean.slice(cursor, cursor + size));
    cursor += size - overlap;
  }
  return chunks;
}
