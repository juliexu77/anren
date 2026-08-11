import { cn } from "@/lib/utils";

/**
 * Hand-drawn ink marks for folders. Single-stroke line drawings, no fills.
 * Stored on a folder as `glyph:<key>`; anything else is treated as a literal emoji.
 */
export const FOLDER_GLYPHS: Record<string, { label: string; path: React.ReactNode }> = {
  circle: {
    label: "Stone circle",
    path: <circle cx="12" cy="12" r="7" />,
  },
  kite: {
    label: "Kite",
    path: (
      <>
        <path d="M12 3 4 11l8 8 8-8-8-8Z" />
        <path d="M12 19c0 2-1.5 2.5-3 2" />
      </>
    ),
  },
  moth: {
    label: "Moth",
    path: (
      <>
        <path d="M12 6v11" />
        <path d="M12 8c-2-3-7-3-8 1s3 7 8 4" />
        <path d="M12 8c2-3 7-3 8 1s-3 7-8 4" />
        <path d="M11 5 9.5 3M13 5 14.5 3" />
      </>
    ),
  },
  teapot: {
    label: "Pot of tea",
    path: (
      <>
        <path d="M5 11h11a3 3 0 0 1 0 6H8a3 3 0 0 1-3-3v-3Z" />
        <path d="M16 12c2 0 3 1 3 2.5" />
        <path d="M9 11V9M9 9c0-1 1-1.5 2-1.5" />
      </>
    ),
  },
  plane: {
    label: "Paper plane",
    path: (
      <>
        <path d="M20 5 4 12l6 2 2 6 8-15Z" />
        <path d="M20 5l-10 9" />
      </>
    ),
  },
  knot: {
    label: "Knot",
    path: (
      <>
        <path d="M8 8c4 0 4 8 8 8" />
        <path d="M16 8c-4 0-4 8-8 8" />
      </>
    ),
  },
  doorway: {
    label: "Doorway",
    path: (
      <>
        <path d="M7 20V7a5 5 0 0 1 10 0v13" />
        <circle cx="14" cy="13" r="0.6" />
      </>
    ),
  },
  sprout: {
    label: "Sprout",
    path: (
      <>
        <path d="M12 20v-8" />
        <path d="M12 12C9 12 7 10 7 7c3 0 5 2 5 5Z" />
        <path d="M12 13c3 0 5-2 5-5-3 0-5 2-5 5Z" />
      </>
    ),
  },
  bell: {
    label: "Bell",
    path: (
      <>
        <path d="M7 16c1-1 1-3 1-5a4 4 0 0 1 8 0c0 2 0 4 1 5H7Z" />
        <path d="M10.5 19a1.6 1.6 0 0 0 3 0" />
      </>
    ),
  },
  spool: {
    label: "Spool",
    path: (
      <>
        <path d="M7 5h10M7 19h10" />
        <path d="M9 5v14M15 5v14" />
        <path d="M9 10h6M9 13h6" />
      </>
    ),
  },
  moon: {
    label: "Moon",
    path: <path d="M15 4a8 8 0 1 0 5 7 6 6 0 0 1-5-7Z" />,
  },
  ladder: {
    label: "Ladder",
    path: (
      <>
        <path d="M8 4v16M16 4v16" />
        <path d="M8 8h8M8 12h8M8 16h8" />
      </>
    ),
  },
  wave: {
    label: "Wave",
    path: (
      <>
        <path d="M3 14c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
        <path d="M3 18c2-3 4-3 6 0s4 3 6 0 4-3 6 0" />
      </>
    ),
  },
  eye: {
    label: "Eye",
    path: (
      <>
        <path d="M3 12s3.5-5 9-5 9 5 9 5-3.5 5-9 5-9-5-9-5Z" />
        <circle cx="12" cy="12" r="1.6" />
      </>
    ),
  },
  key: {
    label: "Key",
    path: (
      <>
        <circle cx="8" cy="9" r="4" />
        <path d="M11 12l8 8" />
        <path d="M16 15l-2 2M18.5 17.5l-2 2" />
      </>
    ),
  },
  match: {
    label: "Match",
    path: (
      <>
        <path d="M12 21V10" />
        <path d="M12 10c-2-2-1-5 0-7 1 2 2 5 0 7Z" />
      </>
    ),
  },
  shell: {
    label: "Shell",
    path: (
      <>
        <path d="M12 20C7 20 4 15 4 11a8 8 0 0 1 16 0c0 4-3 9-8 9Z" />
        <path d="M12 20V4M8 19c1-4 1-9 0-13M16 19c-1-4-1-9 0-13" />
      </>
    ),
  },
  feather: {
    label: "Feather",
    path: (
      <>
        <path d="M5 20 18 7a4 4 0 0 0-6-4c-3 2-6 8-7 13l-1 3" />
        <path d="M9 15h6" />
      </>
    ),
  },
  bowl: {
    label: "Bowl",
    path: (
      <>
        <path d="M4 11h16c0 4-3.5 7-8 7s-8-3-8-7Z" />
        <path d="M12 8c-1-1-1-2 0-3" />
      </>
    ),
  },
  lamp: {
    label: "Lamp",
    path: (
      <>
        <path d="M6 11 12 4l6 7H6Z" />
        <path d="M12 11v6" />
        <path d="M9 20h6" />
      </>
    ),
  },
  books: {
    label: "Stack of books",
    path: (
      <>
        <path d="M4 7h16M4 12h16M4 17h16" />
        <path d="M4 7v3M20 7v3M4 12v3M20 12v3M4 17v3M20 17v3" />
      </>
    ),
  },
  envelope: {
    label: "Envelope",
    path: (
      <>
        <path d="M4 7h16v10H4V7Z" />
        <path d="M4 7l8 6 8-6" />
      </>
    ),
  },
  clock: {
    label: "Clock face",
    path: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v4l3 2" />
      </>
    ),
  },
  compass: {
    label: "Compass",
    path: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M15 9l-2 4-4 2 2-4 4-2Z" />
      </>
    ),
  },
  fish: {
    label: "Fish",
    path: (
      <>
        <path d="M3 12c3-4 8-4 12 0-4 4-9 4-12 0Z" />
        <path d="M15 12c2-2 4-3 6-3-1 2-1 4 0 6-2 0-4-1-6-3Z" />
        <circle cx="7" cy="11.5" r="0.5" />
      </>
    ),
  },
  house: {
    label: "Small house",
    path: (
      <>
        <path d="M4 11 12 5l8 6v9H4v-9Z" />
        <path d="M10 20v-5h4v5" />
      </>
    ),
  },
  needle: {
    label: "Thread and needle",
    path: (
      <>
        <path d="M20 4 9 15" />
        <path d="M20 4l-1.5 3.5" />
        <path d="M9 15c-3 1-5 3-5 5 3 0 5-2 5-5Z" />
      </>
    ),
  },
  mountain: {
    label: "Mountain",
    path: (
      <>
        <path d="M3 18l6-9 4 5 2-2 6 6H3Z" />
        <path d="M9 9l-1.5 2.5" />
      </>
    ),
  },
  cup: {
    label: "Cup",
    path: (
      <>
        <path d="M6 8h10v6a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V8Z" />
        <path d="M16 9h2a2 2 0 0 1 0 4h-2" />
      </>
    ),
  },
};

