import { ReactNode, useMemo } from "react";

interface NightSkyBackgroundProps {
  children: ReactNode;
}

export const NightSkyBackground = ({ children }: NightSkyBackgroundProps) => {
  // Generate random raindrop positions once
  const drops = useMemo(() => {
    return Array.from({ length: 18 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 8,
      duration: 4 + Math.random() * 6,
      size: 1 + Math.random() * 2,
      opacity: 0.04 + Math.random() * 0.06,
    }));
  }, []);

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

      {/* Rain drips layer */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {drops.map((drop) => (
          <div
            key={drop.id}
            className="rain-drip"
            style={{
              left: `${drop.left}%`,
              animationDelay: `${drop.delay}s`,
              animationDuration: `${drop.duration}s`,
              width: `${drop.size}px`,
              opacity: drop.opacity,
            }}
          />
        ))}
      </div>

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
