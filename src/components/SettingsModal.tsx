import { X, Hand, Map as MapIcon, Cpu, Volume2 } from 'lucide-react';
import { CAMPAIGN_STAGES, ENVIRONMENT_THEMES } from '../game/themes';
import type { GameSettings, GraphicsQuality } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onChange,
  onClose,
}: SettingsModalProps) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
    >
      <div
        className="a11y-card w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
          <div>
            <h2 id="settings-title" className="text-xl font-extrabold">
              Pengaturan Permainan
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              Atur sensitivitas kemudi sentuh/tombol, tema lingkungan, performa, dan audio
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
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

        <div className="space-y-6 pt-5">
          {/* Pilot Callsign */}
          <div>
            <label htmlFor="pilot-name-input" className="block text-sm font-bold mb-1.5">
              Nama Pilot (Papan Peringkat)
            </label>
            <input
              id="pilot-name-input"
              type="text"
              maxLength={24}
              value={settings.pilotName}
              onChange={(e) => onChange({ ...settings, pilotName: e.target.value })}
              placeholder="Contoh: Garuda Muda"
              className="a11y-focus w-full px-3.5 py-2.5 rounded-xl border text-sm font-medium"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            />
          </div>

          {/* Touch & Keyboard Steering Section */}
          <section aria-labelledby="steering-section-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <Hand className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <h3 id="steering-section-title" className="text-sm font-bold uppercase tracking-wider">
                Kendali Kemudi (Sentuh &amp; Keyboard)
              </h3>
            </div>

            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="steer-sens-slider" className="font-semibold">
                  Sensitivitas Kemudi Kiri/Kanan
                </label>
                <span className="font-bold tabular-nums" style={{ color: 'var(--ui-accent)' }}>
                  {settings.steeringSensitivity.toFixed(2)}x
                </span>
              </div>
              <input
                id="steer-sens-slider"
                type="range"
                min="0.6"
                max="2.0"
                step="0.05"
                value={settings.steeringSensitivity}
                onChange={(e) => onChange({ ...settings, steeringSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--ui-text-muted)' }}>
                <span>Halus (0.6x)</span>
                <span>Standar (1.15x)</span>
                <span>Cepat (2.0x)</span>
              </div>
              <p className="text-xs pt-1" style={{ color: 'var(--ui-text-muted)' }}>
                Gunakan Joystick virtual &amp; tombol aksi di layar sentuh, atau gunakan WASD/Panah, Spasi (Tembak), Shift (Booster), dan Q (Perisai) pada keyboard.
              </p>
            </div>
          </section>

          {/* Campaign Zone Progression Info */}
          <section aria-labelledby="theme-section-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <MapIcon className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <h3 id="theme-section-title" className="text-sm font-bold uppercase tracking-wider">
                Alur Zona &amp; Bos Kampanye
              </h3>
            </div>

            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--ui-text-muted)' }}>
                Peta tidak dipilih manual atau acak—setiap penerbangan dimulai dari <strong>Hutan</strong> dan otomatis berlanjut ke zona berikutnya setelah misi selesai dan Bos zona dikalahkan.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                {CAMPAIGN_STAGES.map((st) => {
                  const t = ENVIRONMENT_THEMES[st.mapId];
                  return (
                    <div
                      key={st.mapId}
                      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border"
                      style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-bg-solid)' }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: t.uiAccentCss }}
                        />
                        <span className="font-bold truncate">{st.stage}. {t.name}</span>
                      </div>
                      <span className="text-[10.5px] font-semibold shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                        {st.difficultyLabel} (+{st.bossPoints}p)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Performance & Audio */}
          <section aria-labelledby="perf-audio-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <h3 id="perf-audio-title" className="text-sm font-bold uppercase tracking-wider">
                Performa &amp; Audio
              </h3>
            </div>

            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div className="text-sm font-semibold">Kualitas Grafis 3D</div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'auto', label: 'Otomatis' },
                  { id: 'light', label: 'Ringan (Hemat)' },
                  { id: 'high', label: 'Tinggi' },
                ] as Array<{ id: GraphicsQuality; label: string }>).map((opt) => {
                  const active = settings.graphicsQuality === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onChange({ ...settings, graphicsQuality: opt.id })}
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

            <div className="p-3 rounded-xl border space-y-3" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Volume2 className="w-4 h-4" aria-hidden="true" />
                <span>Pengaturan Suara</span>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="music-vol-slider">Musik Latar Dinamis</label>
                  <span className="tabular-nums font-bold">{Math.round(settings.musicVolume * 100)}%</span>
                </div>
                <input
                  id="music-vol-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.musicVolume}
                  onChange={(e) => onChange({ ...settings, musicVolume: parseFloat(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <label htmlFor="sfx-vol-slider">Efek Suara Penerbangan</label>
                  <span className="tabular-nums font-bold">{Math.round(settings.sfxVolume * 100)}%</span>
                </div>
                <input
                  id="sfx-vol-slider"
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={settings.sfxVolume}
                  onChange={(e) => onChange({ ...settings, sfxVolume: parseFloat(e.target.value) })}
                  className="w-full accent-sky-600 cursor-pointer"
                />
              </div>
            </div>
          </section>
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
            Simpan &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
