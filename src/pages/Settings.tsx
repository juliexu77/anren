import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { useAiAccess } from "@/hooks/useAiAccess";
import { clearLocalCache } from "@/lib/localCache";
import { Trash2 } from "lucide-react";

const Settings = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projects, deleteProject } = useProjects();
  const { connected: aiConnected } = useAiAccess();
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [clearing, setClearing] = useState(false);


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
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">Folders</h2>
        {!projects.length ? (
          <p className="text-[0.9rem] text-muted-foreground">No folders yet.</p>
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
              Deleting a folder keeps its notes — they simply return to the main list.
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

      <section className="mb-10">
        <h2 className="mb-3 text-[0.7rem] uppercase tracking-[0.18em] text-muted-foreground/70">
          This device
        </h2>
        <button
          onClick={async () => {
            if (clearing) return;
            setClearing(true);
            const { flags, recordings } = await clearLocalCache();
            setClearing(false);
            toast(
              recordings
                ? `Cleared ${flags + recordings} local item${flags + recordings === 1 ? "" : "s"}.`
                : "Nothing left on this device.",
            );
          }}
          className="py-3 text-[0.94rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          {clearing ? "Clearing…" : "Clear local cache"}
        </button>
        <p className="mt-1 text-[0.82rem] leading-relaxed text-muted-foreground/80">
          Forgets this session's look-back flags and any leftover recording slices. Your notes stay
          where they are.
        </p>
      </section>

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
