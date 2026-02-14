import { Brain, Calendar, Plus, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "notes" | "calendar" | "settings";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative flex items-end justify-around px-6 pb-6 pt-3" style={{ background: 'var(--glass-backdrop)', backdropFilter: 'blur(16px)', borderTop: '1px solid var(--glass-border-subtle)' }}>
        {/* Notes tab */}
        <button
          onClick={() => onTabChange("notes")}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === "notes" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Brain className="w-5 h-5" />
          <span className="text-xs font-medium">Notes</span>
        </button>

        {/* Calendar tab */}
        <button
          onClick={() => onTabChange("calendar")}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === "calendar" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-xs font-medium">Calendar</span>
        </button>

        {/* Settings tab */}
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === "settings" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Settings className="w-5 h-5" />
          <span className="text-xs font-medium">Settings</span>
        </button>
      </div>
    </nav>
  );
}