import { Play, RotateCcw, Settings, Home } from 'lucide-react';

interface PauseModalProps {
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onExitToMenu: () => void;
}

export function PauseModal({
  onResume,
  onRestart,
  onOpenSettings,
  onExitToMenu,
}: PauseModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)' }}
    >
      <div
        className="a11y-card my-auto w-full max-w-sm max-h-[92vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <h2 id="pause-title" className="text-xl sm:text-2xl font-extrabold text-center mb-1">
          Permainan Dijeda
        </h2>
        <p className="text-xs sm:text-sm text-center mb-4" style={{ color: 'var(--ui-text-muted)' }}>
          Ambil napas sejenak atau atur sensitivitas kemudi.
        </p>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onResume}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm sm:text-base cursor-pointer"
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
            onClick={onOpenSettings}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border cursor-pointer"
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
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border cursor-pointer"
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
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm border cursor-pointer"
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
