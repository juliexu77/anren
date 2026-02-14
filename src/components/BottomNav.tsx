import { Brain, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "notes" | "calendar" | "settings";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div
        className="relative flex items-center justify-around px-8 pb-5 pt-2"
        style={{
          background: 'hsl(var(--bg) / 0.92)',
          backdropFilter: 'blur(12px)',
          borderTop: '1px solid hsl(var(--divider) / 0.5)',
        }}
      >
        <button
          onClick={() => onTabChange("notes")}
          className={cn(
            "flex flex-col items-center gap-0.5 transition-colors",
            activeTab === "notes" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Brain className="w-4 h-4" />
          <span className="text-[10px] font-medium">Notes</span>
        </button>

        <button
          onClick={() => onTabChange("calendar")}
          className={cn(
            "flex flex-col items-center gap-0.5 transition-colors",
            activeTab === "calendar" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Calendar className="w-4 h-4" />
          <span className="text-[10px] font-medium">Calendar</span>
        </button>

        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "flex flex-col items-center gap-0.5 transition-colors",
            activeTab === "settings" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </nav>
  );
}
