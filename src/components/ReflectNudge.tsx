import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { weekStartUTC } from "@/hooks/useLookBack";

/**
 * A single quiet line on the feed, once anren has actually read the week back.
 * Read-only — it never triggers a generation.
 */
export function ReflectNudge() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const weekStart = weekStartUTC();
  const dismissKey = `anren:reflect-nudge:${weekStart}`;

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(dismissKey)) return;
    let cancelled = false;

    supabase
      .from("weekly_digests")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .is("project_id", null)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setShow(!!data);
      });

    return () => {
      cancelled = true;
    };
  }, [user, weekStart, dismissKey]);

  if (!show) return null;

  const dismiss = () => {
    localStorage.setItem(dismissKey, "1");
    setShow(false);
  };

  return (
    <div className="mb-6 flex items-center justify-between gap-3 border-b border-hairline pb-3">
      <p className="text-[0.88rem] text-muted-foreground">
        anren has read your week back —{" "}
        <Link to="/reflect" className="italic underline underline-offset-4 hover:text-foreground">
          see Reflect
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
