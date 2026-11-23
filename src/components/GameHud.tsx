import { Pause, Shield, Zap, Volume2, VolumeX, Compass } from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import type { GameMode, HudSnapshot } from '../types/game';

interface GameHudProps {
  hud: HudSnapshot;
  mode: GameMode;
  bestScore: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onCalibrate: () => void;
}

export function GameHud({
  hud,
  mode,
  bestScore,
  muted,
  onPause,
  onToggleMute,
  onCalibrate,
}: GameHudProps) {
  const theme = ENVIRONMENT_THEMES[hud.themeId];
  const turboPct = hud.turboDuration > 0 ? Math.min(100, (hud.turboRemaining / hud.turboDuration) * 100) : 0;
  const steerPct = 50 + hud.steerInput * 44;

  return (
    <div
      aria-label="Antarmuka Penerbangan"
      className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none"
    >
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between gap-3">
        {/* Top-Left: Score & Telemetry */}
        <div
          className="a11y-card rounded-2xl px-4 py-2.5 border shadow-md min-w-[168px]"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          <div className="flex items-baseline justify-between gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
              {mode === 'practice' ? 'Latihan' : 'Skor'}
            </span>
            {hud.combo > 1 && (
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md tabular-nums"
                style={{
                  backgroundColor: 'var(--ui-amber)',
                  color: '#ffffff',
                }}
              >
                {hud.combo}x Kombo
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-tight">
            {hud.score.toLocaleString('id-ID')}
          </div>
          <div className="flex items-center gap-3 text-xs mt-1 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
            <span>{hud.distance.toLocaleString('id-ID')} m</span>
            <span>·</span>
            <span>{hud.speedKmh} km/j</span>
            {mode === 'standard' && (
              <>
                <span>·</span>
                <span>Lv.{hud.difficultyLevel}</span>
              </>
            )}
          </div>
          {mode === 'standard' && bestScore > 0 && (
            <div className="text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
              Rekor: {bestScore.toLocaleString('id-ID')}
            </div>
          )}
        </div>

        {/* Top-Center: Power-ups or Practice Guidance */}
        <div className="flex flex-col items-center gap-2 max-w-md">
          {mode === 'practice' && (
            <div
              role="status"
              className="a11y-card rounded-xl px-4 py-2 border shadow-md text-center text-xs sm:text-sm font-semibold"
              style={{
                backgroundColor: 'var(--ui-bg)',
                borderColor: 'var(--ui-accent)',
                color: 'var(--ui-text)',
              }}
            >
              {hud.practiceMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2">
            {hud.hasShield && (
              <div
                className="a11y-card inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--ui-success)',
                  borderColor: 'var(--ui-border)',
                  color: '#ffffff',
                }}
              >
                <Shield className="w-4 h-4" aria-hidden="true" />
                <span>Perisai Aktif</span>
              </div>
            )}

            {hud.turboRemaining > 0 && (
              <div
                className="a11y-card inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--ui-amber)',
                  borderColor: 'var(--ui-border)',
                  color: '#ffffff',
                }}
              >
                <Zap className="w-4 h-4" aria-hidden="true" />
                <span className="tabular-nums">Turbo {hud.turboRemaining.toFixed(1)}d</span>
                <div className="w-14 h-1.5 rounded-full overflow-hidden bg-black/25">
                  <div className="h-full bg-white" style={{ width: `${turboPct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Audio, Calibrate & Pause */}
        <div className="pointer-events-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onCalibrate}
            title="Kalibrasi Posisi Tengah Giroskop"
            aria-label="Kalibrasi posisi tengah giroskop"
            className="a11y-focus a11y-card p-2.5 sm:px-3 sm:py-2.5 rounded-xl border shadow-sm cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <Compass className="w-4 h-4" aria-hidden="true" />
            <span className="hidden md:inline">Kalibrasi</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={muted}
            aria-label={muted ? 'Nyalakan suara' : 'Bisukan suara'}
            className="a11y-focus a11y-card p-2.5 rounded-xl border shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Jeda permainan"
            className="a11y-focus a11y-card inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border shadow-sm cursor-pointer font-semibold text-sm"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <Pause className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">Jeda</span>
          </button>
        </div>
      </div>

      {/* Bottom Perimeter: Minimal Left/Right Gyro Horizon Gauge */}
      <div className="flex items-end justify-between gap-4">
        <div
          className="hidden sm:block text-xs font-medium px-3 py-1 rounded-lg border"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text-muted)',
          }}
        >
          {theme.name}
        </div>

        <div
          className="a11y-card mx-auto sm:mx-0 rounded-xl px-3.5 py-2 border shadow-sm flex items-center gap-3"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--ui-text-muted)' }}>
            {hud.activeControl === 'gyro' ? 'Giroskop' : hud.activeControl === 'touch' ? 'Sentuh' : 'Keyboard'}
          </span>
          <div
            className="relative w-28 sm:w-36 h-2 rounded-full overflow-hidden"
            style={{ backgroundColor: 'var(--ui-surface-muted)' }}
            aria-hidden="true"
          >
            <div
              className="absolute top-0 bottom-0 w-0.5 left-1/2 -translate-x-1/2 opacity-40"
              style={{ backgroundColor: 'var(--ui-text)' }}
            />
            <div
              className="absolute top-0 bottom-0 w-3 rounded-full -translate-x-1/2"
              style={{
                left: `${steerPct}%`,
                backgroundColor: 'var(--ui-accent)',
              }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums w-11 text-right">
            {hud.tiltAngleDeg >= 0 ? `+${Math.round(hud.tiltAngleDeg)}°` : `${Math.round(hud.tiltAngleDeg)}°`}
          </span>
        </div>
      </div>
    </div>
  );
}
