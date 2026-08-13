import { NOTICE_LABELS, type NoticeStage } from "@/lib/noticing";
import { cn } from "@/lib/utils";

/**
 * The steps anren is actually taking, one line at a time, ending on where the
 * note landed. When there's nothing true to say about that, the last line
 * simply doesn't appear.
 */
export function NoticingBeat({
  stage,
  title,
  landing,
  className,
}: {
  stage: NoticeStage;
  title?: string | null;
  landing?: string | null;
  className?: string;
}) {
  const label = stage === "titling" && title ? `“${title}”` : NOTICE_LABELS[stage];

  return (
    <div className={cn("mx-auto max-w-[36ch] text-center", className)}>
      {stage !== "landed" && (
        <p
          key={stage}
          className="font-editorial text-[1.2rem] leading-[1.6] text-muted-foreground motion-safe:animate-fade-in"
        >
          {label}
        </p>
      )}
      {stage === "landed" && landing && (
        <p className="font-editorial text-[1.25rem] leading-[1.6] text-foreground motion-safe:animate-fade-in">
          {landing}
        </p>
      )}
    </div>
  );
}
