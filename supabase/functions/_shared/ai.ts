import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const GATEWAY = 'https://ai.gateway.lovable.dev/v1';

export const EMBEDDING_MODEL = 'google/gemini-embedding-001';
export const CHAT_MODEL = 'google/gemini-2.5-flash';

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function requireKey(): string {
  if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');
  return LOVABLE_API_KEY;
}

/** Chat completion against Lovable AI. Returns the assistant message text. */
export async function chat(
  messages: { role: string; content: string }[],
  options: { model?: string; temperature?: number } = {},
): Promise<string> {
  const response = await fetch(`${GATEWAY}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requireKey()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: options.model ?? CHAT_MODEL,
      messages,
      ...(options.temperature !== undefined ? { temperature: options.temperature } : {}),
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`[${response.status}]: ${details}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
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
