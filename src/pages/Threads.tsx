import { Loader2, RefreshCw } from "lucide-react";
import { ThreadCard } from "@/components/ThreadCard";
import { useThreads } from "@/hooks/useThreads";

const Threads = () => {
  const { threads, noticing, working, notice, dismiss, promote } = useThreads();

  return (
    <div>
      <header className="mb-8">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Threads</h1>
        <div className="mt-1.5 flex items-center gap-3 text-[0.9rem] text-muted-foreground">
          <span>What keeps coming up across your notes</span>
          {!noticing && (
            <>
              <span className="text-muted-foreground/40">·</span>
              <button
                onClick={() => notice(true)}
                className="flex items-center gap-1.5 text-[0.85rem] text-muted-foreground/80 transition-colors hover:text-foreground"
              >
                <RefreshCw className="w-3 h-3" strokeWidth={1.5} />
                Look again
              </button>
            </>
          )}
        </div>
      </header>

      {noticing ? (
        <p className="flex items-center gap-2 text-[0.9rem] text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Reading back over your notes…
        </p>
      ) : threads === null ? (
        <p className="text-[0.9rem] text-muted-foreground">Opening…</p>
      ) : threads.length === 0 ? (
        <p className="max-w-[38ch] text-[0.95rem] leading-relaxed text-muted-foreground">
          Threads appear once a few thoughts start rhyming. Keep talking.
        </p>
      ) : (
        <div className="flex flex-col gap-14">
          {threads.map((thread) => (
            <ThreadCard
              key={thread.id}
              thread={thread}
              working={working}
              onDismiss={() => dismiss(thread)}
              onPromoted={promote}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default Threads;
