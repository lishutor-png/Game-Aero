import { Play, RotateCcw, Settings, Home, Compass } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onCalibrate: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  onResume,
  onRestart,
  onOpenSettings,
  onCalibrate,
  onExitToMenu,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
    >
      <div
        className="a11y-card w-full max-w-sm rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <h2 id="pause-title" className="text-2xl font-extrabold text-center mb-1">
          Permainan Dijeda
        </h2>
        <p className="text-sm text-center mb-6" style={{ color: 'var(--ui-text-muted)' }}>
          Ambil napas sejenak atau sesuaikan sensitivitas sensor.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onResume}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-base cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-accent)',
              color: 'var(--ui-accent-text)',
            }}
          >
            <Play className="w-4 h-4 fill-current" aria-hidden="true" />
            <span>Lanjutkan Terbang</span>
          </button>

          <button
            type="button"
            onClick={onCalibrate}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span>Kalibrasi Tengah Giroskop</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
            <span>Pengaturan Permainan</span>
          </button>

          <button
            type="button"
            onClick={onRestart}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Ulangi Sesi</span>
          </button>

          <button
            type="button"
            onClick={onExitToMenu}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface-muted)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <Home className="w-4 h-4" aria-hidden="true" />
            <span>Kembali ke Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
