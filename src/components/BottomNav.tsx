import { Brain, Calendar, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type TabId = "brain" | "calendar";

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  onFabClick: () => void;
}

export function BottomNav({ activeTab, onTabChange, onFabClick }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative flex items-end justify-around px-6 pb-6 pt-3 bg-card/80 backdrop-blur-xl border-t border-border">
        {/* Brain Dump tab */}
        <button
          onClick={() => onTabChange("brain")}
          className={cn(
            "flex flex-col items-center gap-1 transition-colors",
            activeTab === "brain" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Brain className="w-5 h-5" />
          <span className="text-xs font-medium">Brain Dump</span>
        </button>

        {/* FAB */}
        <button
          onClick={onFabClick}
          className="fab-button -mt-6 active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" />
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
      </div>
    </nav>
  );
}
