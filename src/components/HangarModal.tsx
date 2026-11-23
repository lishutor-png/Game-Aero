import { X, Shield, Zap, Scale, Heart, Coins, Check, ArrowUpCircle } from 'lucide-react';
import {
  BALANCE_BOOSTER_COSTS,
  BALANCE_SPEED_COSTS,
  BALANCE_STRENGTH_COSTS,
  BASE_MAX_LIVES,
  MAX_LIVES_COSTS,
  MAX_LIVES_UPGRADE_CAP,
  PLANE_CATALOG,
  PLANE_IDS,
  TITAN_STRENGTH_COSTS,
  VORTEX_BOOSTER_COSTS,
  VORTEX_SPEED_COSTS,
  computeEffectivePlaneStats,
} from '../game/planes';
import type { PlaneId, PlayerProgress, PlayerUpgrades } from '../types/game';

interface HangarModalProps {
  progress: PlayerProgress;
  onSelectPlane: (planeId: PlaneId) => void;
  onBuyMaxLife: () => void;
  onBuyUpgrade: (key: keyof PlayerUpgrades) => void;
  onClose: () => void;
}

export function HangarModal({
  progress,
  onSelectPlane,
  onBuyMaxLife,
  onBuyUpgrade,
  onClose,
}: HangarModalProps) {
  const stats = computeEffectivePlaneStats(progress);
  const currentMaxLives = BASE_MAX_LIVES + progress.maxLivesBonus;
  const canUpgradeLives = progress.maxLivesBonus < MAX_LIVES_UPGRADE_CAP;
  const nextLifeCost = canUpgradeLives ? MAX_LIVES_COSTS[progress.maxLivesBonus] : 0;

  const renderStatBar = (label: string, value: number, accent: string) => (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] font-semibold">
        <span style={{ color: 'var(--ui-text-muted)' }}>{label}</span>
        <span className="tabular-nums">{value}/10</span>
      </div>
      <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ backgroundColor: 'var(--ui-surface-muted)' }}>
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${Math.min(100, value * 10)}%`, backgroundColor: accent }}
        />
      </div>
    </div>
  );

  const renderPlaneIcon = (id: PlaneId, color: string) => {
    if (id === 'titan') return <Shield className="w-5 h-5" style={{ color }} aria-hidden="true" />;
    if (id === 'vortex') return <Zap className="w-5 h-5" style={{ color }} aria-hidden="true" />;
    return <Scale className="w-5 h-5" style={{ color }} aria-hidden="true" />;
  };

  const renderUpgradeCard = (opts: {
    keyName: keyof PlayerUpgrades;
    title: string;
    desc: string;
    level: number;
    maxLevel: number;
    costs: number[];
    accent: string;
  }) => {
    const isMax = opts.level >= opts.maxLevel;
    const cost = isMax ? 0 : opts.costs[opts.level];
    const affordable = !isMax && progress.points >= cost;

    return (
      <div
        key={opts.keyName}
        className="flex flex-col justify-between gap-2.5 p-3.5 rounded-xl border"
        style={{
          backgroundColor: 'var(--ui-surface)',
          borderColor: 'var(--ui-border)',
        }}
      >
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-extrabold">{opts.title}</span>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums"
              style={{
                backgroundColor: 'var(--ui-surface-muted)',
                color: opts.accent,
              }}
            >
              Lv.{opts.level}/{opts.maxLevel}
            </span>
          </div>
          <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
            {opts.desc}
          </p>
        </div>

        <button
          type="button"
          disabled={isMax || !affordable}
          onClick={() => onBuyUpgrade(opts.keyName)}
          className="a11y-focus w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          style={{
            backgroundColor: isMax
              ? 'var(--ui-surface-muted)'
              : affordable
                ? 'var(--ui-accent)'
                : 'var(--ui-surface-muted)',
            color: isMax || !affordable ? 'var(--ui-text)' : 'var(--ui-accent-text)',
          }}
        >
          <ArrowUpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>{isMax ? 'Level Maksimal' : `Beli (${cost} Poin)`}</span>
        </button>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hangar-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)' }}
    >
      <div
        className="a11y-card my-auto w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl border p-4 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        {/* Header */}
        <div
          className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b"
          style={{ borderColor: 'var(--ui-border)' }}
        >
          <div>
            <h2 id="hangar-title" className="text-xl font-extrabold">
              Hangar Pesawat &amp; Upgrade Poin
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              Pilih jenis pesawat dan gunakan poin hasil terbang untuk membeli nyawa maksimal serta kekuatan
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-sm font-extrabold tabular-nums"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-amber)',
                color: 'var(--ui-amber)',
              }}
            >
              <Coins className="w-4 h-4" aria-hidden="true" />
              <span>{progress.points.toLocaleString('id-ID')} Poin</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup hangar"
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
        </div>

        {/* Max Lives Upgrade Banner */}
        <div
          className="mt-4 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--ui-surface)',
            borderColor: 'var(--ui-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: BASE_MAX_LIVES + MAX_LIVES_UPGRADE_CAP }).map((_, idx) => (
                <Heart
                  key={idx}
                  className="w-5 h-5"
                  style={{
                    color: idx < currentMaxLives ? '#ef4444' : 'var(--ui-text-muted)',
                    fill: idx < currentMaxLives ? '#ef4444' : 'transparent',
                    opacity: idx < currentMaxLives ? 1 : 0.35,
                  }}
                />
              ))}
            </div>
            <div>
              <div className="text-sm font-extrabold">
                Nyawa Maksimal: {currentMaxLives} / {BASE_MAX_LIVES + MAX_LIVES_UPGRADE_CAP}
              </div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Setiap penerbangan dimulai dengan {currentMaxLives} nyawa penuh.
              </div>
            </div>
          </div>

          <button
            type="button"
            disabled={!canUpgradeLives || progress.points < nextLifeCost}
            onClick={onBuyMaxLife}
            className="a11y-focus inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor:
                canUpgradeLives && progress.points >= nextLifeCost
                  ? '#ef4444'
                  : 'var(--ui-surface-muted)',
              color:
                canUpgradeLives && progress.points >= nextLifeCost
                  ? '#ffffff'
                  : 'var(--ui-text)',
            }}
          >
            <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            <span>
              {canUpgradeLives ? `Tambah +1 Nyawa (${nextLifeCost} Poin)` : 'Nyawa Maksimal Penuh'}
            </span>
          </button>
        </div>

        {/* 3 Plane Classes */}
        <div className="mt-4">
          <h3 className="text-xs font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--ui-text-muted)' }}>
            Pilih 3 Jenis Pesawat
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {PLANE_IDS.map((id) => {
              const def = PLANE_CATALOG[id];
              const isSelected = progress.selectedPlane === id;
              const speedDisplay =
                id === 'titan'
                  ? 4
                  : id === 'vortex'
                    ? Math.min(10, 8 + progress.upgrades.vortexSpeed)
                    : Math.min(10, 6 + progress.upgrades.balanceSpeed);
              const strengthDisplay =
                id === 'titan'
                  ? Math.min(10, 8 + progress.upgrades.titanStrength)
                  : id === 'vortex'
                    ? 4
                    : Math.min(10, 5 + progress.upgrades.balanceStrength * 2);

              return (
                <div
                  key={id}
                  className="flex flex-col justify-between p-3.5 rounded-xl border transition-all"
                  style={{
                    backgroundColor: isSelected ? 'var(--ui-surface-muted)' : 'var(--ui-surface)',
                    borderColor: isSelected ? def.accentHex : 'var(--ui-border)',
                    borderWidth: isSelected ? '2px' : '1px',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        {renderPlaneIcon(id, def.accentHex)}
                        <span className="font-extrabold text-sm">{def.name}</span>
                      </div>
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                        style={{ backgroundColor: def.accentHex }}
                      >
                        {def.roleLabel}
                      </span>
                    </div>

                    <p className="text-xs leading-snug mb-2" style={{ color: 'var(--ui-text-muted)' }}>
                      {def.tagline}
                    </p>

                    <div
                      className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg mb-3 border"
                      style={{
                        backgroundColor: 'var(--ui-bg-solid)',
                        borderColor: 'var(--ui-border)',
                      }}
                    >
                      {def.perkSummary}
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {renderStatBar('Kecepatan', speedDisplay, def.accentHex)}
                      {renderStatBar('Kekuatan', strengthDisplay, def.accentHex)}
                      {renderStatBar('Kelincahan', def.baseAgilityStat, def.accentHex)}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectPlane(id)}
                    aria-pressed={isSelected}
                    className="a11y-focus w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                    style={{
                      backgroundColor: isSelected ? def.accentHex : 'var(--ui-bg-solid)',
                      color: isSelected ? '#ffffff' : 'var(--ui-text)',
                      border: isSelected ? 'none' : '1px solid var(--ui-border)',
                    }}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
                    <span>{isSelected ? 'Pesawat Dipilih' : 'Pilih Pesawat'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upgrades for Selected Plane */}
        <div className="mt-4">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
              Upgrade Khusus {PLANE_CATALOG[progress.selectedPlane].name}
            </h3>
            <span className="text-xs font-semibold" style={{ color: 'var(--ui-accent)' }}>
              Pelindung Awal: {stats.startingArmor}x Aman · {stats.hasBooster ? 'Booster Aktif' : 'Tanpa Booster'}
            </span>
          </div>

          {progress.selectedPlane === 'titan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderUpgradeCard({
                keyName: 'titanStrength',
                title: 'Upgrade Kekuatan Rangka',
                desc: `Menambah pelindung benturan aman (+1 bawaan + ${progress.upgrades.titanStrength} upgrade = ${1 + progress.upgrades.titanStrength}x tabrak gawang/rintangan aman).`,
                level: progress.upgrades.titanStrength,
                maxLevel: 2,
                costs: TITAN_STRENGTH_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              <div
                className="p-3.5 rounded-xl border flex flex-col justify-center"
                style={{ backgroundColor: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}
              >
                <div className="text-sm font-bold">Karakteristik Aegis Titan</div>
                <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                  Pesawat ini sengaja dirancang lebih lambat dan stabil agar pemain mudah bermanuver, dengan perlindungan otomatis tabrak 1 gawang aman di setiap sesi.
                </p>
              </div>
            </div>
          )}

          {progress.selectedPlane === 'vortex' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {renderUpgradeCard({
                keyName: 'vortexSpeed',
                title: 'Upgrade Mesin Kecepatan',
                desc: 'Meningkatkan kecepatan jelajah dasar dan kelincahan manuver Vortex Jet.',
                level: progress.upgrades.vortexSpeed,
                maxLevel: 3,
                costs: VORTEX_SPEED_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexBooster',
                title: 'Upgrade Tombol Booster',
                desc: 'Memperpanjang durasi Booster aktif serta mempercepat pengisian ulangnya.',
                level: progress.upgrades.vortexBooster,
                maxLevel: 3,
                costs: VORTEX_BOOSTER_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
            </div>
          )}

          {progress.selectedPlane === 'balance' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {renderUpgradeCard({
                keyName: 'balanceBooster',
                title: progress.upgrades.balanceBooster === 0 ? 'Beli Tombol Booster' : 'Upgrade Booster',
                desc:
                  progress.upgrades.balanceBooster === 0
                    ? 'Membuka tombol Booster aktif di layar terbang untuk lonjakan kecepatan.'
                    : 'Menambah durasi dan mempercepat cooldown tombol Booster.',
                level: progress.upgrades.balanceBooster,
                maxLevel: 3,
                costs: BALANCE_BOOSTER_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceStrength',
                title: 'Beli Kekuatan (Armor)',
                desc: `Memberi ${progress.upgrades.balanceStrength}x pelindung tabrak aman tanpa mengurangi nyawa per sesi.`,
                level: progress.upgrades.balanceStrength,
                maxLevel: 3,
                costs: BALANCE_STRENGTH_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceSpeed',
                title: 'Beli Kecepatan',
                desc: 'Meningkatkan kecepatan terbang dan kelincahan belok Aero Prime.',
                level: progress.upgrades.balanceSpeed,
                maxLevel: 3,
                costs: BALANCE_SPEED_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
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
