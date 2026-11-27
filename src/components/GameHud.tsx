import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import {
  Pause,
  Shield,
  Zap,
  Volume2,
  VolumeX,
  Heart,
  Flame,
  Coins,
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

  const dpadRef = useRef<HTMLDivElement | null>(null);
  const dpadPointerIdRef = useRef<number | null>(null);

  const updateDpadFromPointer = (clientX: number, clientY: number) => {
    const el = dpadRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const halfW = Math.max(1, rect.width / 2);
    const halfH = Math.max(1, rect.height / 2);
    const nx = (clientX - cx) / halfW;
    const ny = (clientY - cy) / halfH;
    const mag = Math.hypot(nx, ny);

    const deadzone = 0.16;
    const nextLeft = mag >= deadzone && nx < -0.24;
    const nextRight = mag >= deadzone && nx > 0.24;
    const nextUp = mag >= deadzone && ny < -0.24;
    const nextDown = mag >= deadzone && ny > 0.24;

    setPressedMap((prev) => {
      if (
        prev.left === nextLeft &&
        prev.right === nextRight &&
        prev.up === nextUp &&
        prev.down === nextDown
      ) {
        return prev;
      }
      if (prev.left !== nextLeft) onControlButton('left', nextLeft);
      if (prev.right !== nextRight) onControlButton('right', nextRight);
      if (prev.up !== nextUp) onControlButton('up', nextUp);
      if (prev.down !== nextDown) onControlButton('down', nextDown);
      return {
        ...prev,
        left: nextLeft,
        right: nextRight,
        up: nextUp,
        down: nextDown,
      };
    });
  };

  const releaseDpad = () => {
    dpadPointerIdRef.current = null;
    setPressedMap((prev) => {
      if (prev.left) onControlButton('left', false);
      if (prev.right) onControlButton('right', false);
      if (prev.up) onControlButton('up', false);
      if (prev.down) onControlButton('down', false);
      return { ...prev, left: false, right: false, up: false, down: false };
    });
  };

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

      {/* Bottom Multitouch Gamepad Controls (Left Cross D-Pad + Right Nintendo Diamond) */}
      <div className="flex items-end justify-between gap-2 w-full">
        {/* LEFT THUMB: Unified Nintendo-Style Cross D-Pad (supports hold & thumb glide diagonals) */}
        <div
          ref={dpadRef}
          role="group"
          aria-label="D-Pad Arah Pesawat (Naik, Turun, Kiri, Kanan)"
          onPointerDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            dpadPointerIdRef.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore if unsupported
            }
            updateDpadFromPointer(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (dpadPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            e.stopPropagation();
            updateDpadFromPointer(e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (dpadPointerIdRef.current !== e.pointerId) return;
            e.preventDefault();
            e.stopPropagation();
            releaseDpad();
          }}
          onPointerCancel={(e) => {
            if (dpadPointerIdRef.current !== e.pointerId) return;
            e.stopPropagation();
            releaseDpad();
          }}
          onLostPointerCapture={() => {
            releaseDpad();
          }}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-auto touch-none relative w-[144px] h-[144px] sm:w-[164px] sm:h-[164px] rounded-full border flex items-center justify-center shadow-xl cursor-pointer select-none ml-0.5 mb-0.5 sm:ml-2 sm:mb-1.5"
          style={{
            backgroundColor: 'rgba(15, 23, 42, 0.36)',
            borderColor: 'rgba(255, 255, 255, 0.18)',
          }}
        >
          {/* Unified Cross (+) Body */}
          <div className="relative w-[124px] h-[124px] sm:w-[142px] sm:h-[142px] pointer-events-none">
            {/* UP Arm */}
            <div
              className="absolute top-0 left-1/3 w-1/3 h-[37%] rounded-t-xl border-2 border-b-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: pressedMap.up ? 'var(--ui-accent)' : '#1e293b',
                borderColor: pressedMap.up ? '#ffffff' : '#475569',
                color: pressedMap.up ? '#ffffff' : '#cbd5e1',
              }}
            >
              <span className="text-[11px] font-black leading-none select-none">▲</span>
            </div>

            {/* DOWN Arm */}
            <div
              className="absolute bottom-0 left-1/3 w-1/3 h-[37%] rounded-b-xl border-2 border-t-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: pressedMap.down ? 'var(--ui-accent)' : '#1e293b',
                borderColor: pressedMap.down ? '#ffffff' : '#475569',
                color: pressedMap.down ? '#ffffff' : '#cbd5e1',
              }}
            >
              <span className="text-[11px] font-black leading-none select-none">▼</span>
            </div>

            {/* LEFT Arm */}
            <div
              className="absolute left-0 top-1/3 h-1/3 w-[37%] rounded-l-xl border-2 border-r-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: pressedMap.left ? 'var(--ui-accent)' : '#1e293b',
                borderColor: pressedMap.left ? '#ffffff' : '#475569',
                color: pressedMap.left ? '#ffffff' : '#cbd5e1',
              }}
            >
              <span className="text-[11px] font-black leading-none select-none">◀</span>
            </div>

            {/* RIGHT Arm */}
            <div
              className="absolute right-0 top-1/3 h-1/3 w-[37%] rounded-r-xl border-2 border-l-0 flex items-center justify-center transition-colors"
              style={{
                backgroundColor: pressedMap.right ? 'var(--ui-accent)' : '#1e293b',
                borderColor: pressedMap.right ? '#ffffff' : '#475569',
                color: pressedMap.right ? '#ffffff' : '#cbd5e1',
              }}
            >
              <span className="text-[11px] font-black leading-none select-none">▶</span>
            </div>

            {/* Center Pivot Hub */}
            <div
              className="absolute top-1/3 left-1/3 w-1/3 h-1/3 flex items-center justify-center"
              style={{ backgroundColor: '#1e293b' }}
            >
              <div
                className="w-6 h-6 sm:w-7 sm:h-7 rounded-full border shadow-inner"
                style={{
                  backgroundColor: '#0f172a',
                  borderColor: '#475569',
                }}
              />
            </div>
          </div>
        </div>

        {/* RIGHT THUMB: Nintendo-Style Face-Button Diamond (X = BOOST top, Y = SHIELD left, A = TEMBAK right) */}
        <div
          className="relative w-[170px] h-[156px] sm:w-[194px] sm:h-[178px] mr-0.5 mb-0.5 sm:mr-2 sm:mb-1.5"
          aria-label="Tombol Aksi Tangan Kanan Bergaya Nintendo"
        >
          {/* Subtle controller cluster base halo (no backdrop-blur) */}
          <div
            className="pointer-events-none absolute inset-1 rounded-full border"
            style={{
              backgroundColor: 'rgba(15, 23, 42, 0.24)',
              borderColor: 'rgba(255, 255, 255, 0.14)',
            }}
            aria-hidden="true"
          />

          {/* X Slot (Top of Diamond): BOOSTER */}
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
            className="pointer-events-auto a11y-focus absolute top-0 left-[44%] -translate-x-1/2 overflow-hidden w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full border-[3px] flex flex-col items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95 disabled:opacity-65 disabled:cursor-not-allowed touch-none"
            style={{
              backgroundColor: boosterActive
                ? '#ea580c'
                : boosterReady
                  ? '#f97316'
                  : '#1e293b',
              borderColor: boosterReady || boosterActive ? '#fdba74' : '#475569',
              color: boosterReady || boosterActive ? '#ffffff' : '#cbd5e1',
            }}
          >
            {jetRecharging && !boosterActive && (
              <div
                className="absolute left-0 bottom-0 right-0 opacity-35"
                style={{ height: `${jetRechargePct}%`, backgroundColor: '#f97316' }}
                aria-hidden="true"
              />
            )}
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
            <span className="relative z-10 text-[9px] sm:text-[10px] font-extrabold mt-0.5 tabular-nums leading-none whitespace-nowrap">
              {boosterActive
                ? `${hud.boosterActiveRemaining.toFixed(1)}d`
                : hasJetAbility
                  ? `BOOST ${hud.jetCharges}/${hud.maxJetCharges}`
                  : 'BOOST'}
            </span>
            {jetRecharging && !boosterActive && (
              <span className="relative z-10 text-[8.5px] font-bold opacity-90 tabular-nums leading-none mt-0.5 whitespace-nowrap">
                {Math.max(0.1, hud.jetRechargeRemaining).toFixed(0)}d
              </span>
            )}
          </button>

          {/* Y Slot (Left Wing of Diamond): SHIELD */}
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
            className="pointer-events-auto a11y-focus absolute bottom-2 left-0 overflow-hidden w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-full border-[3px] flex flex-col items-center justify-center shadow-xl cursor-pointer transition-transform active:scale-95 disabled:opacity-65 disabled:cursor-not-allowed touch-none"
            style={{
              backgroundColor: shieldActive
                ? '#0d9488'
                : shieldReady
                  ? '#14b8a6'
                  : '#1e293b',
              borderColor: shieldReady || shieldActive ? '#99f6e4' : '#475569',
              color: shieldReady || shieldActive ? '#ffffff' : '#cbd5e1',
            }}
          >
            {shieldRecharging && !shieldActive && (
              <div
                className="absolute left-0 bottom-0 right-0 opacity-35"
                style={{ height: `${shieldRechargePct}%`, backgroundColor: '#14b8a6' }}
                aria-hidden="true"
              />
            )}
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 relative z-10" aria-hidden="true" />
            <span className="relative z-10 text-[9px] sm:text-[10px] font-extrabold mt-0.5 tabular-nums leading-none whitespace-nowrap">
              {shieldActive
                ? `${hud.shieldActiveRemaining.toFixed(0)}d`
                : hasShieldAbility
                  ? `SHIELD ${hud.armorRemaining}/${hud.maxArmor}`
                  : 'SHIELD'}
            </span>
            {shieldRecharging && !shieldActive && (
              <span className="relative z-10 text-[8.5px] font-bold opacity-90 tabular-nums leading-none mt-0.5 whitespace-nowrap">
                {Math.max(0.1, hud.armorRechargeRemaining).toFixed(0)}d
              </span>
            )}
          </button>

          {/* A Slot (Primary Right Wing of Diamond): TEMBAK */}
          <button
            type="button"
            aria-label="Tembak (Tahan untuk tembak terus / Spasi)"
            {...bindHoldButton('shoot')}
            className="pointer-events-auto a11y-focus absolute bottom-4 right-0 w-[78px] h-[78px] sm:w-[88px] sm:h-[88px] rounded-full border-[3px] flex flex-col items-center justify-center shadow-2xl cursor-pointer transition-transform touch-none"
            style={{
              backgroundColor: pressedMap.shoot ? '#b91c1c' : '#ef4444',
              borderColor: pressedMap.shoot ? '#ffffff' : '#fecaca',
              color: '#ffffff',
              transform: pressedMap.shoot ? 'scale(0.92)' : 'scale(1)',
            }}
          >
            <Crosshair className="w-7 h-7 sm:w-8 sm:h-8" aria-hidden="true" />
            <span className="text-[10.5px] sm:text-xs font-extrabold tracking-wider mt-0.5 leading-none">
              TEMBAK
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
