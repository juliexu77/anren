import { ReactNode } from "react";

interface NightSkyBackgroundProps {
  children: ReactNode;
}

export const NightSkyBackground = ({ children }: NightSkyBackgroundProps) => {
  return (
    <div className="relative min-h-screen">
      {/* Parchment texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("/images/parchment-texture.jpg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          mixBlendMode: 'multiply',
        }}
      />

      {/* Earthy wash texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("/images/clay-texture.jpg")`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.18,
          mixBlendMode: 'overlay',
          filter: 'blur(3px)',
        }}
      />

      {/* Earthy stucco / dried mud crackle layer */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='c'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.012' numOctaves='4' seed='8' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23c)'/%3E%3C/svg%3E")`,
          backgroundSize: '500px 500px',
          opacity: 0.35,
          mixBlendMode: 'soft-light',
        }}
      />

      {/* Fine sand grain — SVG noise */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E")`,
          backgroundSize: '256px 256px',
          opacity: 0.045,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Patchy fog — multiple radial gradients scattered */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: 0,
          background: `
            radial-gradient(ellipse 60% 40% at 15% 20%, hsl(35 25% 80% / 0.35) 0%, transparent 70%),
            radial-gradient(ellipse 50% 35% at 80% 15%, hsl(30 20% 75% / 0.25) 0%, transparent 65%),
            radial-gradient(ellipse 70% 30% at 50% 60%, hsl(25 20% 70% / 0.15) 0%, transparent 60%),
            radial-gradient(ellipse 40% 50% at 90% 75%, hsl(35 25% 78% / 0.2) 0%, transparent 65%),
            radial-gradient(ellipse 55% 35% at 25% 85%, hsl(30 18% 72% / 0.18) 0%, transparent 60%)
          `,
        }}
      />

      {/* Content */}
      <div className="relative" style={{ zIndex: 1 }}>
        {children}
      </div>
    </div>
  );
};
