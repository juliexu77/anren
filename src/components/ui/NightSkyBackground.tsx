import { ReactNode } from "react";

interface NightSkyBackgroundProps {
  children: ReactNode;
}

export const NightSkyBackground = ({ children }: NightSkyBackgroundProps) => {
  return (
    <div className="relative min-h-screen">
      {/* Clay texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("/images/clay-texture.jpg")`,
          backgroundSize: '400px 400px',
          backgroundRepeat: 'repeat',
          opacity: 0.08,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Subtle noise grain on top */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: 0.02,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Warm ambient glow — top */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: `radial-gradient(ellipse 80% 50% at 50% 0%, hsl(35 30% 88% / 0.5) 0%, transparent 70%)`,
        }}
      />

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
