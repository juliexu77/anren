import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAiAccess } from "@/hooks/useAiAccess";
import { toast } from "sonner";

const ClaudeKey = () => {
  const { connected, refresh } = useAiAccess();
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!key.trim() || busy) return;
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("manage-ai-key", {
      body: { action: "save", key: key.trim() },
    });
    setBusy(false);

    const message = (data as { error?: string } | null)?.error;
    if (error || message) {
      toast(message ?? "That key couldn't be saved.");
      return;
    }
    setKey("");
    await refresh();
    toast("Connected. anren will write up your notes with your own key from here on.");
  };

  const remove = async () => {
    setBusy(true);
    await supabase.functions.invoke("manage-ai-key", { body: { action: "remove" } });
    setBusy(false);
    await refresh();
    toast("Key removed.");
  };

  return (
    <div className="max-w-xl">
      <Link
        to="/settings"
        className="mb-8 inline-flex items-center gap-2 text-[0.85rem] text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
        Settings
      </Link>

      <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">
        Connect Claude
      </h1>

      <p className="mt-4 text-[0.95rem] leading-[1.7] text-muted-foreground">
        Recording, transcribing and keeping your notes is always free. The write-ups —
        the summaries, the reflections, the look back — are written by Claude, and past a
        point those run on your own key rather than anren's.
      </p>

      {connected ? (
        <div className="mt-8 border-t border-hairline pt-6">
          <p className="text-[0.95rem]">Claude — connected</p>
          <p className="mt-1 text-[0.85rem] leading-relaxed text-muted-foreground">
            Your key is stored encrypted and never shown again, here or anywhere else.
          </p>
          <button
            onClick={remove}
            disabled={busy}
            className="mt-5 rounded-full border border-hairline bg-paper px-5 py-2.5 text-[0.88rem] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            Remove key
          </button>
        </div>
      ) : (
        <div className="mt-8 border-t border-hairline pt-6">
          <ol className="flex flex-col gap-4 text-[0.92rem] leading-[1.7] text-muted-foreground">
            <li>
              1. Open{" "}
              <a
                href="https://console.anthropic.com/settings/keys"
                target="_blank"
                rel="noreferrer"
                className="text-foreground underline decoration-hairline underline-offset-4"
              >
                console.anthropic.com
              </a>{" "}
              and sign in.
            </li>
            <li>2. Add a few dollars of credit under Billing — that tends to last months at this kind of use.</li>
            <li>3. Under API keys, create a key and copy it. It begins with <span className="font-mono text-[0.85rem]">sk-ant-</span>.</li>
            <li>4. Paste it below.</li>
          </ol>

          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-ant-..."
            spellCheck={false}
            autoComplete="off"
            className="mt-6 w-full rounded-xl border border-hairline bg-paper px-4 py-3 font-mono text-[0.85rem] outline-none focus:border-accent/50"
          />

          <button
            onClick={save}
            disabled={busy || !key.trim()}
            className="mt-4 rounded-full bg-foreground px-5 py-2.5 text-[0.88rem] text-paper transition-opacity disabled:opacity-40"
          >
            {busy ? "Checking…" : "Connect"}
          </button>

          <p className="mt-4 text-[0.82rem] leading-relaxed text-muted-foreground/80">
            The key is encrypted before it's stored, used only for your own notes, and
            never shown back to you. You can remove it at any time.
          </p>
        </div>
      )}
    </div>
  );
};

export default ClaudeKey;
