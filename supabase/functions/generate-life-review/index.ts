// Generate a weekly life review using Claude (Anthropic).
// Input: { weekStart?: string (YYYY-MM-DD, defaults to current Monday) }
// Output: { review: { arc, themes[], friction[], pattern, reveals, closing }, cached: boolean }

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function mondayOf(date: Date): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const SYSTEM_PROMPT = `You are writing a weekly life review for someone who has been quietly logging their reflections, completed tasks, and unresolved threads.

Your job: read everything they shared and write back something that makes them feel SEEN — not summarized. The voice is contemplative, warm, specific. Think: a wise friend who actually read it all and noticed the through-lines.

CRITICAL RULES:
- Name specifics. Quote phrases from their reflections. Cite task titles. Reference dates ("Tuesday", "on April 15").
- Use NAMED THEMES that group multiple data points under one insight (e.g. "Tennis is your anchor — three lessons this week, and your Tuesday reflection was your best of the week").
- Connect threads across days. If something appeared in Monday's reflection AND Thursday's, name that.
- Each theme closes with one forward note — a gentle directive, not a metric.
- Contemplative voice. No bullet points in prose. No metrics. No scores. No "great job!" cheerleading.
- Never use clinical or productivity language ("brain dump", "todo", "completed tasks count"). Say "what you moved through" not "completed items".
- No red/destructive framing. Friction is honest, not alarming.
- If data is thin, write less — but still specific. Never pad with platitudes.`;

const TOOL_SCHEMA = {
  name: "weekly_life_review",
  description: "The structured weekly life review.",
  input_schema: {
    type: "object",
    properties: {
      arc: {
        type: "string",
        description:
          "2-4 sentences in serif-italic voice that name the felt shape of the week. Specific, not generic. Quote a phrase if one stands out.",
      },
      themes: {
        type: "array",
        description:
          "3-5 named themes about what's working / where energy lives. Each title is a short declarative ('Tennis is your anchor', 'The Claude breakthrough is real'). Each body is 2-5 sentences with specifics, dates, names, and ends with a forward note.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["title", "body"],
        },
      },
      friction: {
        type: "array",
        description:
          "1-4 named friction points — what's draining, pressing, or unresolved. Same format as themes. Honest but never alarming. Include task titles by name when relevant.",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            body: { type: "string" },
          },
          required: ["title", "body"],
        },
      },
      pattern: {
        type: "string",
        description:
          "1 paragraph naming the pattern underneath the week — recurring threads, the shape of how you're moving through it. Specific.",
      },
      reveals: {
        type: "string",
        description:
          "1-2 sentences in serif-italic voice — what this week reveals about you right now. Felt, not analytical.",
      },
      closing: {
        type: "string",
        description:
          "1-2 sentences. Warm, specific to this week (not generic). A gentle closing note.",
      },
    },
    required: ["arc", "themes", "friction", "pattern", "reveals", "closing"],
  },
};

interface ReflectionRow {
  reflection_date: string;
  texture: string;
  texture_why: string;
  raw_transcript: string;
  energy_givers: string[];
  energy_drainers: string[];
  unresolved_threads: string[];
  what_this_reveals: string;
}

interface CardRow {
  title: string;
  category: string;
  status: string;
  due_at: string | null;
  updated_at: string;
  created_at: string;
}

interface SignalRow {
  provider: string;
  signal_type: string;
  recorded_at: string;
  value: any;
}

