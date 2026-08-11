import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Drops the audio for notes that already have a transcript. The recording was
 * only ever a means to the words; once the words are kept, the audio goes.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = req.headers.get('Authorization')?.replace('Bearer ', '') ?? '';
  const { data: auth } = await supabase.auth.getUser(token);
  const userId = auth?.user?.id ?? null;


  if (!userId) {
    return new Response(JSON.stringify({ error: 'Not signed in' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { data: notes } = await supabase
    .from('notes')
    .select('id, audio_path')
    .eq('user_id', userId)
    .not('audio_path', 'is', null)
    .not('audio_path', 'is', null)
    .not('transcript', 'is', null);

  let removed = 0;
  for (const note of notes ?? []) {
    const path = note.audio_path as string;
    const paths: string[] = [];
    if (path.endsWith('/')) {
      const { data: files } = await supabase.storage.from('voice-notes').list(path.slice(0, -1));
      for (const f of files ?? []) paths.push(`${path}${f.name}`);
    } else {
      paths.push(path);
      const folder = `${userId}/${note.id}`;
      const { data: files } = await supabase.storage.from('voice-notes').list(folder);
      for (const f of files ?? []) paths.push(`${folder}/${f.name}`);
    }
    if (paths.length) await supabase.storage.from('voice-notes').remove(paths);
    await supabase.from('notes').update({ audio_path: null }).eq('id', note.id);
    removed += 1;
  }

  return new Response(JSON.stringify({ removed }), {
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
