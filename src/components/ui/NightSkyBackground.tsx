import { useMemo, ReactNode, useEffect, useState, useCallback } from "react";
import { useColorTheme } from "@/contexts/ColorThemeContext";

interface NightSkyBackgroundProps {
  children: ReactNode;
  starCount?: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  opacity: number;
  hasFlare: boolean;
  twinkleDelay: number;
  twinkleDuration: number;
}

interface ShootingStar {
  id: number;
  startX: number;
  startY: number;
  angle: number;
  duration: number;
}

const generateBackgroundStars = (count: number): Star[] => {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    const sizeRoll = Math.random();
    let size: number;
    let hasFlare = false;

    if (sizeRoll > 0.97) {
      size = 2.0 + Math.random() * 1.5;
      hasFlare = true;
    } else if (sizeRoll > 0.92) {
      size = 1.2 + Math.random() * 0.8;
    } else if (sizeRoll > 0.75) {
      size = 0.6 + Math.random() * 0.5;
    } else {
      size = 0.3 + Math.random() * 0.3;
    }

    const brightnessRoll = Math.random();
    let opacity: number;
    if (brightnessRoll > 0.88) {
      opacity = 0.75 + Math.random() * 0.25;
    } else if (brightnessRoll > 0.6) {
      opacity = 0.4 + Math.random() * 0.3;
    } else if (brightnessRoll > 0.3) {
      opacity = 0.2 + Math.random() * 0.2;
    } else {
      opacity = 0.08 + Math.random() * 0.1;
    }

    stars.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size,
      opacity,
      hasFlare,
      twinkleDelay: Math.random() * 5,
      twinkleDuration: 1.5 + Math.random() * 2.5,
    });
  }
  return stars;
};

const createShootingStar = (): ShootingStar => ({
  id: Date.now() + Math.random(),
  startX: Math.random() * 80 + 10,
  startY: Math.random() * 40,
  angle: 25 + Math.random() * 20,
  duration: 0.6 + Math.random() * 0.4,
});