function summarizeSignals(signals: SignalRow[]): string {
  if (!signals.length) return "(no connected health/calendar data this week)";

  const lines: string[] = [];
  const byKey = (k: string) => signals.filter((s) => `${s.provider}:${s.signal_type}` === k);

  const sleeps = signals.filter((s) => s.signal_type === "sleep");
  if (sleeps.length) {
    const durations = sleeps
      .map((s) => Number(s.value?.duration_minutes ?? s.value?.total_sleep_minutes))
      .filter((n) => isFinite(n) && n > 0);
    if (durations.length) {
      const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      const min = Math.min(...durations);
      const minNight = sleeps.find(
        (s) => Number(s.value?.duration_minutes ?? s.value?.total_sleep_minutes) === min
      );
      const minDate = minNight?.recorded_at?.slice(0, 10) || "?";
      lines.push(
        `Sleep (${sleeps[0].provider}): ${sleeps.length} nights logged, avg ${Math.floor(avg / 60)}h${String(avg % 60).padStart(2, "0")}m, lowest ${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}m on ${minDate}.`
      );
    }
  }

  const recoveries = byKey("whoop:recovery");
  if (recoveries.length) {
    const scores = recoveries.map((r) => Number(r.value?.score)).filter((n) => isFinite(n));
    if (scores.length) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      lines.push(`WHOOP recovery: avg ${avg}% across ${scores.length} days.`);
    }
  }

  const readiness = byKey("oura:readiness");
  if (readiness.length) {
    const scores = readiness.map((r) => Number(r.value?.score)).filter((n) => isFinite(n));
    if (scores.length) {
      const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      lines.push(`Oura readiness: avg ${avg} across ${scores.length} days.`);
    }
  }

  const workouts = signals.filter((s) => s.signal_type === "workout");
  if (workouts.length) {
    const summaries = workouts.slice(0, 12).map((w) => {
      const date = w.recorded_at.slice(0, 10);
      const type =
        w.value?.type ||
        w.value?.sport_type ||
        w.value?.activity ||
        (w.value?.sport_id ? `sport ${w.value.sport_id}` : "workout");
      const dur = w.value?.duration_minutes ? ` ${w.value.duration_minutes}m` : "";
      return `${date} ${type}${dur}`;
    });
    lines.push(`Workouts (${workouts.length}): ${summaries.join("; ")}.`);
  }

  const steps = byKey("apple_health:steps");
  if (steps.length) {
    const counts = steps.map((s) => Number(s.value?.count)).filter((n) => isFinite(n));
    if (counts.length) {
      const avg = Math.round(counts.reduce((a, b) => a + b, 0) / counts.length);
      lines.push(`Steps: avg ${avg.toLocaleString()}/day across ${counts.length} days.`);
    }
  }

  const cal = signals.filter((s) => s.signal_type === "calendar_event");
  if (cal.length) {
    const byDay = new Map<string, number>();
    for (const c of cal) {
      const d = c.recorded_at.slice(0, 10);
      byDay.set(d, (byDay.get(d) || 0) + 1);
    }
    const heaviest = [...byDay.entries()].sort((a, b) => b[1] - a[1])[0];
    lines.push(
      `Calendar: ${cal.length} events across ${byDay.size} days${heaviest ? `, heaviest ${heaviest[0]} (${heaviest[1]} events)` : ""}.`
    );
  }

  return lines.join("\n");
}

