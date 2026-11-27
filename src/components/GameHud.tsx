import { useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Pause,
  Shield,
  Zap,
  Volume2,
  VolumeX,
  Heart,
  Flame,
  Coins,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Crosshair,
  Skull,
} from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import { PLANE_CATALOG, WEAPON_CATALOG } from '../game/planes';
import type { ControlActionKey } from '../game/gyro';
import type { GameMode, HudSnapshot } from '../types/game';

interface GameHudProps {
  hud: HudSnapshot;
  mode: GameMode;
  bestScore: number;
  muted: boolean;
  onPause: () => void;
  onToggleMute: () => void;
  onActivateBooster: () => void;
  onActivateShield: () => void;
  onControlButton: (action: ControlActionKey, pressed: boolean) => void;
}

export function GameHud({
  hud,
  mode,
  bestScore,
  muted,
  onPause,
  onToggleMute,
  onActivateBooster,
  onActivateShield,
  onControlButton,
}: GameHudProps) {
  const [pressedMap, setPressedMap] = useState<Record<ControlActionKey, boolean>>({
    left: false,
    right: false,
    up: false,
    down: false,
    shoot: false,
  });

  const theme = ENVIRONMENT_THEMES[hud.themeId];
  const planeDef = PLANE_CATALOG[hud.planeId];
  const weaponDef = WEAPON_CATALOG[hud.weaponType];
  const turboPct = hud.turboDuration > 0 ? Math.min(100, (hud.turboRemaining / hud.turboDuration) * 100) : 0;

  const hasJetAbility = hud.maxJetCharges > 0;
  const boosterActive = hud.boosterActiveRemaining > 0;
  const boosterReady = hasJetAbility && hud.jetCharges > 0 && !boosterActive;
  const jetRecharging = hasJetAbility && hud.jetCharges < hud.maxJetCharges;
  const jetRechargePct =
    jetRecharging && hud.rechargeIntervalSec > 0
      ? Math.max(0, Math.min(100, (1 - hud.jetRechargeRemaining / hud.rechargeIntervalSec) * 100))
      : 100;

  const hasShieldAbility = hud.maxArmor > 0;
  const shieldActive = hud.hasShield;
  const shieldReady = hasShieldAbility && hud.armorRemaining > 0 && !shieldActive;
  const shieldRecharging = hasShieldAbility && hud.armorRemaining < hud.maxArmor;
  const shieldRechargePct =
    shieldRecharging && hud.rechargeIntervalSec > 0
      ? Math.max(0, Math.min(100, (1 - hud.armorRechargeRemaining / hud.rechargeIntervalSec) * 100))
      : 100;

  const bindHoldButton = (action: ControlActionKey) => ({
    onPointerDown: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore if unsupported
      }
      setPressedMap((prev) => ({ ...prev, [action]: true }));
      onControlButton(action, true);
    },
    onPointerUp: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setPressedMap((prev) => ({ ...prev, [action]: false }));
      onControlButton(action, false);
    },
    onPointerCancel: (e: ReactPointerEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      setPressedMap((prev) => ({ ...prev, [action]: false }));
      onControlButton(action, false);
    },
    onContextMenu: (e: ReactPointerEvent<HTMLButtonElement> | React.MouseEvent) => {
      e.preventDefault();
    },
  });

  return (
    <div
      aria-label="Antarmuka Penerbangan"
      className="fixed inset-0 z-20 flex flex-col justify-between p-2.5 sm:p-4 pointer-events-none select-none"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      {/* Top Perimeter Cluster (Never overlaps center flight path) */}
      <div className="flex items-start justify-between gap-2">
        {/* Top-Left: Score, Lives Hearts & Weapon Info */}
        <div
          className="a11y-card rounded-2xl px-3 py-2 border shadow-md min-w-[172px] max-w-[235px]"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          {mode === 'standard' && (
            <div className="mb-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-0.5" aria-label={`Nyawa tersisa ${hud.lives} dari ${hud.maxLives}`}>
                  {Array.from({ length: hud.maxLives }).map((_, idx) => (
                    <Heart
                      key={idx}
                      className="w-3.5 h-3.5 sm:w-4 sm:h-4"
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

              <div className="flex items-center gap-1.5">
                <div
                  className="flex-1 h-1.5 rounded-full overflow-hidden"
                  style={{ backgroundColor: 'var(--ui-surface-muted)' }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-150"
                    style={{
                      width: `${hud.maxDurability > 0 ? Math.min(100, (hud.durability / hud.maxDurability) * 100) : 0}%`,
                      backgroundColor: hud.durability <= 25 ? '#ef4444' : '#14b8a6',
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
                  {hud.durability}/{hud.maxDurability}
                </span>
              </div>
            </div>
          )}

          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider truncate" style={{ color: 'var(--ui-text-muted)' }}>
              {mode === 'practice' ? 'Latihan' : `${planeDef.name} Lv.${hud.modelTier}`}
            </span>
            {hud.combo > 1 && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums"
                style={{ backgroundColor: 'var(--ui-amber)', color: '#ffffff' }}
              >
                {hud.combo}x
              </span>
            )}
          </div>

          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl sm:text-2xl font-extrabold tabular-nums leading-tight">
              {hud.score.toLocaleString('id-ID')}
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
              <Skull className="w-3 h-3" aria-hidden="true" />
              {hud.enemiesDestroyed}
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] mt-0.5 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
            <span>{hud.distance.toLocaleString('id-ID')} m</span>
            <span>·</span>
            <span>{hud.speedKmh} km/j</span>
            <span>·</span>
            <span style={{ color: hud.effectiveWeaponColorCss || weaponDef.colorCss }} className="font-bold">
              {hud.effectiveWeaponName || weaponDef.shortName}
            </span>
          </div>

          {mode === 'standard' && bestScore > 0 && (
            <div className="text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
              Rekor: {bestScore.toLocaleString('id-ID')} · {theme.shortName}
            </div>
          )}
        </div>

        {/* Top-Center: Boss HP, Active Status, or Practice Guidance */}
        <div className="flex flex-col items-center gap-1.5 max-w-sm">
          {hud.bossActive && (
            <div
              className="a11y-card w-56 sm:w-72 rounded-xl px-3 py-1.5 border shadow-md"
              style={{
                backgroundColor: 'var(--ui-bg)',
                borderColor: '#ef4444',
                color: 'var(--ui-text)',
              }}
            >
              <div className="flex justify-between text-[11px] font-extrabold mb-1">
                <span className="text-red-500">{hud.bossName}</span>
                <span className="tabular-nums">{hud.bossHp}/{hud.bossMaxHp}</span>
              </div>
              <div className="h-2 w-full rounded-full overflow-hidden bg-black/30">
                <div
                  className="h-full bg-red-500 transition-all duration-100"
                  style={{ width: `${Math.max(0, Math.min(100, (hud.bossHp / hud.bossMaxHp) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {mode === 'practice' && (
            <div
              role="status"
              className="a11y-card rounded-xl px-3 py-1.5 border shadow-md text-center text-[11px] sm:text-xs font-semibold"
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
            {hud.hasShield && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm tabular-nums"
                style={{ backgroundColor: '#0d9488', borderColor: '#5eead4', color: '#ffffff' }}
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  Perisai Aktif {hud.shieldActiveRemaining > 0 ? `${hud.shieldActiveRemaining.toFixed(1)}d` : ''}
                </span>
              </div>
            )}

            {hud.turboRemaining > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm"
                style={{ backgroundColor: 'var(--ui-accent)', borderColor: 'var(--ui-border)', color: 'var(--ui-accent-text)' }}
              >
                <Zap className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="tabular-nums">Boost {hud.turboRemaining.toFixed(1)}d</span>
                <div className="w-10 h-1.5 rounded-full overflow-hidden bg-black/25">
                  <div className="h-full bg-white" style={{ width: `${turboPct}%` }} />
                </div>
              </div>
            )}

            {hud.weaponOverrideRemaining > 0 && (
              <div
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-xs font-bold shadow-sm tabular-nums"
                style={{
                  backgroundColor: hud.effectiveWeaponColorCss || '#c026d3',
                  borderColor: '#fde047',
                  color: '#ffffff',
                }}
              >
                <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {hud.effectiveWeaponName} {hud.weaponOverrideRemaining.toFixed(1)}d
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Audio & Pause */}
        <div className="pointer-events-auto flex items-center gap-1.5">
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
            {muted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <button
            type="button"
            onClick={onPause}
            aria-label="Jeda permainan"
            className="a11y-focus a11y-card inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl border shadow-sm cursor-pointer font-semibold text-xs sm:text-sm"
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

      {/* Bottom Multitouch Thumb Controls */}
      <div className="flex items-end justify-between gap-2 w-full">
        {/* LEFT THUMB: 4-Way Flight Directional Pad (58x58px touch targets with gap-2) */}
        <div
          className="pointer-events-auto touch-none grid grid-cols-3 gap-2 items-center justify-items-center"
          aria-label="Kontrol Arah Pesawat"
        >
          <div />
          <button
            type="button"
            aria-label="Naik (W / Panah Atas)"
            {...bindHoldButton('up')}
            className="a11y-focus w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.up ? 'var(--ui-accent)' : 'var(--ui-bg)',
              borderColor: pressedMap.up ? '#ffffff' : 'var(--ui-border)',
              color: pressedMap.up ? '#ffffff' : 'var(--ui-text)',
              transform: pressedMap.up ? 'scale(0.93)' : 'scale(1)',
            }}
          >
            <ArrowUp className="w-6 h-6" aria-hidden="true" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">NAIK</span>
          </button>
          <div />

          <button
            type="button"
            aria-label="Kiri (A / Panah Kiri)"
            {...bindHoldButton('left')}
            className="a11y-focus w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.left ? 'var(--ui-accent)' : 'var(--ui-bg)',
              borderColor: pressedMap.left ? '#ffffff' : 'var(--ui-border)',
              color: pressedMap.left ? '#ffffff' : 'var(--ui-text)',
              transform: pressedMap.left ? 'scale(0.93)' : 'scale(1)',
            }}
          >
            <ArrowLeft className="w-6 h-6" aria-hidden="true" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">KIRI</span>
          </button>

          <button
            type="button"
            aria-label="Turun (S / Panah Bawah)"
            {...bindHoldButton('down')}
            className="a11y-focus w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.down ? 'var(--ui-accent)' : 'var(--ui-bg)',
              borderColor: pressedMap.down ? '#ffffff' : 'var(--ui-border)',
              color: pressedMap.down ? '#ffffff' : 'var(--ui-text)',
              transform: pressedMap.down ? 'scale(0.93)' : 'scale(1)',
            }}
          >
            <ArrowDown className="w-6 h-6" aria-hidden="true" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">TURUN</span>
          </button>

          <button
            type="button"
            aria-label="Kanan (D / Panah Kanan)"
            {...bindHoldButton('right')}
            className="a11y-focus w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border-2 flex flex-col items-center justify-center shadow-lg cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.right ? 'var(--ui-accent)' : 'var(--ui-bg)',
              borderColor: pressedMap.right ? '#ffffff' : 'var(--ui-border)',
              color: pressedMap.right ? '#ffffff' : 'var(--ui-text)',
              transform: pressedMap.right ? 'scale(0.93)' : 'scale(1)',
            }}
          >
            <ArrowRight className="w-6 h-6" aria-hidden="true" />
            <span className="text-[9px] font-extrabold leading-none mt-0.5">KANAN</span>
          </button>
        </div>

        {/* RIGHT THUMB: Ergonomic L-Arc Cluster (BOOSTER above TEMBAK, SHIELD left of TEMBAK) */}
        <div
          className="grid grid-cols-2 items-end justify-items-end gap-3 sm:gap-3.5 pr-0.5 pb-0.5 sm:pr-2 sm:pb-1.5"
          aria-label="Tombol Senjata dan Kemampuan"
        >
          {/* Empty top-left slot keeps center-right flight view open and clickable */}
          <div className="pointer-events-none" aria-hidden="true" />

          {/* BOOSTER Button (Ergonomically above TEMBAK) */}
          <button
            type="button"
            disabled={!boosterReady}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (boosterReady) onActivateBooster();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label={
              boosterActive
                ? 'Booster sedang aktif'
                : boosterReady
                  ? `Aktifkan Booster (${hud.jetCharges} dari ${hud.maxJetCharges} siap)`
                  : 'Booster tidak tersedia'
            }
            className="pointer-events-auto a11y-focus relative overflow-hidden w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] md:w-[80px] md:h-[80px] rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95 disabled:opacity-65 disabled:cursor-not-allowed touch-none"
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
            {jetRecharging && !boosterActive && (
              <div
                className="absolute left-0 bottom-0 right-0 opacity-30"
                style={{ height: `${jetRechargePct}%`, backgroundColor: '#f97316' }}
                aria-hidden="true"
              />
            )}
            <Flame className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" aria-hidden="true" />
            <span className="relative z-10 text-[9.5px] sm:text-[10.5px] font-extrabold mt-0.5 tabular-nums leading-none whitespace-nowrap">
              {boosterActive
                ? `${hud.boosterActiveRemaining.toFixed(1)}d`
                : hasJetAbility
                  ? `BOOST ${hud.jetCharges}/${hud.maxJetCharges}`
                  : 'BOOST'}
            </span>
            {jetRecharging && !boosterActive && (
              <span className="relative z-10 text-[9.5px] font-bold opacity-90 tabular-nums leading-none mt-0.5 whitespace-nowrap">
                {Math.max(0.1, hud.jetRechargeRemaining).toFixed(0)}d
              </span>
            )}
          </button>

          {/* SHIELD Button (Ergonomically to the left of TEMBAK) */}
          <button
            type="button"
            disabled={!shieldReady}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (shieldReady) onActivateShield();
            }}
            onClick={(e) => {
              e.stopPropagation();
            }}
            aria-label={
              shieldActive
                ? 'Perisai sedang aktif'
                : shieldReady
                  ? `Aktifkan Perisai (${hud.armorRemaining} dari ${hud.maxArmor} siap)`
                  : 'Perisai tidak tersedia'
            }
            className="pointer-events-auto a11y-focus relative overflow-hidden w-[68px] h-[68px] sm:w-[74px] sm:h-[74px] md:w-[80px] md:h-[80px] rounded-2xl border-2 flex flex-col items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95 disabled:opacity-65 disabled:cursor-not-allowed touch-none"
            style={{
              backgroundColor: shieldActive
                ? '#0d9488'
                : shieldReady
                  ? '#14b8a6'
                  : 'var(--ui-bg)',
              borderColor: shieldReady || shieldActive ? '#99f6e4' : 'var(--ui-border)',
              color: shieldReady || shieldActive ? '#ffffff' : 'var(--ui-text)',
            }}
          >
            {shieldRecharging && !shieldActive && (
              <div
                className="absolute left-0 bottom-0 right-0 opacity-30"
                style={{ height: `${shieldRechargePct}%`, backgroundColor: '#14b8a6' }}
                aria-hidden="true"
              />
            )}
            <Shield className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" aria-hidden="true" />
            <span className="relative z-10 text-[9.5px] sm:text-[10.5px] font-extrabold mt-0.5 tabular-nums leading-none whitespace-nowrap">
              {shieldActive
                ? `${hud.shieldActiveRemaining.toFixed(0)}d`
                : hasShieldAbility
                  ? `SHIELD ${hud.armorRemaining}/${hud.maxArmor}`
                  : 'SHIELD'}
            </span>
            {shieldRecharging && !shieldActive && (
              <span className="relative z-10 text-[9.5px] font-bold opacity-90 tabular-nums leading-none mt-0.5 whitespace-nowrap">
                {Math.max(0.1, hud.armorRechargeRemaining).toFixed(0)}d
              </span>
            )}
          </button>

          {/* TEMBAK (Primary Large Combat Trigger anchored at bottom-right thumb rest) */}
          <button
            type="button"
            aria-label="Tembak (Tahan untuk tembak terus / Spasi)"
            {...bindHoldButton('shoot')}
            className="pointer-events-auto a11y-focus w-[80px] h-[80px] sm:w-[88px] sm:h-[88px] md:w-[96px] md:h-[96px] rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.shoot ? '#b91c1c' : '#ef4444',
              borderColor: pressedMap.shoot ? '#ffffff' : '#fecaca',
              color: '#ffffff',
              transform: pressedMap.shoot ? 'scale(0.92)' : 'scale(1)',
            }}
          >
            <Crosshair className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" aria-hidden="true" />
            <span className="text-[11px] sm:text-xs font-extrabold tracking-wider mt-0.5 leading-none">TEMBAK</span>
          </button>
        </div>
      </div>
    </div>
  );
}
