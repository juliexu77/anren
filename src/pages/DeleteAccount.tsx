import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function DeleteAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirm, setConfirm] = useState("");
  const [working, setWorking] = useState(false);

  const canDelete = confirm.trim().toLowerCase() === "delete";

  const run = async () => {
    if (!canDelete || working) return;
    setWorking(true);
    const { error } = await supabase.functions.invoke("delete-account");
    if (error) {
      setWorking(false);
      toast.error("That didn't go through. Try again in a moment?");
      return;
    }
    await supabase.auth.signOut();
    toast.success("Your account and everything in it is gone.");
    navigate("/auth", { replace: true });
  };

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/settings"
          className="inline-flex items-center gap-1.5 text-[0.82rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} /> Back
        </Link>

        <h1 className="mt-6 font-editorial text-[2rem] leading-tight tracking-[-0.01em]">Delete your account</h1>

        <div className="mt-5 space-y-4 text-[0.94rem] leading-relaxed text-muted-foreground">
          <p>
            This removes everything held for {user?.email ?? "your account"}: every recording, transcript, write-up,
            folder and reflection, along with your sign-in record.
          </p>
          <p>It cannot be undone, and nothing can be restored afterwards.</p>
        </div>

        <label className="mt-8 block text-[0.82rem] uppercase tracking-[0.16em] text-muted-foreground/70">
          Type delete to confirm
        </label>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="mt-2 w-full rounded-2xl border border-hairline bg-paper px-4 py-3 text-[0.94rem] outline-none focus:border-foreground/25"
          placeholder="delete"
        />

        <button
          onClick={run}
          disabled={!canDelete || working}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-3.5 text-[0.92rem] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {working && <Loader2 className="w-4 h-4 animate-spin" />}
          Delete my account permanently
        </button>

        <Link
          to="/settings"
          className="mt-3 block w-full rounded-full border border-hairline bg-paper px-5 py-3 text-center text-[0.88rem] text-muted-foreground hover:text-foreground transition-colors"
        >
          Keep my account
        </Link>
      </div>
    </main>
  );
}
