import { useState } from 'react';
import { X, Compass, Smartphone, Shuffle, Cpu, Volume2 } from 'lucide-react';
import { ENVIRONMENT_THEMES, THEME_IDS } from '../game/themes';
import type { GameSettings, GraphicsQuality, ThemeId } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onRequestGyro: () => Promise<string>;
  onCalibrate: () => void;
  onClose: () => void;
}

export function SettingsModal({
  settings,
  onChange,
  onRequestGyro,
  onCalibrate,
  onClose,
}: SettingsModalProps) {
  const [sensorStatus, setSensorStatus] = useState<string>('');

  const handleEnableSensor = async () => {
    const msg = await onRequestGyro();
    setSensorStatus(msg);
  };

  const handleCalibrate = () => {
    onCalibrate();
    setSensorStatus('Posisi tengah giroskop berhasil dikalibrasi.');
  };

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
              Atur sensor giroskop, tema lingkungan, performa, dan audio
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

          {/* Gyroscope Sensor Section */}
          <section aria-labelledby="gyro-section-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <h3 id="gyro-section-title" className="text-sm font-bold uppercase tracking-wider">
                Sensor Giroskop (Kiri &amp; Kanan)
              </h3>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div>
                <div className="text-sm font-semibold">Aktifkan Kontrol Giroskop</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Miringkan perangkat ke kiri/kanan untuk mengarahkan pesawat
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.gyroEnabled}
                onChange={(e) => onChange({ ...settings, gyroEnabled: e.target.checked })}
                className="w-5 h-5 accent-sky-600"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleEnableSensor}
                className="a11y-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{
                  backgroundColor: 'var(--ui-accent)',
                  color: 'var(--ui-accent-text)',
                }}
              >
                <Smartphone className="w-4 h-4" aria-hidden="true" />
                <span>Izinkan / Tes Sensor</span>
              </button>

              <button
                type="button"
                onClick={handleCalibrate}
                className="a11y-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border cursor-pointer"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <Compass className="w-4 h-4" aria-hidden="true" />
                <span>Kalibrasi Posisi Tengah</span>
              </button>
            </div>

            {sensorStatus && (
              <p role="status" className="text-xs font-medium px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--ui-surface-muted)' }}>
                {sensorStatus}
              </p>
            )}

            {/* Sensitivity Slider */}
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="gyro-sens-slider" className="font-semibold">
                  Sensitivitas Kemiringan
                </label>
                <span className="font-bold tabular-nums" style={{ color: 'var(--ui-accent)' }}>
                  {settings.gyroSensitivity.toFixed(2)}x
                </span>
              </div>
              <input
                id="gyro-sens-slider"
                type="range"
                min="0.5"
                max="2.5"
                step="0.05"
                value={settings.gyroSensitivity}
                onChange={(e) => onChange({ ...settings, gyroSensitivity: parseFloat(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[11px]" style={{ color: 'var(--ui-text-muted)' }}>
                <span>Halus (0.5x)</span>
                <span>Standar (1.25x)</span>
                <span>Responsif (2.5x)</span>
              </div>
            </div>

            {/* Deadzone Slider */}
            <div className="p-3 rounded-xl border space-y-2" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="gyro-deadzone-slider" className="font-semibold">
                  Zona Netral Tengah (Deadzone)
                </label>
                <span className="font-bold tabular-nums">
                  {settings.gyroDeadzone}°
                </span>
              </div>
              <input
                id="gyro-deadzone-slider"
                type="range"
                min="1"
                max="8"
                step="0.5"
                value={settings.gyroDeadzone}
                onChange={(e) => onChange({ ...settings, gyroDeadzone: parseFloat(e.target.value) })}
                className="w-full accent-sky-600 cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <span className="text-sm font-semibold">Balikkan Arah Giroskop (Invert)</span>
              <input
                type="checkbox"
                checked={settings.invertGyro}
                onChange={(e) => onChange({ ...settings, invertGyro: e.target.checked })}
                className="w-5 h-5 accent-sky-600"
              />
            </label>
          </section>

          {/* Environment Theme Section */}
          <section aria-labelledby="theme-section-title" className="space-y-3">
            <div className="flex items-center gap-2">
              <Shuffle className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
              <h3 id="theme-section-title" className="text-sm font-bold uppercase tracking-wider">
                Tema Lingkungan 3D
              </h3>
            </div>

            <label className="flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer" style={{ borderColor: 'var(--ui-border)', backgroundColor: 'var(--ui-surface)' }}>
              <div>
                <div className="text-sm font-semibold">Acak Tema Setiap Sesi Bermain</div>
                <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                  Mengubah suasana langit &amp; rintangan secara otomatis setiap kali terbang
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings.randomThemePerSession}
                onChange={(e) => onChange({ ...settings, randomThemePerSession: e.target.checked })}
                className="w-5 h-5 accent-sky-600"
              />
            </label>

            {!settings.randomThemePerSession && (
              <div className="grid grid-cols-2 gap-2">
                {THEME_IDS.map((id: ThemeId) => {
                  const t = ENVIRONMENT_THEMES[id];
                  const selected = settings.selectedTheme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onChange({ ...settings, selectedTheme: id })}
                      aria-pressed={selected}
                      className="a11y-focus text-left p-3 rounded-xl border cursor-pointer transition-colors"
                      style={{
                        backgroundColor: selected ? 'var(--ui-surface-muted)' : 'var(--ui-surface)',
                        borderColor: selected ? 'var(--ui-accent)' : 'var(--ui-border)',
                        borderWidth: selected ? '2px' : '1px',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border"
                          style={{ backgroundColor: t.uiAccentCss, borderColor: 'var(--ui-border)' }}
                        />
                        <span className="text-sm font-bold">{t.name}</span>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                        {t.subtitle}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
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