function buildDocument(
  reflections: ReflectionRow[],
  completed: CardRow[],
  pressing: CardRow[],
  signalSummary: string,
  weekStart: string,
  weekEnd: string,
): string {
  const lines: string[] = [];
  lines.push(`# Weekly data for ${weekStart} to ${weekEnd}\n`);

  lines.push(`## Daily reflections (${reflections.length})\n`);
  if (reflections.length === 0) {
    lines.push("(none this period)\n");
  } else {
    for (const r of reflections) {
      lines.push(`### ${r.reflection_date}`);
      if (r.texture) lines.push(`Texture: "${r.texture}"`);
      if (r.texture_why) lines.push(`Why: ${r.texture_why}`);
      if (r.raw_transcript) lines.push(`Raw: ${r.raw_transcript}`);
      if (r.energy_givers?.length)
        lines.push(`Givers: ${r.energy_givers.join("; ")}`);
      if (r.energy_drainers?.length)
        lines.push(`Drainers: ${r.energy_drainers.join("; ")}`);
      if (r.unresolved_threads?.length)
        lines.push(`Unresolved: ${r.unresolved_threads.join("; ")}`);
      if (r.what_this_reveals) lines.push(`Reveals: ${r.what_this_reveals}`);
      lines.push("");
    }
  }

  lines.push(`## What you moved through this week (${completed.length})\n`);
  if (completed.length === 0) {
    lines.push("(none completed this period)\n");
  } else {
    for (const c of completed) {
      const date = (c.updated_at || c.created_at).slice(0, 10);
      lines.push(`- [${date}] (${c.category}) ${c.title}`);
    }
    lines.push("");
  }

  lines.push(`## Pressing or overdue threads right now (${pressing.length})\n`);
  if (pressing.length === 0) {
    lines.push("(none pressing)\n");
  } else {
    for (const c of pressing) {
      const due = c.due_at ? c.due_at.slice(0, 10) : "no date";
      lines.push(`- [due ${due}] (${c.category}) ${c.title}`);
    }
    lines.push("");
  }

  lines.push(`## Signals from connected sources\n`);
  lines.push(signalSummary);

  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Auth: extract user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userResp = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: authHeader,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
      },
    });
    if (!userResp.ok) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { id: userId } = await userResp.json();

    const body = await req.json().catch(() => ({}));
    const force: boolean = body?.force === true;
    const weekStart: string = body?.weekStart || mondayOf(new Date());
    const weekEnd = addDays(weekStart, 6);

    // Cached?
    if (!force) {
      const cachedResp = await fetch(
        `${SUPABASE_URL}/rest/v1/life_reviews?user_id=eq.${userId}&week_start=eq.${weekStart}&select=content`,
        {
          headers: {
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
        },
      );
      const cached = await cachedResp.json();
      if (Array.isArray(cached) && cached.length > 0 && cached[0].content?.arc) {
        return new Response(
          JSON.stringify({ review: cached[0].content, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Pull data
    const headers = {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    };

    const [reflResp, completedResp, pressingResp] = await Promise.all([
      fetch(
        `${SUPABASE_URL}/rest/v1/reflections?user_id=eq.${userId}&reflection_date=gte.${weekStart}&reflection_date=lte.${weekEnd}&order=reflection_date.asc`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/cards?user_id=eq.${userId}&status=eq.complete&updated_at=gte.${weekStart}&updated_at=lte.${weekEnd}T23:59:59&order=updated_at.asc`,
        { headers },
      ),
      fetch(
        `${SUPABASE_URL}/rest/v1/cards?user_id=eq.${userId}&status=eq.active&due_at=not.is.null&order=due_at.asc`,
        { headers },
      ),
    ]);

    const reflections: ReflectionRow[] = await reflResp.json();
    const completed: CardRow[] = await completedResp.json();
    const allActive: CardRow[] = await pressingResp.json();

    // Pressing = due within week or overdue
    const weekEndPlus2 = addDays(weekEnd, 2);
    const pressing = allActive.filter(
      (c) => c.due_at && c.due_at.slice(0, 10) <= weekEndPlus2,
    );

    // Need *some* signal
    if (reflections.length === 0 && completed.length === 0 && pressing.length === 0) {
      return new Response(
        JSON.stringify({ review: null, cached: false, reason: "no_data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const document = buildDocument(reflections, completed, pressing, weekStart, weekEnd);

    // Call Claude
    const anthropicResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-5-20250929",
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "weekly_life_review" },
        messages: [
          {
            role: "user",
            content: `Here is my week. Write the review.\n\n${document}`,
          },
        ],
      }),
    });

    if (!anthropicResp.ok) {
      const errText = await anthropicResp.text();
      console.error("Anthropic error:", anthropicResp.status, errText);
      return new Response(
        JSON.stringify({ error: "Claude error", detail: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const claudeData = await anthropicResp.json();
    const toolUse = claudeData.content?.find((b: any) => b.type === "tool_use");
    if (!toolUse?.input) {
      console.error("No tool_use in Claude response", claudeData);
      return new Response(
        JSON.stringify({ error: "No structured output" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const review = toolUse.input;

    // Upsert into life_reviews
    await fetch(
      `${SUPABASE_URL}/rest/v1/life_reviews?on_conflict=user_id,week_start`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates",
        },
        body: JSON.stringify({
          user_id: userId,
          week_start: weekStart,
          content: review,
          model: "claude-sonnet-4-5-20250929",
        }),
      },
    );

    return new Response(
      JSON.stringify({ review, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("generate-life-review error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
