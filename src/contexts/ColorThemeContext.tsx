import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface NeonTheme {
  id: string;
  name: string;
  description: string;
  bgPrimary: string;
  bgSecondary: string;
  accent1: string;
  accent2: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  cardBg: string;
  cardBorder: string;
  divider: string;
  surface: string;
  surfaceMuted: string;
  // Legacy compat
  baseHsl: string;
  accentHsl: string;
  secondaryHsl: string;
  foreground: string;
  foregroundSecondary: string;
  foregroundMuted: string;
  glowPrimary: string;
  glowSecondary: string;
  isLight: boolean;
}

export const NEON_THEMES: NeonTheme[] = [
  {
    id: 'stone-tea',
    name: 'Stone & Tea',
    description: 'Warm cream, quiet warmth',
    bgPrimary: '18 35% 32%',
    bgSecondary: '20 30% 26%',
    accent1: '38 45% 70%',
    accent2: '150 25% 55%',
    textPrimary: '40 30% 95%',
    textSecondary: '38 20% 80%',
    textMuted: '35 15% 65%',
    cardBg: '18 25% 22%',
    cardBorder: '20 18% 28%',
    divider: '20 15% 25%',
    surface: '18 22% 26%',
    surfaceMuted: '20 18% 24%',
    baseHsl: '38 45% 70%',
    accentHsl: '38 45% 70%',
    secondaryHsl: '150 25% 55%',
    foreground: '40 30% 95%',
    foregroundSecondary: '38 20% 80%',
    foregroundMuted: '35 15% 65%',
    glowPrimary: 'rgba(180, 150, 120, 0.15)',
    glowSecondary: 'rgba(120, 160, 130, 0.1)',
    isLight: false,
  },
  {
    id: 'bamboo-mist',
    name: 'Forest Hearth',
    description: 'Earthy moss, woodland warmth',
    bgPrimary: '105 22% 20%',
    bgSecondary: '100 20% 15%',
    accent1: '38 40% 68%',
    accent2: '30 40% 60%',
    textPrimary: '90 12% 95%',
    textSecondary: '95 10% 78%',
    textMuted: '90 8% 55%',
    cardBg: '105 18% 15%',
    cardBorder: '102 14% 20%',
    divider: '100 12% 18%',
    surface: '105 18% 18%',
    surfaceMuted: '102 15% 16%',
    baseHsl: '38 40% 68%',
    accentHsl: '38 40% 68%',
    secondaryHsl: '30 40% 60%',
    foreground: '90 12% 95%',
    foregroundSecondary: '95 10% 78%',
    foregroundMuted: '90 8% 58%',
    glowPrimary: 'rgba(110, 130, 90, 0.15)',
    glowSecondary: 'rgba(180, 150, 100, 0.1)',
    isLight: false,
  },
  {
    id: 'clay-earth',
    name: 'Clay Earth',
    description: 'Terracotta warmth',
    bgPrimary: '12 40% 30%',
    bgSecondary: '15 35% 24%',
    accent1: '35 50% 68%',
    accent2: '25 40% 60%',
    textPrimary: '28 25% 95%',
    textSecondary: '22 18% 78%',
    textMuted: '18 12% 62%',
    cardBg: '12 30% 22%',
    cardBorder: '14 22% 28%',
    divider: '14 18% 25%',
    surface: '12 28% 26%',
    surfaceMuted: '14 22% 24%',
    baseHsl: '35 50% 68%',
    accentHsl: '35 50% 68%',
    secondaryHsl: '25 40% 60%',
    foreground: '28 25% 95%',
    foregroundSecondary: '22 18% 78%',
    foregroundMuted: '18 12% 62%',
    glowPrimary: 'rgba(180, 120, 90, 0.15)',
    glowSecondary: 'rgba(200, 170, 100, 0.1)',
    isLight: false,
  },
  {
    id: 'ink-silk',
    name: 'Ink & Silk',
    description: 'Deep charcoal, quiet luxury',
    bgPrimary: '30 12% 10%',
    bgSecondary: '25 10% 6%',
    accent1: '35 50% 55%',
    accent2: '18 40% 50%',
    textPrimary: '35 15% 90%',
    textSecondary: '30 10% 72%',
    textMuted: '25 8% 55%',
    cardBg: '30 10% 16%',
    cardBorder: '28 8% 22%',
    divider: '25 6% 20%',
    surface: '28 8% 14%',
    surfaceMuted: '26 7% 18%',
    baseHsl: '35 50% 55%',
    accentHsl: '35 50% 55%',
    secondaryHsl: '18 40% 50%',
    foreground: '35 15% 90%',
    foregroundSecondary: '30 10% 72%',
    foregroundMuted: '25 8% 55%',
    glowPrimary: 'rgba(200, 170, 100, 0.15)',
    glowSecondary: 'rgba(180, 130, 90, 0.1)',
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
      return localStorage.getItem(STORAGE_KEY) || 'stone-tea';
    }
    return 'stone-tea';
  });

  const currentTheme = NEON_THEMES.find(t => t.id === currentThemeId) || NEON_THEMES[0];

  useEffect(() => {
    const root = document.documentElement;

    root.setAttribute('data-color-theme', currentTheme.id);
    root.setAttribute('data-theme-light', currentTheme.isLight ? 'true' : 'false');

    // Backgrounds
    root.style.setProperty('--bg', currentTheme.bgPrimary);
    root.style.setProperty('--bg-bottom', currentTheme.bgSecondary);
    root.style.setProperty('--background', currentTheme.bgPrimary);

    // Surfaces
    root.style.setProperty('--surface', currentTheme.surface);
    root.style.setProperty('--surface-muted', currentTheme.surfaceMuted);
    root.style.setProperty('--card', currentTheme.surface);
    root.style.setProperty('--card-bg', currentTheme.cardBg);
    root.style.setProperty('--card-border', currentTheme.cardBorder);
    root.style.setProperty('--popover', currentTheme.cardBg);
    root.style.setProperty('--muted', currentTheme.surfaceMuted);

    // Borders
    root.style.setProperty('--border', currentTheme.divider);
    root.style.setProperty('--input', currentTheme.surfaceMuted);
    root.style.setProperty('--divider', currentTheme.divider);

    // Text colors
    root.style.setProperty('--text', currentTheme.textPrimary);
    root.style.setProperty('--text-secondary', currentTheme.textSecondary);
    root.style.setProperty('--text-muted', currentTheme.textMuted);
    root.style.setProperty('--foreground', currentTheme.textPrimary);
    root.style.setProperty('--muted-foreground', currentTheme.textMuted);
    root.style.setProperty('--card-foreground', currentTheme.textPrimary);
    root.style.setProperty('--popover-foreground', currentTheme.textPrimary);
    root.style.setProperty('--sidebar-foreground', currentTheme.textPrimary);
    root.style.setProperty('--accent-foreground', '35 15% 90%');
    root.style.setProperty('--secondary-foreground', '35 15% 90%');
    root.style.setProperty('--primary-foreground', '30 8% 12%');

    // Accents
    root.style.setProperty('--accent-1', currentTheme.accent1);
    root.style.setProperty('--accent-2', currentTheme.accent2);
    root.style.setProperty('--primary', currentTheme.accent1);
    root.style.setProperty('--secondary', currentTheme.accent2);
    root.style.setProperty('--accent', currentTheme.accent1);
    root.style.setProperty('--ring', currentTheme.accent1);
    root.style.setProperty('--sidebar-primary', currentTheme.accent1);
    root.style.setProperty('--sidebar-ring', currentTheme.accent1);

    // Card shadows — all dark themes now
    root.style.setProperty('--card-shadow', 'rgba(0, 0, 0, 0.3)');
    root.style.setProperty('--card-shadow-hover', 'rgba(0, 0, 0, 0.4)');

    // Body background
    document.body.style.background = `hsl(${currentTheme.bgPrimary})`;

    try {
      localStorage.setItem(STORAGE_KEY, currentTheme.id);
    } catch {}
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
