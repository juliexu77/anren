import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { greetingLine } from "@/lib/greeting";
import { ThemePills, type ThemePill } from "@/components/ThemePills";

/** How stale a reading can get before anren has another look. */
const RECOMPUTE_AFTER_MS = 6 * 60 * 60 * 1000;
/** How many new notes are enough to be worth a fresh look on their own. */
const NEW_NOTES_TRIGGER = 2;

interface Texture {
  title: string;
  detail?: string;
  note_ids?: string[];
}

interface Said {
  observation: string | null;
  noteIds: string[];
  textures: Texture[];
}

const asTextures = (raw: unknown): Texture[] =>
  Array.isArray(raw)
    ? (raw as Texture[]).filter((t) => t && typeof t.title === "string" && t.title.trim())
    : [];

/**
 * One quiet line above the blank page, and beneath it the texture of the week —
 * a few felt words drawn from how you sound, not what you've been saying.
 * The line stays until a new reading replaces it; the words are there to be tapped
 * for the one sentence of evidence behind them.
 */
export function HomeNote() {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState<string | null>(null);
  const [said, setSaid] = useState<Said>({ observation: null, noteIds: [], textures: [] });
  const [titles, setTitles] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (!user) return;
    let alive = true;

    const run = async () => {
      const { data: last } = await supabase
        .from("notes")
        .select("recorded_at")
        .is("deleted_at", null)
        .order("recorded_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!alive) return;

      // Nothing kept yet: the page stays completely blank on a first run.
      if (!last) return;

      setGreeting(greetingLine(new Date(last.recorded_at)));

      const { data: stored } = await supabase
        .from("home_notes")
        .select("line, textures, computed_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (stored) {
        setSaid({
          observation: stored.line ?? null,
          noteIds: [],
          textures: asTextures(stored.textures),
        });
      }

      const stale =
        !stored ||
        Date.now() - new Date(stored.computed_at).getTime() > RECOMPUTE_AFTER_MS;

      let fresh = stale;
      if (!fresh && stored) {
        const { count } = await supabase
          .from("notes")
          .select("id", { count: "exact", head: true })
          .is("deleted_at", null)
          .gt("recorded_at", stored.computed_at);
        fresh = (count ?? 0) >= NEW_NOTES_TRIGGER;
      }

      if (!fresh || !alive) return;

      // Silent by design: if this fails or finds nothing, what's stored stands.
      const { data, error } = await supabase.functions.invoke("home-note");
      if (!alive || error) return;
      const observation = (data?.observation as string | undefined) ?? null;
      const textures = asTextures(data?.textures);
      setSaid({
        observation,
        noteIds: [],
        textures,
      });
    };

    void run();
    return () => {
      alive = false;
    };
  }, [user]);

  const textureNoteIds = useMemo(
    () => [...new Set(said.textures.flatMap((t) => t.note_ids ?? []))],
    [said.textures],
  );

  useEffect(() => {
    if (!textureNoteIds.length) return;
    void supabase
      .from("notes")
      .select("id, title")
      .in("id", textureNoteIds)
      .then(({ data }) =>
        setTitles(new Map((data ?? []).map((n) => [n.id, n.title ?? "Untitled note"]))),
      );
  }, [textureNoteIds]);

  const line = said.observation || greeting;
  const pills: ThemePill[] = said.textures.map((t) => ({
    label: t.title,
    detail: t.detail,
    noteIds: t.note_ids,
  }));

  if (!line && !pills.length) return null;

  return (
    <div className="mb-10 animate-fade-up">
      {line && (
        <p className="max-w-[46ch] font-editorial text-[1.05rem] leading-[1.65] text-muted-foreground">
          {line}
        </p>
      )}

      {pills.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-2.5 text-[0.68rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            How this week sounds
          </h2>
          <ThemePills items={pills} titleById={titles} />
        </div>
      )}
    </div>
  );
}
