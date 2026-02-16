import { useState, useRef } from "react";
import type { BrainCard, CardCategory } from "@/types/card";
import { CATEGORY_CONFIG } from "@/types/card";
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
  onUpdate: (id: string, updates: Partial<Pick<BrainCard, "title" | "summary" | "body" | "category">>) => void;
  onDelete: (id: string) => void;
}

const APP_URL = "https://anren.app";

export function CardDetailSheet({ card, open, onClose, onUpdate, onDelete }: Props) {
  const [body, setBody] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { createEvent } = useGoogleCalendar();

  // Event creation state
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

  const cat = CATEGORY_CONFIG[card.category];
  const Icon = cat.icon;

  const handleTapToEdit = () => {
    setIsEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSave = () => {
    onUpdate(card.id, { body });
    setIsEditing(false);
  };

  const handleClose = () => {
    const bodyChanged = body !== card.body;
    if (bodyChanged) {
      onUpdate(card.id, { body });
    }

    const needsClassification =
      card.source === "text" &&
      card.category === "uncategorized" &&
      (body.trim() || card.title.trim());

    if (needsClassification || (bodyChanged && card.source === "text")) {
      const noteBody = body || card.body;
      const noteTitle = card.title;
      supabase.functions
        .invoke("classify-note", { body: { title: noteTitle, body: noteBody } })
        .then(({ data, error }) => {
          if (error || !data || data.error) {
            console.error("Classify error:", error || data?.error);
            return;
          }
          const updates: Partial<Pick<BrainCard, "title" | "summary" | "category">> = {};
          if (data.category) updates.category = data.category;
          if (data.summary) updates.summary = data.summary;
          if (!noteTitle && data.title) updates.title = data.title;
          if (Object.keys(updates).length > 0) {
            onUpdate(card.id, updates);
            toast.success("Note categorized!");
          }
        });
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
        console.error("Extract error:", error || data?.error);
        // Fallback: use card title and today's date
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
    } catch (e) {
      console.error("Extract event error:", e);
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

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex flex-col animate-in fade-in slide-in-from-right duration-200"
        style={{ background: 'hsl(var(--bg))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <button onClick={handleClose} className="flex items-center gap-1 text-foreground/70 active:text-foreground">
            <ChevronLeft className="w-5 h-5" />
            <span className="text-sm">Back</span>
          </button>
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5 text-muted-foreground/60" />
            <span className="text-xs text-muted-foreground/60 font-medium uppercase tracking-wider">
              {cat.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateEvent}
              disabled={extracting}
              className="text-foreground/70 active:text-foreground p-1"
            >
              {extracting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Calendar className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={() => { onDelete(card.id); onClose(); }}
              className="text-destructive/70 active:text-destructive p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

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
              className="w-full h-full bg-transparent border-none outline-none resize-none text-base leading-relaxed text-foreground/90 placeholder:text-muted-foreground/40"
              placeholder="Tap to write…"
            />
          ) : (
            <p className="text-base leading-relaxed text-foreground/90 whitespace-pre-wrap">
              {body || <span className="text-muted-foreground/40 italic">Tap to write…</span>}
            </p>
          )}
        </div>

        {/* Save button */}
        {isEditing && (
          <div className="px-5 pb-6 pt-2">
            <Button className="w-full" onClick={handleSave}>
              Save
            </Button>
          </div>
        )}
      </div>

      {/* Create Event Sheet */}
      <Sheet open={showEventSheet} onOpenChange={setShowEventSheet}>
        <SheetContent side="bottom" className="rounded-t-3xl z-[60]">
          <SheetHeader>
            <SheetTitle className="font-display text-lg">Create Calendar Event</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Event title"
              value={eventTitle}
              onChange={(e) => setEventTitle(e.target.value)}
              autoFocus
            />
            <Textarea
              placeholder="Description"
              value={eventDesc}
              onChange={(e) => setEventDesc(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Date</label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Start</label>
                <Input
                  type="time"
                  value={eventStartTime}
                  onChange={(e) => setEventStartTime(e.target.value)}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">End</label>
                <Input
                  type="time"
                  value={eventEndTime}
                  onChange={(e) => setEventEndTime(e.target.value)}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              A link back to this note will be included in the event description.
            </p>
            <Button
              className="w-full"
              onClick={handleConfirmCreate}
              disabled={!eventTitle.trim() || creating}
            >
              {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Create Event
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