export const NightSkyBackground = ({ children, starCount = 400 }: NightSkyBackgroundProps) => {
  const backgroundStars = useMemo(() => generateBackgroundStars(starCount), [starCount]);
  const [mounted, setMounted] = useState(false);
  const [shootingStars, setShootingStars] = useState<ShootingStar[]>([]);
  const { currentTheme } = useColorTheme();

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const spawnShootingStar = () => {
      setShootingStars(prev => [...prev, createShootingStar()]);
      const nextDelay = 4000 + Math.random() * 8000;
      return setTimeout(spawnShootingStar, nextDelay);
    };

    const initialDelay = 2000 + Math.random() * 4000;
    const initialTimer = setTimeout(() => {
      const recurringTimer = spawnShootingStar();
      return () => clearTimeout(recurringTimer);
    }, initialDelay);

    return () => clearTimeout(initialTimer);
  }, []);

  const removeShootingStar = useCallback((id: number) => {
    setShootingStars(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic gradient background */}
      <div
        className="fixed inset-0 pointer-events-none transition-colors duration-500"
        style={{
          background: `linear-gradient(180deg, hsl(${currentTheme.bgPrimary}) 0%, hsl(${currentTheme.bgSecondary}) 100%)`,
          zIndex: -6,
        }}
      />

      {/* Dynamic cosmic glow */}
      {currentTheme.id !== 'chinese-ink' && (
        <div
          className="fixed inset-0 pointer-events-none transition-opacity duration-500"
          style={{
            zIndex: -5,
            background: `
              radial-gradient(ellipse 60% 40% at 80% 20%, ${currentTheme.glowPrimary} 0%, transparent 60%),
              radial-gradient(ellipse 50% 35% at 20% 70%, ${currentTheme.glowSecondary} 0%, transparent 50%)
            `,
          }}
        />
      )}

      {/* Rosewood Gate - lacquered wood grain waves */}
      {currentTheme.id === 'rosewood-den' && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.5,
              background: `
                radial-gradient(ellipse 200% 15% at 50% 15%, ${currentTheme.glowSecondary} 0%, transparent 70%),
                radial-gradient(ellipse 180% 12% at 45% 35%, ${currentTheme.glowPrimary} 0%, transparent 60%),
                radial-gradient(ellipse 220% 18% at 55% 55%, ${currentTheme.glowSecondary} 0%, transparent 65%),
                radial-gradient(ellipse 190% 14% at 48% 75%, ${currentTheme.glowPrimary} 0%, transparent 55%),
                radial-gradient(ellipse 200% 16% at 52% 92%, ${currentTheme.glowSecondary} 0%, transparent 70%)
              `,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.4,
              background: `
                radial-gradient(circle at 15% 25%, ${currentTheme.glowPrimary} 0%, transparent 20%),
                radial-gradient(circle at 85% 75%, ${currentTheme.glowPrimary} 0%, transparent 18%)
              `,
            }}
          />
        </>
      )}

      {/* Jade Mist - horizontal mist bands */}
      {currentTheme.id === 'chinese-jade' && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.5,
              background: `
                radial-gradient(ellipse 150% 20% at 50% 10%, hsl(${currentTheme.bgSecondary}) 0%, transparent 70%),
                radial-gradient(ellipse 180% 25% at 40% 40%, hsl(${currentTheme.bgPrimary} / 0.5) 0%, transparent 55%),
                radial-gradient(ellipse 160% 22% at 60% 65%, hsl(${currentTheme.bgSecondary} / 0.6) 0%, transparent 60%),
                radial-gradient(ellipse 140% 28% at 50% 90%, hsl(${currentTheme.bgSecondary} / 0.7) 0%, transparent 65%)
              `,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.4,
              background: `
                radial-gradient(circle at 20% 25%, ${currentTheme.glowPrimary} 0%, transparent 20%),
                radial-gradient(circle at 80% 45%, ${currentTheme.glowSecondary} 0%, transparent 18%),
                radial-gradient(circle at 35% 75%, ${currentTheme.glowPrimary} 0%, transparent 22%)
              `,
            }}
          />
        </>
      )}

      {/* Peony - scattered petal circles */}
      {currentTheme.id === 'chinese-plum' && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.5,
              background: `
                radial-gradient(circle at 25% 15%, hsl(${currentTheme.bgSecondary}) 0%, transparent 18%),
                radial-gradient(circle at 75% 20%, hsl(${currentTheme.bgSecondary} / 0.7) 0%, transparent 14%),
                radial-gradient(circle at 15% 45%, hsl(${currentTheme.bgSecondary} / 0.8) 0%, transparent 16%),
                radial-gradient(circle at 85% 50%, hsl(${currentTheme.bgSecondary} / 0.6) 0%, transparent 12%),
                radial-gradient(circle at 30% 75%, hsl(${currentTheme.bgSecondary} / 0.9) 0%, transparent 20%),
                radial-gradient(circle at 70% 80%, hsl(${currentTheme.bgSecondary} / 0.5) 0%, transparent 15%),
                radial-gradient(circle at 50% 50%, hsl(${currentTheme.bgSecondary} / 0.4) 0%, transparent 22%)
              `,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.4,
              background: `
                radial-gradient(circle at 50% 30%, ${currentTheme.glowPrimary} 0%, transparent 30%),
                radial-gradient(circle at 40% 70%, ${currentTheme.glowSecondary} 0%, transparent 20%),
                radial-gradient(circle at 60% 85%, ${currentTheme.glowSecondary} 0%, transparent 18%)
              `,
            }}
          />
        </>
      )}

      {/* Mustard Olive - warm earthy pools */}
      {currentTheme.id === 'mustard-olive' && (
        <>
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.5,
              background: `
                radial-gradient(ellipse 180% 20% at 50% 15%, ${currentTheme.glowPrimary} 0%, transparent 65%),
                radial-gradient(ellipse 160% 18% at 35% 45%, ${currentTheme.glowSecondary} 0%, transparent 55%),
                radial-gradient(ellipse 200% 22% at 65% 70%, ${currentTheme.glowPrimary} 0%, transparent 60%),
                radial-gradient(ellipse 170% 25% at 50% 95%, ${currentTheme.glowSecondary} 0%, transparent 70%)
              `,
            }}
          />
          <div
            className="fixed inset-0 pointer-events-none"
            style={{
              zIndex: -4.4,
              background: `
                radial-gradient(circle at 25% 30%, ${currentTheme.glowPrimary} 0%, transparent 22%),
                radial-gradient(circle at 75% 60%, ${currentTheme.glowSecondary} 0%, transparent 18%)
              `,
            }}
          />
        </>
      )}

      {/* Silver Needle fog */}
      {currentTheme.id === 'chinese-ink' && (
        <>
          <div
            className="fixed pointer-events-none animate-fog-drift-1 inset-0"
            style={{
              zIndex: -4.5,
              background: 'linear-gradient(to bottom, transparent 0%, transparent 25%, rgba(190, 198, 210, 0.25) 45%, rgba(190, 198, 210, 0.2) 55%, rgba(190, 198, 210, 0.25) 75%, transparent 100%)',
              filter: 'blur(40px)',
              width: '200%',
              height: '100%',
              left: '-50%',
              willChange: 'transform',
            }}
          />
          <div
            className="fixed pointer-events-none animate-fog-drift-2 inset-0"
            style={{
              zIndex: -4.3,
              background: 'linear-gradient(to bottom, transparent 0%, transparent 35%, rgba(180, 188, 200, 0.18) 50%, rgba(180, 188, 200, 0.15) 65%, rgba(180, 188, 200, 0.18) 85%, transparent 100%)',
              filter: 'blur(35px)',
              width: '200%',
              height: '100%',
              left: '-50%',
              willChange: 'transform',
            }}
          />
        </>
      )}

      {/* Grain texture */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -4,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          opacity: currentTheme.id === 'default' ? 0.015 : 0.03,
          mixBlendMode: 'overlay',
        }}
      />

      {/* Vignette */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          zIndex: -3,
          background: currentTheme.id === 'default'
            ? `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(0, 0, 0, 0.6) 100%)`
            : `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(40, 10, 50, 0.5) 100%)`,
        }}
      />

      {/* Shooting stars */}
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden"
        style={{
          zIndex: -2,
          display: currentTheme.id === 'chinese-ink' ? 'none' : 'block',
        }}
      >
        {shootingStars.map((star) => (
          <div
            key={star.id}
            className="absolute"
            style={{
              left: `${star.startX}%`,
              top: `${star.startY}%`,
              width: '100px',
              height: '2px',
              background: `linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,252,240,0.9) 50%, rgba(255,255,255,0.3) 100%)`,
              borderRadius: '2px',
              transform: `rotate(${star.angle}deg)`,
              transformOrigin: 'left center',
              animation: `shootingStar ${star.duration}s ease-out forwards`,
              boxShadow: '0 0 6px 2px rgba(255,252,240,0.4)',
            }}
            onAnimationEnd={() => removeShootingStar(star.id)}
          />
        ))}
      </div>

      {/* Star field */}
      <div
        className="fixed inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          zIndex: -1,
          opacity: currentTheme.id === 'chinese-ink' ? 0.6 : 1,
        }}
      >
        {backgroundStars.map((star, i) => (
          <div key={`night-star-${i}`}>
            <div
              className="absolute rounded-full"
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                backgroundColor: star.hasFlare ? '#fffef8' : '#f8f6f0',
                opacity: mounted ? star.opacity : 0,
                boxShadow: star.hasFlare
                  ? `0 0 ${star.size * 4}px ${star.size * 1.5}px rgba(255,252,240,0.4), 0 0 ${star.size * 8}px ${star.size * 2}px rgba(255,250,235,0.15)`
                  : star.size > 1
                    ? `0 0 ${star.size * 2}px ${star.size * 0.5}px rgba(255,250,240,0.2)`
                    : undefined,
                animation: mounted ? `twinkle ${star.twinkleDuration}s ease-in-out ${star.twinkleDelay}s infinite` : 'none',
                transition: 'opacity 0.3s ease-out',
              }}
            />
            {star.hasFlare && (
              <>
                <div
                  className="absolute"
                  style={{
                    left: `calc(${star.x}% - ${star.size * 6}px)`,
                    top: `calc(${star.y}% - 0.5px)`,
                    width: `${star.size * 12}px`,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,252,240,${star.opacity * 0.6}) 50%, transparent 100%)`,
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: `calc(${star.x}% - 0.5px)`,
                    top: `calc(${star.y}% - ${star.size * 6}px)`,
                    width: '1px',
                    height: `${star.size * 12}px`,
                    background: `linear-gradient(180deg, transparent 0%, rgba(255,252,240,${star.opacity * 0.6}) 50%, transparent 100%)`,
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: `calc(${star.x}% - ${star.size * 3}px)`,
                    top: `calc(${star.y}% - ${star.size * 3}px)`,
                    width: `${star.size * 6}px`,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,252,240,${star.opacity * 0.3}) 50%, transparent 100%)`,
                    transform: 'rotate(45deg)',
                    transformOrigin: 'center',
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: `calc(${star.x}% - ${star.size * 3}px)`,
                    top: `calc(${star.y}% + ${star.size * 3}px)`,
                    width: `${star.size * 6}px`,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent 0%, rgba(255,252,240,${star.opacity * 0.3}) 50%, transparent 100%)`,
                    transform: 'rotate(-45deg)',
                    transformOrigin: 'center',
                  }}
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Content */}
      <div className="relative z-0">
        {children}
      </div>
    </div>
  );
};
