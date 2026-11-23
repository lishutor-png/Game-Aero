import { useState } from 'react';
import { Download, Smartphone, WifiOff, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={() => void install()}
        className="a11y-focus a11y-card inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-bold shadow-sm cursor-pointer transition-colors"
        style={{
          backgroundColor: 'var(--ui-accent)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-accent-text)',
        }}
      >
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Pasang di Android</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowGuide(true)}
        className="a11y-focus a11y-card inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold shadow-sm cursor-pointer transition-colors"
        style={{
          backgroundColor: 'var(--ui-surface)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <Smartphone className="w-4 h-4" aria-hidden="true" />
        <span className="hidden sm:inline">{isIOS ? 'Pasang di iOS' : 'Aplikasi Android'}</span>
      </button>

      {showGuide && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-guide-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
        >
          <div
            className="a11y-card w-full max-w-md rounded-2xl border p-6 shadow-2xl"
            style={{
              backgroundColor: 'var(--ui-bg-solid)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 id="pwa-guide-title" className="text-lg font-extrabold">
                {isIOS ? 'Pasang di iPhone / iPad' : 'Pasang sebagai Aplikasi Android'}
              </h2>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                aria-label="Tutup panduan pemasangan"
                className="a11y-focus p-1.5 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isIOS ? (
              <ol className="space-y-2 text-sm list-decimal list-inside" style={{ color: 'var(--ui-text-muted)' }}>
                <li>Buka tautan aplikasi ini di Safari.</li>
                <li>Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.</li>
                <li>Pilih <strong>Tambahkan ke Layar Utama (Add to Home Screen)</strong>.</li>
              </ol>
            ) : (
              <div className="space-y-2.5 text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                <p>
                  {isAndroid
                    ? 'Anda dapat langsung memasang AeroGlide 3D ke layar utama Android dengan mode layar penuh dan dukungan offline:'
                    : 'Buka tautan aplikasi ini di Chrome Android untuk memasangnya seperti aplikasi native (layar penuh & mode offline):'}
                </p>
                <ol className="space-y-1.5 list-decimal list-inside">
                  <li>Buka URL aplikasi di <strong>Google Chrome Android</strong> (bukan pratinjau tersemat).</li>
                  <li>Ketuk menu titik tiga (⋮) di pojok kanan atas Chrome.</li>
                  <li>Pilih <strong>Tambahkan ke Layar Utama / Instal Aplikasi</strong>.</li>
                </ol>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="a11y-focus mt-5 w-full py-2.5 rounded-xl font-bold text-sm cursor-pointer"
              style={{
                backgroundColor: 'var(--ui-accent)',
                color: 'var(--ui-accent-text)',
              }}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold shadow-lg"
      style={{
        backgroundColor: 'var(--ui-amber)',
        borderColor: 'var(--ui-border)',
        color: '#ffffff',
      }}
    >
      <WifiOff className="w-4 h-4" aria-hidden="true" />
      <span>Mode Offline — Game tetap berjalan menggunakan cache lokal</span>
    </div>
  );
}
