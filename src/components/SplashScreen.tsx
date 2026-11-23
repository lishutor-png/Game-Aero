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
    const duration = reducedMotion ? 900 : 1800;
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
        {/* Rebuilt Crisp AeroGlide Logo */}
        <img
          src="/icon.svg"
          alt="Logo AeroGlide 3D"
          className="w-20 h-20 sm:w-28 sm:h-28 mb-3 sm:mb-5 rounded-2xl shadow-xl"
        />

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white mb-1.5 sm:mb-2">
          AERO<span className="text-sky-400">GLIDE</span> 3D
        </h1>
        <p className="text-xs sm:text-base text-slate-300 mb-4 sm:mb-7">
          Terbang melintasi cakrawala dengan kendali sentuh &amp; tombol yang ringan dan responsif
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
