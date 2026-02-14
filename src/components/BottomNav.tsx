import { Brain, Calendar, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "notes" | "calendar" | "settings";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <nav className="fixed bottom-4 left-0 right-0 z-50 flex justify-center">
      <div
        className="flex items-center justify-center gap-8 px-8 py-2.5 rounded-full"
        style={{
          background: 'hsl(var(--bg) / 0.45)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          border: '1px solid hsl(var(--divider) / 0.3)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
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
