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
    bgPrimary: '38 35% 88%',
    bgSecondary: '35 25% 82%',
    accent1: '18 45% 45%',
    accent2: '150 25% 40%',
    textPrimary: '25 20% 18%',
    textSecondary: '25 15% 35%',
    textMuted: '25 12% 50%',
    cardBg: '40 30% 97%',
    cardBorder: '35 20% 85%',
    divider: '35 15% 82%',
    surface: '38 25% 92%',
    surfaceMuted: '36 20% 88%',
    baseHsl: '18 45% 45%',
    accentHsl: '18 45% 45%',
    secondaryHsl: '150 25% 40%',
    foreground: '25 20% 18%',
    foregroundSecondary: '25 15% 35%',
    foregroundMuted: '25 12% 50%',
    glowPrimary: 'rgba(180, 150, 120, 0.1)',
    glowSecondary: 'rgba(120, 160, 130, 0.08)',
    isLight: true,
  },
  {
    id: 'bamboo-mist',
    name: 'Bamboo Mist',
    description: 'Soft sage, forest calm',
    bgPrimary: '140 20% 86%',
    bgSecondary: '145 18% 80%',
    accent1: '155 35% 38%',
    accent2: '30 40% 48%',
    textPrimary: '150 15% 15%',
    textSecondary: '145 10% 32%',
    textMuted: '140 8% 48%',
    cardBg: '140 18% 96%',
    cardBorder: '145 12% 83%',
    divider: '140 10% 80%',
    surface: '142 14% 91%',
    surfaceMuted: '140 12% 87%',
    baseHsl: '155 35% 38%',
    accentHsl: '155 35% 38%',
    secondaryHsl: '30 40% 48%',
    foreground: '150 15% 15%',
    foregroundSecondary: '145 10% 32%',
    foregroundMuted: '140 8% 48%',
    glowPrimary: 'rgba(100, 150, 120, 0.1)',
    glowSecondary: 'rgba(180, 150, 100, 0.08)',
    isLight: true,
  },
  {
    id: 'clay-earth',
    name: 'Clay Earth',
    description: 'Terracotta warmth',
    bgPrimary: '25 30% 86%',
    bgSecondary: '20 25% 80%',
    accent1: '12 50% 42%',
    accent2: '35 45% 50%',
    textPrimary: '20 25% 16%',
    textSecondary: '18 18% 33%',
    textMuted: '15 12% 48%',
    cardBg: '28 28% 96%',
    cardBorder: '22 18% 83%',
    divider: '20 14% 80%',
    surface: '24 22% 91%',
    surfaceMuted: '22 18% 87%',
    baseHsl: '12 50% 42%',
    accentHsl: '12 50% 42%',
    secondaryHsl: '35 45% 50%',
    foreground: '20 25% 16%',
    foregroundSecondary: '18 18% 33%',
    foregroundMuted: '15 12% 48%',
    glowPrimary: 'rgba(180, 120, 90, 0.1)',
    glowSecondary: 'rgba(200, 170, 100, 0.08)',
    isLight: true,
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
    root.style.setProperty('--accent-foreground', currentTheme.isLight ? '40 30% 97%' : '35 15% 90%');
    root.style.setProperty('--secondary-foreground', currentTheme.isLight ? '40 30% 97%' : '35 15% 90%');
    root.style.setProperty('--primary-foreground', currentTheme.isLight ? '40 30% 97%' : '30 8% 12%');

    // Accents
    root.style.setProperty('--accent-1', currentTheme.accent1);
    root.style.setProperty('--accent-2', currentTheme.accent2);
    root.style.setProperty('--primary', currentTheme.accent1);
    root.style.setProperty('--secondary', currentTheme.accent2);
    root.style.setProperty('--accent', currentTheme.accent1);
    root.style.setProperty('--ring', currentTheme.accent1);
    root.style.setProperty('--sidebar-primary', currentTheme.accent1);
    root.style.setProperty('--sidebar-ring', currentTheme.accent1);

    // Card shadows based on theme lightness
    if (currentTheme.isLight) {
      root.style.setProperty('--card-shadow', 'rgba(25, 20, 15, 0.06)');
      root.style.setProperty('--card-shadow-hover', 'rgba(25, 20, 15, 0.12)');
    } else {
      root.style.setProperty('--card-shadow', 'rgba(0, 0, 0, 0.3)');
      root.style.setProperty('--card-shadow-hover', 'rgba(0, 0, 0, 0.4)');
    }

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
