import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface NeonTheme {
  id: string;
  name: string;
  description: string;
  baseHsl: string;
  accentHsl: string;
  secondaryHsl: string;
  bgPrimary: string;
  bgSecondary: string;
  glowPrimary: string;
  glowSecondary: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  isLight: boolean;
}

const WHITE_TEXT = {
  foreground: '0 0% 100%',
  foregroundSecondary: '0 0% 100%',
  foregroundMuted: '0 0% 100%',
};

export const NEON_THEMES: NeonTheme[] = [
  {
    id: 'rosewood-den',
    name: 'Rosewood Gate',
    description: 'Lacquered warmth',
    baseHsl: '15 45% 25%',
    accentHsl: '35 60% 50%',
    secondaryHsl: '10 40% 35%',
    bgPrimary: '15 45% 18%',
    bgSecondary: '10 35% 12%',
    glowPrimary: 'rgba(120, 70, 50, 0.25)',
    glowSecondary: 'rgba(180, 120, 60, 0.15)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-jade',
    name: 'Jade Mist',
    description: 'Soft waves',
    baseHsl: '160 45% 40%',
    accentHsl: '165 55% 50%',
    secondaryHsl: '140 40% 55%',
    bgPrimary: '160 45% 40%',
    bgSecondary: '140 35% 50%',
    glowPrimary: 'rgba(80, 160, 130, 0.3)',
    glowSecondary: 'rgba(100, 180, 140, 0.25)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-plum',
    name: 'Peony',
    description: 'Petal rings',
    baseHsl: '330 55% 45%',
    accentHsl: '335 65% 55%',
    secondaryHsl: '350 45% 60%',
    bgPrimary: '330 55% 45%',
    bgSecondary: '340 50% 60%',
    glowPrimary: 'rgba(180, 90, 130, 0.35)',
    glowSecondary: 'rgba(200, 140, 160, 0.25)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'mustard-olive',
    name: 'Mustard Olive',
    description: 'Earthy warmth',
    baseHsl: '45 50% 35%',
    accentHsl: '42 55% 50%',
    secondaryHsl: '80 30% 40%',
    bgPrimary: '45 40% 16%',
    bgSecondary: '55 30% 10%',
    glowPrimary: 'rgba(160, 130, 50, 0.25)',
    glowSecondary: 'rgba(120, 140, 60, 0.18)',
    ...WHITE_TEXT,
    isLight: false,
  },
];

interface ColorThemeContextType {
  currentTheme: NeonTheme;
  setTheme: (themeId: string) => void;
  themes: NeonTheme[];
}

const ColorThemeContext = createContext<ColorThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'aster-color-theme';

