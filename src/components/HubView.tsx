import { usePeople } from "@/hooks/usePeople";
import { useCards } from "@/hooks/useCards";

interface Props {
  onNavigate: (view: "notes" | "people") => void;
  cardCount: number;
  firstPendingTitle: string;
  peopleNames: string[];
}

export function HubView({ onNavigate, cardCount, firstPendingTitle, peopleNames }: Props) {
  return (
    <div className="px-4 pt-6">
      <div className="space-y-3">
        {/* Home card */}
        <button
          onClick={() => onNavigate("notes")}
          className="w-full text-left rounded-lg px-5 pt-5 pb-5 transition-all duration-200 active:scale-[0.99]"
          style={{
            height: "180px",
            background: "hsl(var(--card-bg))",
            border: "1px solid hsl(var(--divider) / 0.12)",
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: "24px",
              lineHeight: "28px",
              fontWeight: 400,
              color: "hsl(var(--text))",
            }}
          >
            Home
          </h2>
          <p
            className="mt-2"
            style={{
              fontSize: "13px",
              lineHeight: "18px",
              fontWeight: 400,
              color: "hsl(var(--text) / 0.5)",
            }}
          >
            Tend your home
          </p>
        </button>

        {/* People card */}
        <button
          onClick={() => onNavigate("people")}
          className="w-full text-left rounded-lg px-5 pt-5 pb-5 transition-all duration-200 active:scale-[0.99]"
          style={{
            height: "180px",
            background: "hsl(var(--card-bg))",
            border: "1px solid hsl(var(--divider) / 0.12)",
          }}
        >
          <h2
            className="font-display"
            style={{
              fontSize: "24px",
              lineHeight: "28px",
              fontWeight: 400,
              color: "hsl(var(--text))",
            }}
          >
            People
          </h2>
          <p
            className="mt-2"
            style={{
              fontSize: "13px",
              lineHeight: "18px",
              fontWeight: 400,
              color: "hsl(var(--text) / 0.5)",
            }}
          >
            Tend your relationships
          </p>
        </button>
      </div>
    </div>
  );
}
