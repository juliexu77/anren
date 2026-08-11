import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { adminClient, encryptKey } from '../_shared/usage.ts';

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Unauthorized' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: 'Unauthorized' }, 401);

    const body = await req.json().catch(() => ({}));
    const action = body?.action;
    const admin = adminClient();

    if (action === 'remove') {
      const { error } = await admin.from('user_ai_keys').delete().eq('user_id', user.id);
      if (error) throw error;
      return json({ ok: true, connected: false });
    }

    if (action === 'save') {
      const key = typeof body.key === 'string' ? body.key.trim() : '';
      if (!key.startsWith('sk-ant-') || key.length < 40) {
        return json({ error: 'That doesn\'t look like an Anthropic key. They begin with sk-ant-.' }, 400);
      }

      // Prove the key works before storing it, so failures land here and not
      // in the middle of someone's note.
      const check = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-5',
          max_tokens: 8,
          messages: [{ role: 'user', content: 'Say ok.' }],
        }),
      });

      if (!check.ok) {
        const details = await check.text();
        console.error(`key check failed [${check.status}]`);
        const message = check.status === 401
          ? 'Anthropic didn\'t accept that key.'
          : check.status === 400 && details.includes('credit')
            ? 'That key works, but the account has no credit yet.'
            : 'Anthropic couldn\'t use that key just now.';
        return json({ error: message }, 400);
      }

      const { error } = await admin.from('user_ai_keys').upsert(
        { user_id: user.id, encrypted_key: await encryptKey(key), updated_at: new Date().toISOString() },
        { onConflict: 'user_id' },
      );
      if (error) throw error;

      return json({ ok: true, connected: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (error) {
    console.error('manage-ai-key error:', (error as Error).message);
    return json({ error: (error as Error).message }, 500);
  }
});
