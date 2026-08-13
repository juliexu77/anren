import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useAiAccess } from "@/hooks/useAiAccess";
import { Loader2, Trash2 } from "lucide-react";
import { notesChanged } from "@/lib/noteEvents";
import { replayOnboarding } from "@/hooks/useOnboarding";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, deleteProject } = useProjects();
  const { connected: aiConnected } = useAiAccess();
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [redoing, setRedoing] = useState<{ done: number; total: number } | null>(null);
  const [redoneMessage, setRedoneMessage] = useState<string | null>(null);

  /**
   * Write-ups change shape as anren learns how to read you back. This walks the
   * archive one note at a time and writes each one up again from the words you
   * already said — nothing you wrote or recorded is touched.
   */
  const rewriteAll = async () => {
    if (!user || redoing) return;
    setRedoneMessage(null);
    const { data: notes } = await supabase
      .from("notes")
      .select("id")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("recorded_at", { ascending: false });

    const ids = (notes ?? []).map((n) => n.id);
    if (!ids.length) {
      setRedoneMessage("Nothing to write up yet.");
      return;
    }

    setRedoing({ done: 0, total: ids.length });
    let failed = 0;
    for (let i = 0; i < ids.length; i++) {
      const { error } = await supabase.functions.invoke("process-note", {
        body: { noteId: ids[i], regenerate: true },
      });
      if (error) failed++;
      setRedoing({ done: i + 1, total: ids.length });
      notesChanged();
    }
    setRedoing(null);
    setRedoneMessage(
      failed
        ? `${ids.length - failed} of ${ids.length} written up again — ${failed} didn't come through.`
        : `All ${ids.length} note${ids.length === 1 ? "" : "s"} written up again.`,
    );
  };

  useEffect(() => {
    if (!user) return;
    supabase
      .from("notes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .then(({ count }) => setNoteCount(count ?? 0));
  }, [user]);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Settings</h1>
      </header>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Account</h2>
        <p className="text-[0.94rem]">{user?.email}</p>
        <p className="mt-1 text-[0.88rem] text-muted-foreground">
          {noteCount === null ? "—" : `${noteCount} note${noteCount === 1 ? "" : "s"} kept`}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Projects</h2>
        {!projects.length ? (
          <p className="text-[0.9rem] text-muted-foreground">No projects yet.</p>
        ) : (
          <div className="flex flex-col">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 border-b border-hairline last:border-b-0">
                <span className="text-[0.94rem]">{p.name}</span>
                <button
                  onClick={() => deleteProject(p.id)}
                  aria-label={`Delete ${p.name}`}
                  className="p-1.5 text-muted-foreground/70 hover:text-foreground transition-colors"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            ))}
            <p className="mt-3 text-[0.82rem] leading-relaxed text-muted-foreground/80">
              Deleting a project keeps its notes — they stay in the main list, as they always were.
            </p>
          </div>
        )}
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Intelligence</h2>
        <Link
          to="/settings/claude"
          className="flex items-center justify-between py-3 text-[0.94rem] border-b border-hairline transition-colors hover:text-foreground"
        >
          <span>Claude</span>
          <span className="text-[0.85rem] text-muted-foreground">
            {aiConnected === null ? "" : aiConnected ? "connected" : "not connected"}
          </span>
        </Link>
        <p className="mt-3 text-[0.82rem] leading-relaxed text-muted-foreground/80">
          Recording and transcribing are always free. The write-ups are written by Claude.
        </p>

        <button
          onClick={rewriteAll}
          disabled={!!redoing}
          className="mt-4 flex items-center gap-2 rounded-full border border-hairline bg-paper px-5 py-2.5 text-[0.88rem] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
        >
          {redoing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {redoing ? `Writing up again — ${redoing.done} of ${redoing.total}` : "Write up every note again"}
        </button>
        <p className="mt-2 text-[0.82rem] leading-relaxed text-muted-foreground/80">
          {redoneMessage ??
            "Rewrites the titles and write-ups across your whole archive from the words you already said. Your own words stay exactly as they are."}
        </p>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">About</h2>
        <div className="flex flex-col">
          {[
            { to: "/privacy", label: "Privacy Policy" },
            { to: "/terms", label: "Terms of Service" },
            { to: "/support", label: "Support" },
            { to: "/delete-account", label: "Delete account" },
          ].map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="py-3 text-[0.94rem] text-muted-foreground hover:text-foreground border-b border-hairline last:border-b-0 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <button
        onClick={() => {
          navigate("/");
          replayOnboarding();
        }}
        className="mb-4 block rounded-full border border-hairline bg-paper px-5 py-2.5 text-[0.88rem] text-muted-foreground hover:text-foreground transition-colors"
      >
        Show me around again
      </button>

      <button
        onClick={signOut}
        className="rounded-full border border-hairline bg-paper px-5 py-2.5 text-[0.88rem] text-muted-foreground hover:text-foreground transition-colors"
      >
        Sign out
      </button>

    </div>
  );
};

export default Settings;
