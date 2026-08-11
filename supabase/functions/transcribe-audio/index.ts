import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');

// Cheapest accurate transcription model. Roughly $0.003 per audio minute.
const TRANSCRIBE_MODEL = 'gpt-4o-mini-transcribe';

const EXTENSIONS: Record<string, string> = {
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'mp4',
  'audio/m4a': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size < 1024) {
      return json({ error: 'No usable audio supplied' }, 400);
    }
    if (file.size > 20 * 1024 * 1024) {
      return json({ error: 'Audio too large' }, 413);
    }

    // Name the upload for what it actually is — OpenAI infers the container
    // from the extension, so a mismatch reads as a corrupt file.
    const mime = (file.type || '').split(';')[0].toLowerCase();
    const ext = EXTENSIONS[mime] ?? 'wav';

    const upstream = new FormData();
    upstream.append('model', TRANSCRIBE_MODEL);
    upstream.append('file', file, `recording.${ext}`);

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: upstream,
    });

    if (!response.ok) {
      const details = await response.text();
      console.error(`transcription failed [${response.status}]: ${details}`);
      return json({ error: 'Transcription failed', status: response.status, details }, response.status);
    }

    const result = await response.json();
    return json({ text: result.text ?? '' });
  } catch (error) {
    console.error('transcribe-audio error:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
