import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
        serif: ["Fraunces", "Georgia", "Times New Roman", "serif"],
        editorial: ["Fraunces", "Georgia", "serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        hairline: "hsl(var(--hairline))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        paper: {
          DEFAULT: "hsl(var(--paper))",
          sunk: "hsl(var(--paper-sunk))",
        },
        whisper: "hsl(var(--whisper))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          soft: "hsl(var(--primary-soft))",
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
      boxShadow: {
        lift: "var(--shadow-lift)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
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
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.9" },
          "50%": { transform: "scale(1.06)", opacity: "1" },
        },
        ripple: {
          "0%": { transform: "scale(0.9)", opacity: "0.5" },
          "100%": { transform: "scale(1.9)", opacity: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "stipple-in": {
          "0%": {
            opacity: "0",
            maskImage:
              "radial-gradient(circle, #000 6%, transparent 7%), radial-gradient(circle, #000 4%, transparent 5%)",
            WebkitMaskImage:
              "radial-gradient(circle, #000 6%, transparent 7%), radial-gradient(circle, #000 4%, transparent 5%)",
            maskSize: "7px 7px, 5px 5px",
            WebkitMaskSize: "7px 7px, 5px 5px",
            maskPosition: "0 0, 2px 1px",
            WebkitMaskPosition: "0 0, 2px 1px",
          },
          "30%": {
            opacity: "0.55",
            maskImage:
              "radial-gradient(circle, #000 22%, transparent 23%), radial-gradient(circle, #000 16%, transparent 17%)",
            WebkitMaskImage:
              "radial-gradient(circle, #000 22%, transparent 23%), radial-gradient(circle, #000 16%, transparent 17%)",
            maskSize: "5px 5px, 4px 4px",
            WebkitMaskSize: "5px 5px, 4px 4px",
            maskPosition: "0 0, 2px 1px",
            WebkitMaskPosition: "0 0, 2px 1px",
          },
          "65%": {
            opacity: "0.85",
            maskImage:
              "radial-gradient(circle, #000 44%, transparent 46%), radial-gradient(circle, #000 38%, transparent 40%)",
            WebkitMaskImage:
              "radial-gradient(circle, #000 44%, transparent 46%), radial-gradient(circle, #000 38%, transparent 40%)",
            maskSize: "3px 3px, 2px 2px",
            WebkitMaskSize: "3px 3px, 2px 2px",
            maskPosition: "0 0, 1px 1px",
            WebkitMaskPosition: "0 0, 1px 1px",
          },
          "100%": {
            opacity: "1",
            maskImage:
              "radial-gradient(circle, #000 72%, #000 74%), radial-gradient(circle, #000 72%, #000 74%)",
            WebkitMaskImage:
              "radial-gradient(circle, #000 72%, #000 74%), radial-gradient(circle, #000 72%, #000 74%)",
            maskSize: "1px 1px, 1px 1px",
            WebkitMaskSize: "1px 1px, 1px 1px",
            maskPosition: "0 0, 0 0",
            WebkitMaskPosition: "0 0, 0 0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        breathe: "breathe 3.4s ease-in-out infinite",
        ripple: "ripple 2.6s ease-out infinite",
        "fade-up": "fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
        "stipple-in": "stipple-in 0.7s cubic-bezier(0.22, 1, 0.36, 1) both",
      },

    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
