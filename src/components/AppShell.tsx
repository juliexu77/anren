import { useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { ProjectRail } from "@/components/ProjectRail";
import { CaptureBar } from "@/components/CaptureBar";

export function AppShell({ children }: { children: ReactNode }) {
  const [railOpen, setRailOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen w-full">
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-14 bg-background/85 backdrop-blur-xl border-b border-hairline">
        <button
          onClick={() => setRailOpen(true)}
          aria-label="Open menu"
          className="p-2 -ml-2 text-muted-foreground"
        >
          <Menu className="w-5 h-5" strokeWidth={1.5} />
        </button>
        <Link to="/" className="font-editorial text-lg tracking-[0.02em] lowercase">
          anren
        </Link>
        <div className="w-9" />
      </div>

      <div className="flex">
        {/* Desktop rail */}
        <aside className="hidden md:flex flex-col w-[248px] shrink-0 h-screen sticky top-0 border-r border-hairline bg-paper/50">
          <ProjectRail />
        </aside>

        {/* Mobile rail overlay */}
        {railOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
              onClick={() => setRailOpen(false)}
            />
            <aside className="relative w-[80%] max-w-[300px] h-full bg-paper border-r border-hairline animate-fade-up">
              <button
                onClick={() => setRailOpen(false)}
                aria-label="Close menu"
                className="absolute top-4 right-4 p-1 text-muted-foreground"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
              <ProjectRail onNavigate={() => setRailOpen(false)} />
            </aside>
          </div>
        )}

        <main className="flex-1 min-w-0">
          <div key={location.pathname} className="mx-auto w-full max-w-[720px] px-5 md:px-10 pt-6 animate-fade-up"
            style={{ paddingBottom: "calc(var(--capture-bar-h, 10rem) + 2rem)" }}
          >
            {children}
          </div>
        </main>
      </div>

      <CaptureBar />
    </div>
  );
}
