import { X, Moon, Eye, Type, Volume2, Activity } from 'lucide-react';
import type { AccessibilitySettings, TextScale } from '../types/game';

interface AccessibilityModalProps {
  accessibility: AccessibilitySettings;
  onChange: (next: AccessibilitySettings) => void;
  onClose: () => void;
}

export function AccessibilityModal({
  accessibility,
  onChange,
  onClose,
}: AccessibilityModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="a11y-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
    >
      <div
        className="a11y-card w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
          <div>
            <h2 id="a11y-title" className="text-xl font-extrabold">
              Aksesibilitas &amp; Mode Malam
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              Sesuaikan kenyamanan visual, kontras, ukuran teks, dan pembaca layar
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan aksesibilitas"
            className="a11y-focus p-2 rounded-xl border cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 pt-5">
          {/* Dark Mode */}
          <label
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer"
            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}
          >
            <div className="flex items-start gap-3">
              <Moon className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Mode Gelap (Malam Hari)</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Mengurangi silau layar agar nyaman dimainkan di ruangan gelap
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessibility.darkMode}
              onChange={(e) => onChange({ ...accessibility, darkMode: e.target.checked })}
              className="w-5 h-5 accent-sky-600 shrink-0"
            />
          </label>

          {/* High Contrast */}
          <label
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer"
            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}
          >
            <div className="flex items-start gap-3">
              <Eye className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Mode Kontras Tinggi</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Mempertegas batas tombol, teks, serta warna rintangan 3D agar sangat jelas
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessibility.highContrast}
              onChange={(e) => onChange({ ...accessibility, highContrast: e.target.checked })}
              className="w-5 h-5 accent-sky-600 shrink-0"
            />
          </label>

          {/* Text Size */}
          <div
            className="p-3.5 rounded-xl border space-y-2.5"
            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}
          >
            <div className="flex items-center gap-2">
              <Type className="w-5 h-5" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <span className="text-sm font-bold">Penyesuaian Ukuran Teks</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'normal', label: 'Normal' },
                { id: 'large', label: 'Besar (+15%)' },
                { id: 'xlarge', label: 'Ekstra (+30%)' },
              ] as Array<{ id: TextScale; label: string }>).map((opt) => {
                const active = accessibility.textScale === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange({ ...accessibility, textScale: opt.id })}
                    aria-pressed={active}
                    className="a11y-focus py-2 px-2 rounded-lg border text-xs font-bold cursor-pointer"
                    style={{
                      backgroundColor: active ? 'var(--ui-accent)' : 'var(--ui-surface-muted)',
                      color: active ? 'var(--ui-accent-text)' : 'var(--ui-text)',
                      borderColor: 'var(--ui-border)',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Screen Reader Live Announcements */}
          <label
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer"
            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}
          >
            <div className="flex items-start gap-3">
              <Volume2 className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Dukungan Pembaca Layar (Live)</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Mengumumkan power-up, tabrakan perisai, dan hasil skor ke screen reader
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessibility.screenReaderAnnouncements}
              onChange={(e) =>
                onChange({ ...accessibility, screenReaderAnnouncements: e.target.checked })
              }
              className="w-5 h-5 accent-sky-600 shrink-0"
            />
          </label>

          {/* Reduced Motion */}
          <label
            className="flex items-center justify-between gap-3 p-3.5 rounded-xl border cursor-pointer"
            style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}
          >
            <div className="flex items-start gap-3">
              <Activity className="w-5 h-5 mt-0.5 shrink-0" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <div>
                <div className="text-sm font-bold">Kurangi Getaran &amp; Gerak Berlebih</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Menonaktifkan guncangan kamera dan osilasi pesawat
                </div>
              </div>
            </div>
            <input
              type="checkbox"
              checked={accessibility.reducedMotion}
              onChange={(e) => onChange({ ...accessibility, reducedMotion: e.target.checked })}
              className="w-5 h-5 accent-sky-600 shrink-0"
            />
          </label>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="a11y-focus px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-accent)',
              color: 'var(--ui-accent-text)',
            }}
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
}