export type FolderGlyphKey = keyof typeof FOLDER_GLYPHS;

export const FOLDER_GLYPH_KEYS = Object.keys(FOLDER_GLYPHS);

export const GLYPH_PREFIX = "glyph:";

export function isGlyphValue(value: string | null | undefined): boolean {
  return !!value && value.startsWith(GLYPH_PREFIX) && FOLDER_GLYPHS[value.slice(GLYPH_PREFIX.length)] !== undefined;
}

export function glyphKeyOf(value: string | null | undefined): string | null {
  if (!isGlyphValue(value)) return null;
  return value!.slice(GLYPH_PREFIX.length);
}

export function FolderGlyph({
  glyph,
  className,
  size = 17,
}: {
  glyph: string;
  className?: string;
  size?: number;
}) {
  const entry = FOLDER_GLYPHS[glyph] ?? FOLDER_GLYPHS.circle;
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {entry.path}
    </svg>
  );
}

/** Renders whatever is stored on a folder: a glyph, a literal emoji, or a neutral mark. */
export function FolderMark({
  value,
  size = 17,
  className,
}: {
  value: string | null;
  size?: number;
  className?: string;
}) {
  const key = glyphKeyOf(value);
  if (key) return <FolderGlyph glyph={key} size={size} className={cn("text-primary/85", className)} />;
  if (value) {
    return (
      <span className={cn("leading-none", className)} style={{ fontSize: size * 0.9 }}>
        {value}
      </span>
    );
  }
  return <FolderGlyph glyph="circle" size={size} className={cn("text-primary/35", className)} />;
}
