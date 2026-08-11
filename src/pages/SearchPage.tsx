import { useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Search as SearchIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SearchHit {
  note_id: string;
  title: string | null;
  synthesis: string | null;
  snippet: string | null;
  recorded_at: string;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setAnswer(null);
    const { data, error } = await supabase.functions.invoke("search-notes", {
      body: { query: query.trim() },
    });
    setLoading(false);
    if (error) {
      toast.error("Search didn't come back. Try again?");
      return;
    }
    const payload = data as { results?: SearchHit[]; answer?: string | null };
    setHits(payload.results ?? []);
    setAnswer(payload.answer ?? null);
  };

  return (
    <div>
      <header className="mb-7">
        <h1 className="font-editorial text-[1.9rem] leading-tight tracking-[-0.01em]">Search</h1>
        <p className="mt-1.5 text-[0.9rem] leading-relaxed text-muted-foreground">
          Exact words or a whole thought — ask it however it comes out.
        </p>
      </header>

      <div className="flex items-center gap-2">
        <div className="flex flex-1 items-center gap-2.5 rounded-full border border-hairline bg-paper px-4 py-3 focus-within:border-primary/40">
          <SearchIcon className="w-4 h-4 shrink-0 text-muted-foreground/70" strokeWidth={1.5} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="What have I said about wanting community?"
            className="flex-1 bg-transparent text-[0.94rem] outline-none placeholder:text-muted-foreground/55"
          />
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/70" />}
        </div>
      </div>

      {answer && (
        <div className="mt-7 rounded-[20px] border border-hairline bg-paper/70 px-6 py-6">
          <p className="whitespace-pre-line font-editorial text-[1.02rem] leading-[1.7]">{answer}</p>
        </div>
      )}

      {hits && (
        <div className="mt-8">
          {!hits.length ? (
            <p className="text-[0.9rem] text-muted-foreground">Nothing matched that yet.</p>
          ) : (
            <div className="flex flex-col">
              {hits.map((hit) => (
                <Link
                  key={hit.note_id}
                  to={`/note/${hit.note_id}`}
                  className="block py-5 border-b border-hairline last:border-b-0"
                >
                  <h3 className="note-title">{hit.title ?? "Untitled note"}</h3>
                  <p className="mt-2 text-[0.92rem] leading-[1.65] text-muted-foreground line-clamp-3">
                    {hit.snippet ?? hit.synthesis}
                  </p>
                  <p className="mt-2 text-[0.72rem] uppercase tracking-[0.13em] text-muted-foreground/60">
                    {new Date(hit.recorded_at).toLocaleDateString([], {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchPage;
