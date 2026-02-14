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
    id: 'default',
    name: 'Moonlit',
    description: 'Classic den ambiance',
    baseHsl: '320 13% 58%',
    accentHsl: '320 13% 58%',
    secondaryHsl: '38 45% 62%',
    bgPrimary: '250 10% 7%',
    bgSecondary: '225 35% 5%',
    glowPrimary: 'rgba(163, 120, 143, 0.08)',
    glowSecondary: 'rgba(140, 100, 140, 0.06)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-ink',
    name: 'Silver Needle',
    description: 'Morning mist',
    baseHsl: '215 10% 45%',
    accentHsl: '210 8% 75%',
    secondaryHsl: '220 8% 55%',
    bgPrimary: '215 8% 38%',
    bgSecondary: '210 6% 52%',
    glowPrimary: 'rgba(180, 185, 195, 0.35)',
    glowSecondary: 'rgba(200, 205, 215, 0.25)',
    ...WHITE_TEXT,
    isLight: false,
  },
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
    id: 'tea-house',
    name: 'Plum Wine',
    description: 'Smoky serenity',
    baseHsl: '30 25% 20%',
    accentHsl: '40 40% 55%',
    secondaryHsl: '25 20% 35%',
    bgPrimary: '30 20% 12%',
    bgSecondary: '25 15% 8%',
    glowPrimary: 'rgba(100, 80, 60, 0.25)',
    glowSecondary: 'rgba(140, 110, 70, 0.15)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-vermillion',
    name: 'Mandarin',
    description: 'Rippling circles',
    baseHsl: '5 85% 45%',
    accentHsl: '5 90% 55%',
    secondaryHsl: '45 95% 55%',
    bgPrimary: '5 85% 45%',
    bgSecondary: '45 90% 50%',
    glowPrimary: 'rgba(200, 50, 30, 0.35)',
    glowSecondary: 'rgba(230, 180, 50, 0.3)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'lucky-red',
    name: 'Goji Berry',
    description: 'Auspicious fortune',
    baseHsl: '0 75% 40%',
    accentHsl: '45 90% 55%',
    secondaryHsl: '0 70% 50%',
    bgPrimary: '0 75% 40%',
    bgSecondary: '355 70% 32%',
    glowPrimary: 'rgba(180, 40, 40, 0.35)',
    glowSecondary: 'rgba(220, 180, 50, 0.25)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'lantern-glow',
    name: 'Jujube Tea',
    description: 'Warm radiance',
    baseHsl: '25 90% 50%',
    accentHsl: '35 95% 55%',
    secondaryHsl: '15 85% 45%',
    bgPrimary: '25 90% 50%',
    bgSecondary: '15 80% 40%',
    glowPrimary: 'rgba(240, 140, 50, 0.35)',
    glowSecondary: 'rgba(220, 100, 60, 0.3)',
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
    id: 'bamboo-grove',
    name: 'Bamboo Grove',
    description: 'Forest depths',
    baseHsl: '140 40% 30%',
    accentHsl: '45 70% 55%',
    secondaryHsl: '130 35% 40%',
    bgPrimary: '140 40% 30%',
    bgSecondary: '130 35% 22%',
    glowPrimary: 'rgba(60, 120, 70, 0.3)',
    glowSecondary: 'rgba(180, 150, 60, 0.2)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-qing',
    name: 'Qing Blue',
    description: 'Flowing arcs',
    baseHsl: '200 70% 40%',
    accentHsl: '195 80% 50%',
    secondaryHsl: '220 60% 55%',
    bgPrimary: '200 70% 40%',
    bgSecondary: '220 55% 50%',
    glowPrimary: 'rgba(50, 130, 180, 0.35)',
    glowSecondary: 'rgba(80, 100, 180, 0.3)',
    ...WHITE_TEXT,
    isLight: false,
  },
  {
    id: 'chinese-imperial',
    name: 'Persimmon Dust',
    description: 'Swirling orbs',
    baseHsl: '45 95% 50%',
    accentHsl: '40 100% 55%',
    secondaryHsl: '5 85% 50%',
    bgPrimary: '45 95% 50%',
    bgSecondary: '5 80% 45%',
    glowPrimary: 'rgba(240, 200, 40, 0.35)',
    glowSecondary: 'rgba(200, 60, 40, 0.3)',
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
      return localStorage.getItem(STORAGE_KEY) || 'default';
    }
    return 'default';
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

    const cardL = currentTheme.isLight
      ? Math.min(bgL + 8, 95)
      : Math.max(bgL + 5, 10);
    const cardS = Math.min(bgS + 5, 100);
    const cardColor = `${bgH} ${cardS}% ${cardL}%`;
    root.style.setProperty('--card', cardColor);
    root.style.setProperty('--popover', cardColor);
    root.style.setProperty('--surface', cardColor);

    const mutedL = currentTheme.isLight
      ? Math.min(bgL + 12, 95)
      : Math.max(bgL + 8, 15);
    root.style.setProperty('--surface-muted', `${bgH} ${cardS}% ${mutedL}%`);
    root.style.setProperty('--muted', `${bgH} ${cardS}% ${mutedL}%`);

    const borderL = currentTheme.isLight
      ? Math.max(bgL - 15, 0)
      : Math.min(bgL + 18, 50);
    const borderColor = `${bgH} ${Math.max(bgS - 10, 0)}% ${borderL}%`;
    root.style.setProperty('--border', borderColor);
    root.style.setProperty('--input', borderColor);
    root.style.setProperty('--divider', borderColor);

    if (currentTheme.isLight) {
      root.style.setProperty('--glass-overlay-start', 'rgba(0,0,0,0.06)');
      root.style.setProperty('--glass-overlay-end', 'rgba(0,0,0,0.03)');
      root.style.setProperty('--glass-border', 'rgba(0,0,0,0.12)');
      root.style.setProperty('--glass-border-subtle', 'rgba(0,0,0,0.08)');
      root.style.setProperty('--glass-highlight', 'rgba(255,255,255,0.25)');
      root.style.setProperty('--glass-shadow', 'rgba(0,0,0,0.15)');
      root.style.setProperty('--glass-shadow-deep', 'rgba(0,0,0,0.25)');
      root.style.setProperty('--glass-backdrop', `hsla(${bgH}, ${bgS}%, ${Math.max(bgL - 10, 0)}%, 0.80)`);
      root.style.setProperty('--glass-tab-active', 'rgba(0,0,0,0.12)');
    } else {
      root.style.setProperty('--glass-overlay-start', 'rgba(255,255,255,0.04)');
      root.style.setProperty('--glass-overlay-end', 'rgba(255,255,255,0.02)');
      root.style.setProperty('--glass-border', 'rgba(255,255,255,0.12)');
      root.style.setProperty('--glass-border-subtle', 'rgba(255,255,255,0.08)');
      root.style.setProperty('--glass-highlight', 'rgba(255,255,255,0.18)');
      root.style.setProperty('--glass-shadow', 'rgba(0,0,0,0.4)');
      root.style.setProperty('--glass-shadow-deep', 'rgba(0,0,0,0.5)');
      root.style.setProperty('--glass-backdrop', `hsla(${bgH}, ${bgS}%, ${Math.max(bgL - 3, 0)}%, 0.80)`);
      root.style.setProperty('--glass-tab-active', 'rgba(255,255,255,0.1)');
    }

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

    const primaryForeground = currentTheme.isLight ? '0 0% 100%' : '0 0% 8%';
    root.style.setProperty('--primary-foreground', primaryForeground);

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
