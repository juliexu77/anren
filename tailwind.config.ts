import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["DM Sans", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        serif: ["Playfair Display", "Georgia", "Times New Roman", "serif"],
        display: ["Playfair Display", "Georgia", "serif"],
        num: ["DM Sans", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      letterSpacing: {
        'display': '-0.015em',
        'heading': '-0.01em',
        'body': '0',
        'caps': '0.06em',
      },
      fontWeight: {
        'body': '500',
        'label': '600',
        'heading': '700',
        'display': '700',
      },
      lineHeight: {
        'body': '1.6',
        'heading': '1.15',
        'display': '1.0',
      },
      opacity: {
        'icon': '0.9',
        'icon-soft': '0.7',
      },
      colors: {
        // Neon accent palette (emerald-themed)
        'neon-emerald': 'hsl(160, 70%, 50%)',
        'neon-gold': 'hsl(43, 96%, 56%)',
        'neon-cyan': 'hsl(187, 94%, 53%)',
        'neon-sage': 'hsl(140, 50%, 55%)',
        // Gold accent
        gold: {
          DEFAULT: "hsl(var(--gold))",
          glow: "hsl(var(--gold-glow))",
        },
        // Standard tokens
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        "card-ombre": {
          "1": "hsl(var(--card-ombre-1))",
          "1-dark": "hsl(var(--card-ombre-1-dark))",
          "2": "hsl(var(--card-ombre-2))",
          "2-dark": "hsl(var(--card-ombre-2-dark))",
          "3": "hsl(var(--card-ombre-3))",
          "3-dark": "hsl(var(--card-ombre-3-dark))",
          "4": "hsl(var(--card-ombre-4))",
          "4-dark": "hsl(var(--card-ombre-4-dark))",
        },
        cta: {
          "gradient-start": "hsl(var(--cta-gradient-start))",
          "gradient-end": "hsl(var(--cta-gradient-end))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      backgroundImage: {
        'gradient-primary': 'var(--gradient-primary)',
      },
      boxShadow: {
        'soft': 'var(--shadow-soft)',
        'card': 'var(--shadow-card)',
        'diffused': '0 2px 4px -1px hsla(160, 50%, 40%, 0.04), 0 4px 12px -2px hsla(160, 50%, 40%, 0.08)',
        'diffused-lg': '0 2px 4px -1px hsla(160, 50%, 40%, 0.04), 0 6px 16px -3px hsla(160, 50%, 40%, 0.08), 0 12px 32px -6px hsla(160, 50%, 40%, 0.06)',
        'glow-soft': '0 0 20px -5px hsla(160, 50%, 50%, 0.15)',
        'alive': '0 2px 4px -1px hsla(160, 50%, 40%, 0.04), 0 8px 20px -4px hsla(160, 50%, 40%, 0.1), 0 0 30px -8px hsla(160, 50%, 50%, 0.15)',
        'alive-hover': '0 4px 8px -2px hsla(160, 50%, 40%, 0.05), 0 12px 28px -6px hsla(160, 50%, 40%, 0.12), 0 0 40px -10px hsla(160, 50%, 50%, 0.2)',
        'inner-highlight': 'inset 0 1px 0 0 hsla(160, 40%, 98%, 0.5)',
        'inner-glow': 'inset 0 0 20px 0 hsla(160, 40%, 95%, 0.3)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        sharp: "8px",
        "3xl": "24px",
        "4xl": "28px",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "bounce-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "50%": { opacity: "0.8", transform: "scale(1.02)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "flash": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 5px hsl(var(--primary))" },
          "50%": { boxShadow: "0 0 20px hsl(var(--primary)), 0 0 30px hsl(var(--primary))" },
        },
        "glow-pulse": {
          "0%, 100%": {
            boxShadow: "0 0 15px -5px hsla(160, 50%, 50%, 0.15), 0 8px 20px -4px hsla(160, 50%, 40%, 0.1)",
          },
          "50%": {
            boxShadow: "0 0 25px -5px hsla(160, 50%, 50%, 0.25), 0 10px 25px -4px hsla(160, 50%, 40%, 0.12)",
          },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "soft-bounce": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-2px)" },
        },
        "breathe": {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.8", transform: "scale(1.05)" },
        },
        "cta-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.9" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 180ms ease-in-out",
        "bounce-in": "bounce-in 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)",
        "flash": "flash 0.5s ease-in-out",
        "glow": "glow 1s ease-in-out infinite",
        "glow-pulse": "glow-pulse 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "soft-bounce": "soft-bounce 2s ease-in-out infinite",
        "breathe": "breathe 2s ease-in-out infinite",
        "cta-pulse": "cta-pulse 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