export const ColorThemeProvider = ({ children }: { children: ReactNode }) => {
  const [currentThemeId, setCurrentThemeId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) || 'rosewood-den';
    }
    return 'rosewood-den';
  });

  const currentTheme = NEON_THEMES.find(t => t.id === currentThemeId) || NEON_THEMES[0];

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-color-theme', currentTheme.id);
    root.setAttribute('data-theme-light', currentTheme.isLight ? 'true' : 'false');

    root.style.setProperty('--bg', currentTheme.bgPrimary);
    root.style.setProperty('--bg-bottom', currentTheme.bgSecondary);
    root.style.setProperty('--background', currentTheme.bgPrimary);

    const bgParts = currentTheme.bgPrimary.split(' ');
    const bgH = bgParts[0] || '0';
    const bgS = parseFloat(bgParts[1] || '0');
    const bgL = parseFloat(bgParts[2] || '0');

    const cardL = Math.max(bgL + 5, 10);
    const cardS = Math.min(bgS + 5, 100);
    const cardColor = `${bgH} ${cardS}% ${cardL}%`;
    root.style.setProperty('--card', cardColor);
    root.style.setProperty('--popover', cardColor);
    root.style.setProperty('--surface', cardColor);

    const mutedL = Math.max(bgL + 8, 15);
    root.style.setProperty('--surface-muted', `${bgH} ${cardS}% ${mutedL}%`);
    root.style.setProperty('--muted', `${bgH} ${cardS}% ${mutedL}%`);

    const borderL = Math.min(bgL + 18, 50);
    const borderColor = `${bgH} ${Math.max(bgS - 10, 0)}% ${borderL}%`;
    root.style.setProperty('--border', borderColor);
    root.style.setProperty('--input', borderColor);
    root.style.setProperty('--divider', borderColor);

    root.style.setProperty('--glass-overlay-start', 'rgba(255,255,255,0.04)');
    root.style.setProperty('--glass-overlay-end', 'rgba(255,255,255,0.02)');
    root.style.setProperty('--glass-border', 'rgba(255,255,255,0.12)');
    root.style.setProperty('--glass-border-subtle', 'rgba(255,255,255,0.08)');
    root.style.setProperty('--glass-highlight', 'rgba(255,255,255,0.18)');
    root.style.setProperty('--glass-shadow', 'rgba(0,0,0,0.4)');
    root.style.setProperty('--glass-shadow-deep', 'rgba(0,0,0,0.5)');
    root.style.setProperty('--glass-backdrop', `hsla(${bgH}, ${bgS}%, ${Math.max(bgL - 3, 0)}%, 0.80)`);
    root.style.setProperty('--glass-tab-active', 'rgba(255,255,255,0.1)');

    root.style.setProperty('--text', currentTheme.foreground);
    root.style.setProperty('--text-secondary', currentTheme.foregroundSecondary);
    root.style.setProperty('--text-muted', currentTheme.foregroundMuted);
    root.style.setProperty('--foreground', currentTheme.foreground);
    root.style.setProperty('--muted-foreground', currentTheme.foregroundMuted);
    root.style.setProperty('--card-foreground', currentTheme.foreground);
    root.style.setProperty('--popover-foreground', currentTheme.foreground);
    root.style.setProperty('--sidebar-foreground', currentTheme.foreground);
    root.style.setProperty('--accent-foreground', currentTheme.foreground);
    root.style.setProperty('--secondary-foreground', currentTheme.foreground);

    root.style.setProperty('--primary-foreground', '0 0% 8%');

    root.style.setProperty('--glow-primary', currentTheme.glowPrimary);
    root.style.setProperty('--glow-secondary', currentTheme.glowSecondary);

    root.style.setProperty('--accent-1', currentTheme.accentHsl);
    root.style.setProperty('--accent-2', currentTheme.secondaryHsl);
    root.style.setProperty('--primary', currentTheme.accentHsl);
    root.style.setProperty('--secondary', currentTheme.secondaryHsl);
    root.style.setProperty('--accent', currentTheme.accentHsl);
    root.style.setProperty('--ring', currentTheme.accentHsl);
    root.style.setProperty('--sidebar-primary', currentTheme.accentHsl);
    root.style.setProperty('--sidebar-ring', currentTheme.accentHsl);

    root.style.setProperty('--feed-color', currentTheme.accentHsl);
    root.style.setProperty('--chat-color', currentTheme.accentHsl);
    root.style.setProperty('--diaper-color', currentTheme.secondaryHsl);
    root.style.setProperty('--note-color', currentTheme.secondaryHsl);

    root.style.setProperty('--cta-gradient-start', currentTheme.accentHsl);

    localStorage.setItem(STORAGE_KEY, currentTheme.id);
  }, [currentTheme]);

  const setTheme = (themeId: string) => {
    setCurrentThemeId(themeId);
  };

  return (
    <ColorThemeContext.Provider value={{ currentTheme, setTheme, themes: NEON_THEMES }}>
      {children}
    </ColorThemeContext.Provider>
  );
};

export const useColorTheme = () => {
  const context = useContext(ColorThemeContext);
  if (!context) {
    throw new Error('useColorTheme must be used within a ColorThemeProvider');
  }
  return context;
};
