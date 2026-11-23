import { Pause, Shield, Zap, Volume2, VolumeX, Compass, Heart, Flame, Coins } from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import { PLANE_CATALOG } from '../game/planes';
import type { GameMode, HudSnapshot } from '../types/game';

interface GameHudProps {
  hud: HudSnapshot;
  mode: GameMode;
  bestScore: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onCalibrate: () => void;
  onActivateBooster: () => void;
}

export function GameHud({
  hud,
  mode,
  bestScore,
  muted,
  onPause,
  onToggleMute,
  onCalibrate,
  onActivateBooster,
}: GameHudProps) {
  const theme = ENVIRONMENT_THEMES[hud.themeId];
  const planeDef = PLANE_CATALOG[hud.planeId];
  const turboPct = hud.turboDuration > 0 ? Math.min(100, (hud.turboRemaining / hud.turboDuration) * 100) : 0;
  const steerPct = 50 + hud.steerInput * 44;

  const boosterReady = hud.hasBooster && hud.boosterActiveRemaining <= 0 && hud.boosterCooldownRemaining <= 0;
  const boosterActive = hud.boosterActiveRemaining > 0;
  const boosterCooldownPct =
    hud.boosterCooldownTotal > 0
      ? Math.max(0, Math.min(100, (1 - hud.boosterCooldownRemaining / hud.boosterCooldownTotal) * 100))
      : 100;

  return (
    <div
      aria-label="Antarmuka Penerbangan"
      className="fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 pointer-events-none"
    >
      {/* Top Perimeter Cluster */}
      <div className="flex items-start justify-between gap-2.5">
        {/* Top-Left: Score, Lives Hearts & Telemetry */}
        <div
          className="a11y-card rounded-2xl px-3.5 py-2 border shadow-md min-w-[180px]"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          {/* Lives Hearts Row */}
          {mode === 'standard' && (
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1" aria-label={`Nyawa tersisa ${hud.lives} dari ${hud.maxLives}`}>
                {Array.from({ length: hud.maxLives }).map((_, idx) => (
                  <Heart
                    key={idx}
                    className="w-4 h-4"
                    style={{
                      color: idx < hud.lives ? '#ef4444' : 'var(--ui-text-muted)',
                      fill: idx < hud.lives ? '#ef4444' : 'transparent',
                      opacity: idx < hud.lives ? 1 : 0.35,
                    }}
                    aria-hidden="true"
                  />
                ))}
              </div>
              <span className="text-[11px] font-bold inline-flex items-center gap-1 tabular-nums" style={{ color: 'var(--ui-amber)' }}>
                <Coins className="w-3 h-3" aria-hidden="true" />
                +{hud.pointsEarned}
              </span>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
              {mode === 'practice' ? 'Latihan' : planeDef.name}
            </span>
            {hud.combo > 1 && (
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                style={{
                  backgroundColor: 'var(--ui-amber)',
                  color: '#ffffff',
                }}
              >
                {hud.combo}x
              </span>
            )}
          </div>

          <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-tight">
            {hud.score.toLocaleString('id-ID')}
          </div>

          <div className="flex items-center gap-2 text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
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
            <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
              Rekor: {bestScore.toLocaleString('id-ID')}
            </div>
          )}
        </div>

        {/* Top-Center: Armor, Power-ups or Practice Guidance */}
        <div className="flex flex-col items-center gap-1.5 max-w-md">
          {mode === 'practice' && (
            <div
              role="status"
              className="a11y-card rounded-xl px-3.5 py-2 border shadow-md text-center text-xs sm:text-sm font-semibold"
              style={{
                backgroundColor: 'var(--ui-bg)',
                borderColor: 'var(--ui-accent)',
                color: 'var(--ui-text)',
              }}
            >
              {hud.practiceMessage}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {hud.armorRemaining > 0 && (
              <div
                className="a11y-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--ui-amber)',
                  borderColor: 'var(--ui-border)',
                  color: '#ffffff',
                }}
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pelindung: {hud.armorRemaining}x Aman</span>
              </div>
            )}

            {hud.hasShield && (
              <div
                className="a11y-card inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--ui-success)',
                  borderColor: 'var(--ui-border)',
                  color: '#ffffff',
                }}
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Perisai Energi</span>
              </div>
            )}

            {hud.turboRemaining > 0 && (
              <div
                className="a11y-card inline-flex items-center gap-2 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm"
                style={{
                  backgroundColor: 'var(--ui-accent)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-accent-text)',
                }}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="tabular-nums">Turbo {hud.turboRemaining.toFixed(1)}d</span>
                <div className="w-12 h-1.5 rounded-full overflow-hidden bg-black/25">
                  <div className="h-full bg-white" style={{ width: `${turboPct}%` }} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Audio, Calibrate & Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onCalibrate}
            title="Kalibrasi Posisi Tengah Giroskop"
            aria-label="Kalibrasi posisi tengah giroskop"
            className="a11y-focus a11y-card p-2 sm:px-3 sm:py-2 rounded-xl border shadow-sm cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold"
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
            className="a11y-focus a11y-card p-2 rounded-xl border shadow-sm cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Jeda permainan"
            className="a11y-focus a11y-card inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border shadow-sm cursor-pointer font-semibold text-xs sm:text-sm"
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

      {/* Bottom Perimeter: Theme Badge, Gyro Horizon Gauge & Optional Active Booster Button */}
      <div className="flex items-end justify-between gap-3">
        <div
          className="hidden sm:block text-xs font-medium px-3 py-1.5 rounded-lg border"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text-muted)',
          }}
        >
          {theme.name}
        </div>

        <div
          className="a11y-card rounded-xl px-3 py-1.5 border shadow-sm flex items-center gap-2.5"
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
            className="relative w-24 sm:w-32 h-2 rounded-full overflow-hidden"
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
          <span className="text-xs font-bold tabular-nums w-10 text-right">
            {hud.tiltAngleDeg >= 0 ? `+${Math.round(hud.tiltAngleDeg)}°` : `${Math.round(hud.tiltAngleDeg)}°`}
          </span>
        </div>

        {/* Active Booster Button (Bottom-Right Thumb Zone) */}
        {hud.hasBooster ? (
          <button
            type="button"
            disabled={!boosterReady}
            onTouchStart={(e) => {
              e.stopPropagation();
              if (boosterReady) onActivateBooster();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onActivateBooster();
            }}
            aria-label={
              boosterReady
                ? 'Aktifkan Booster Kecepatan'
                : boosterActive
                  ? 'Booster sedang aktif'
                  : 'Booster sedang mengisi ulang'
            }
            className="a11y-focus pointer-events-auto relative overflow-hidden inline-flex items-center gap-2 px-4 py-3 rounded-2xl font-extrabold text-xs sm:text-sm shadow-lg border transition-transform active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: boosterActive
                ? '#ea580c'
                : boosterReady
                  ? '#f97316'
                  : 'var(--ui-bg)',
              borderColor: boosterReady || boosterActive ? '#fdba74' : 'var(--ui-border)',
              color: boosterReady || boosterActive ? '#ffffff' : 'var(--ui-text)',
            }}
          >
            {!boosterReady && !boosterActive && (
              <div
                className="absolute left-0 top-0 bottom-0 opacity-25"
                style={{ width: `${boosterCooldownPct}%`, backgroundColor: '#f97316' }}
                aria-hidden="true"
              />
            )}
            <Flame className="w-4 h-4 sm:w-5 sm:h-5 relative z-10" aria-hidden="true" />
            <span className="relative z-10 tabular-nums">
              {boosterActive
                ? `BOOST ${hud.boosterActiveRemaining.toFixed(1)}d`
                : boosterReady
                  ? 'BOOSTER'
                  : `ISI ${hud.boosterCooldownRemaining.toFixed(0)}d`}
            </span>
          </button>
        ) : (
          <div className="hidden sm:block w-16" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
