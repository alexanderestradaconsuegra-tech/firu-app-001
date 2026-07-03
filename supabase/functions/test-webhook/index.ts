import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('n8n_webhook_url, notification_email')
    .eq('id', user.id)
    .single();

  if (!profile?.n8n_webhook_url) {
    return new Response(JSON.stringify({ error: 'No webhook URL configured' }), {
      status: 400, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  try {
    const meta = user.user_metadata ?? {};
    const res = await fetch(profile.n8n_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'test',
        title: 'Prueba FIRU',
        owner_name: meta.full_name ?? 'Usuario',
        email: profile.notification_email ?? user.email,
        pet_name: 'Mascota de prueba',
        message: 'La conexión con FIRU funciona correctamente.',
      }),
    });
    return new Response(JSON.stringify({ ok: res.ok, status: res.status }), {
      status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
