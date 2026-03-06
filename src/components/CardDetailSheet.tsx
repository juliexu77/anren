import { useState, useRef } from "react";
import type { BrainCard } from "@/types/card";
import { Trash2, ChevronLeft, Calendar, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGoogleCalendar } from "@/hooks/useGoogleCalendar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Props {
  card: BrainCard | null;
  open: boolean;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Pick<BrainCard, "title" | "summary" | "body">>) => void;
  onDelete: (id: string) => void;
  suggestion?: string;
}

const APP_URL = "https://anren.app";

export function CardDetailSheet({ card, open, onClose, onUpdate, onDelete, suggestion }: Props) {
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createEvent } = useGoogleCalendar();

  const [showEventSheet, setShowEventSheet] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [creating, setCreating] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventStartTime, setEventStartTime] = useState("09:00");
  const [eventEndTime, setEventEndTime] = useState("10:00");

  const currentCardId = card?.id;
  const [lastId, setLastId] = useState<string | null>(null);
  if (currentCardId && currentCardId !== lastId) {
    setLastId(currentCardId);
    setBody(card!.body);
    setIsEditing(false);
  }

  if (!card || !open) return null;

  const handleTapToEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onUpdate(card.id, { body });
    setIsEditing(false);
    onClose();
  };

  const handleClose = () => {
    if (body !== card.body) {
      onUpdate(card.id, { body });
    }
    onClose();
  };

  const handleCreateEvent = async () => {
    setExtracting(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-event-details", {
        body: { title: card.title, body: body || card.body },
      });

      if (error || !data || data.error) {
        setEventTitle(card.title || "New Event");
        setEventDesc("");
        setEventDate(new Date().toISOString().split("T")[0]);
        setEventStartTime("09:00");
        setEventEndTime("10:00");
      } else {
        setEventTitle(data.summary || card.title || "New Event");
        setEventDesc(data.description || "");
        setEventDate(data.date || new Date().toISOString().split("T")[0]);
        setEventStartTime(data.startTime || "09:00");
        setEventEndTime(data.endTime || "10:00");
      }
      setShowEventSheet(true);
    } catch {
      setEventTitle(card.title || "New Event");
      setEventDesc("");
      setEventDate(new Date().toISOString().split("T")[0]);
      setEventStartTime("09:00");
      setEventEndTime("10:00");
      setShowEventSheet(true);
    } finally {
      setExtracting(false);
    }
  };

  const handleConfirmCreate = async () => {
    if (!eventTitle.trim()) return;
    setCreating(true);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const noteLink = `${APP_URL}/card/${card.id}`;
      const fullDesc = [eventDesc, `\n📝 Note: ${noteLink}`].filter(Boolean).join("\n");

      await createEvent({
        summary: eventTitle,
        description: fullDesc,
        start: { dateTime: `${eventDate}T${eventStartTime}:00`, timeZone: tz },
        end: { dateTime: `${eventDate}T${eventEndTime}:00`, timeZone: tz },
      });
      setShowEventSheet(false);
    } finally {
      setCreating(false);
    }
  };

  const typeLabel = card.type === "task" ? "Task" : card.type === "ongoing" ? "Ongoing" : card.type === "event" ? "Event" : "";

  return (
    <>
      <div className="fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-right duration-200 bg-bg-color">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleClose} className="flex items-center gap-1 text-text-primary/70 active:text-text-primary">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          {typeLabel && (
            <span className="text-xs text-text-muted-color/60 font-medium uppercase tracking-wider">
              {typeLabel}
            </span>
          )}
          <button
            onClick={() => { onDelete(card.id); onClose(); }}
            className="text-text-muted-color/70 active:text-text-muted-color p-1"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        {/* Title */}
        {card.title && (
          <div className="px-5 pt-2">
            <h2 className="text-h3 text-text-primary">{card.title}</h2>
          </div>
        )}

        {/* Attached image */}
        {card.imageUrl && (
          <div className="px-5 pt-2">
            <img
              src={card.imageUrl}
              alt="Attachment"
              className="w-full rounded-xl border border-border/30 max-h-72 object-contain bg-black/5"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 px-5 pt-4 pb-8 overflow-y-auto" onClick={!isEditing ? handleTapToEdit : undefined}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full h-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-text-primary/90 placeholder:text-text-muted-color/40"
              placeholder="Tap to write…"
            />
          ) : (
            <p className="text-base leading-relaxed text-text-primary/90 whitespace-pre-wrap">
              {body || <span className="text-text-muted-color/40 italic">Tap to write…</span>}
            </p>
          )}
        </div>

        {/* AI Suggestion */}
        {suggestion && (
          <div className="mx-5 mb-3 sanctuary-card px-4 py-3">
            <p className="text-xs font-medium mb-1 text-text-muted-color">
              ✦ Thinking partner
            </p>
            <p className="text-sm leading-relaxed text-text-secondary-color">
              {suggestion}
            </p>
          </div>
        )}

        {/* Bottom actions */}
        <div className="px-5 pb-6 pt-2 space-y-2">
          {isEditing && (
            <Button className="w-full" onClick={handleSave}>Save</Button>
          )}
          <button
            onClick={handleCreateEvent}
            disabled={extracting}
            className="sanctuary-btn w-full flex items-center justify-center gap-2 py-3 text-sm text-text-primary/70"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
            Add to Calendar
          </button>
        </div>
      </div>

      {/* Create Event Sheet */}
      <Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl z-[60]">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Create Calendar Event</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <Input placeholder="Event title" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} autoFocus />
            <Textarea placeholder="Description" value={eventDesc} onChange={(e) => setEventDesc(e.target.value)} className="resize-none" rows={2} />
            <div>
              <label className="text-xs text-text-muted-color mb-1 block">Date</label>
              <Input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-text-muted-color mb-1 block">Start</label>
                <Input type="time" value={eventStartTime} onChange={(e) => setEventStartTime(e.target.value)} />
              </div>
              <div className="flex-1">
                <label className="text-xs text-text-muted-color mb-1 block">End</label>
                <Input type="time" value={eventEndTime} onChange={(e) => setEventEndTime(e.target.value)} />
              </div>
            </div>
            <Button className="w-full" onClick={handleConfirmCreate} disabled={!eventTitle.trim() || creating}>
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Event
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
