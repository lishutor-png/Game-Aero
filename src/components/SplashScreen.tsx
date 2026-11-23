import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  reducedMotion: boolean;
}

export function SplashScreen({ onComplete, reducedMotion }: SplashScreenProps) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const start = performance.now();
    const duration = reducedMotion ? 900 : 1900;
    let raf = 0;

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setProgress(Math.round(t * 100));
      if (t < 1) {
        raf = requestAnimationFrame(step);
      } else {
        onComplete();
      }
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [onComplete, reducedMotion]);

  return (
    <div
      role="region"
      aria-label="Layar Pembuka AeroGlide 3D"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(160deg, #0b1120 0%, #0f172a 55%, #082f49 100%)',
        color: '#f8fafc',
      }}
    >
      <div className="flex flex-col items-center max-w-md w-full text-center">
        {/* Bespoke SVG Emblem */}
        <svg
          viewBox="0 0 120 120"
          fill="none"
          aria-hidden="true"
          className="w-20 h-20 sm:w-28 sm:h-28 mb-3 sm:mb-5"
        >
          <circle cx="60" cy="60" r="54" stroke="#38bdf8" strokeWidth="2.5" strokeOpacity="0.35" />
          <circle cx="60" cy="60" r="44" stroke="#2dd4bf" strokeWidth="1.5" strokeDasharray="6 6" />
          <path
            d="M60 20L74 58L104 72L104 80L72 72L68 94L80 102L80 107L60 102L40 107L40 102L52 94L48 72L16 80L16 72L46 58L60 20Z"
            fill="#f8fafc"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M60 32L65 54H55L60 32Z" fill="#0284c7" />
        </svg>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-1.5 sm:mb-2">
          AERO<span className="text-sky-400">GLIDE</span> 3D
        </h1>
        <p className="text-xs sm:text-base text-slate-300 mb-4 sm:mb-7">
          Terbang melintasi cakrawala dengan kendali giroskop yang halus
        </p>

        {/* Progress Bar */}
        <div
          className="w-full max-w-xs h-2.5 rounded-full overflow-hidden mb-4 sm:mb-5"
          style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Memuat dunia 3D"
        >
          <div
            className="h-full rounded-full transition-all duration-100"
            style={{
              width: `${progress}%`,
              backgroundColor: '#38bdf8',
            }}
          />
        </div>

        <button
          type="button"
          onClick={onComplete}
          className="a11y-focus inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-900 bg-sky-400 hover:bg-sky-300 transition-colors cursor-pointer"
        >
          <span>Masuk ke Menu</span>
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
