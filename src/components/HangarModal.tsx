import { X, Shield, Zap, Scale, Heart, Coins, Check, ArrowUpCircle, Star, Flame } from 'lucide-react';
import {
  BASE_LIVES_PER_PLANE,
  BALANCE_JET_COSTS,
  BALANCE_SHIELD_COSTS,
  HEART_UPGRADE_COSTS,
  LV10_AGILITY_COSTS,
  LV10_RECHARGE_COSTS,
  LV10_SPEED_COSTS,
  LV10_STRENGTH_COSTS,
  OBSTACLE_DAMAGE,
  PLANE_CATALOG,
  PLANE_IDS,
  TITAN_SHIELD_COSTS,
  VORTEX_JET_COSTS,
  computeEffectivePlaneStats,
  computePlaneStatsForId,
  getPlaneMaxLives,
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
  const selectedDef = PLANE_CATALOG[progress.selectedPlane];
  const currentMaxLives = getPlaneMaxLives(progress, progress.selectedPlane);
  const currentHeartBonus = currentMaxLives - BASE_LIVES_PER_PLANE;
  const maxHeartBonus = selectedDef.maxLives - BASE_LIVES_PER_PLANE;
  const canUpgradeLives = currentHeartBonus < maxHeartBonus;
  const nextLifeCost = canUpgradeLives ? HEART_UPGRADE_COSTS[currentHeartBonus] : 0;
  const rechargeSec = Math.round(stats.rechargeIntervalSec);

  const renderStatBar = (label: string, value: number, accent: string) => (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[11px] font-semibold">
        <span style={{ color: 'var(--ui-text-muted)' }}>{label}</span>
        <span className="tabular-nums">{value.toFixed(1).replace(/\.0$/, '')}/10</span>
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
              className="text-[11px] font-bold px-2 py-0.5 rounded-md tabular-nums shrink-0"
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

  const selectedUpgrades = progress.upgrades;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="hangar-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.78)' }}
    >
      <div
        className="a11y-card my-auto w-full max-w-5xl max-h-[92dvh] overflow-y-auto rounded-2xl border p-4 sm:p-6 shadow-2xl"
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
            <h2 id="hangar-title" className="font-display text-xl font-extrabold">
              Hangar Pesawat &amp; Upgrade Poin
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              Kekuatan, Kecepatan, Kelincahan &amp; Isi Ulang Kemampuan (30→10 detik) bisa di-upgrade hingga 10 kali per pesawat.
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

        {/* Per-Plane Max Lives Upgrade Banner */}
        <div
          className="mt-4 p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--ui-surface)',
            borderColor: 'var(--ui-border)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1" aria-hidden="true">
              {Array.from({ length: selectedDef.maxLives }).map((_, idx) => (
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
                Hati {selectedDef.name}: {currentMaxLives} / {selectedDef.maxLives}
              </div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Upgrade hati bersifat khusus per pesawat (awal {BASE_LIVES_PER_PLANE}, maks {selectedDef.maxLives} hati).
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
              {canUpgradeLives ? `Tambah +1 Hati (${nextLifeCost} Poin)` : `Hati ${selectedDef.name} Penuh`}
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
              const planeMaxLives = getPlaneMaxLives(progress, id);
              const pStats = computePlaneStatsForId(progress, id);

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

                    <div className="flex items-center justify-between text-[11px] font-bold mb-2 tabular-nums">
                      <span className="inline-flex items-center gap-1" style={{ color: '#ef4444' }}>
                        <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                        <span>{planeMaxLives}/{def.maxLives} Hati</span>
                      </span>
                      <span style={{ color: 'var(--ui-text-muted)' }}>
                        {id === 'titan'
                          ? `Pelindung: ${pStats.maxArmorCharges}/3 · ${Math.round(pStats.rechargeIntervalSec)}d`
                          : id === 'vortex'
                            ? `Jet: ${pStats.maxJetCharges}/3 · ${Math.round(pStats.rechargeIntervalSec)}d`
                            : `Pelindung ${pStats.maxArmorCharges}/1 · Jet ${pStats.maxJetCharges}/1 · ${Math.round(pStats.rechargeIntervalSec)}d`}
                      </span>
                    </div>

                    <div className="text-[11px] font-semibold mb-2 px-2.5 py-1.5 rounded-lg border tabular-nums" style={{ backgroundColor: 'var(--ui-bg-solid)', borderColor: 'var(--ui-border)' }}>
                      <div>Ketahanan/Nyawa: <strong>{pStats.maxDurabilityPerLife}</strong></div>
                      <div style={{ color: 'var(--ui-text-muted)' }}>
                        {Math.ceil(pStats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x Benda Kecil · {Math.ceil(pStats.maxDurabilityPerLife / OBSTACLE_DAMAGE.gate)}x Gawang
                      </div>
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {renderStatBar('Kekuatan', pStats.strengthRating, def.accentHex)}
                      {renderStatBar('Kecepatan', pStats.speedRating, def.accentHex)}
                      {renderStatBar('Kelincahan', pStats.agilityRating, def.accentHex)}
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
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
              Upgrade {selectedDef.name}
            </h3>
            <span className="text-xs font-semibold tabular-nums" style={{ color: 'var(--ui-accent)' }}>
              Pelindung: {stats.maxArmorCharges}x · Jet: {stats.maxJetCharges}x · Isi Ulang: {rechargeSec} detik
            </span>
          </div>

          {progress.selectedPlane === 'titan' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderUpgradeCard({
                keyName: 'titanShield',
                title: 'Kapasitas Pelindung',
                desc: `Mulai 1 pelindung, maksimal 3 (${stats.maxArmorCharges}/3), terisi ulang tiap ${rechargeSec} detik.`,
                level: selectedUpgrades.titanShield,
                maxLevel: 2,
                costs: TITAN_SHIELD_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanStrength',
                title: 'Upgrade Kekuatan',
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (maks 100 = ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil atau ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.gate)}x gawang).`,
                level: selectedUpgrades.titanStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanSpeed',
                title: 'Upgrade Kecepatan',
                desc: `Meningkatkan kecepatan jelajah Aegis Titan (${stats.speedRating.toFixed(1)}/10, maks 6.5/10).`,
                level: selectedUpgrades.titanSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanAgility',
                title: 'Upgrade Kelincahan',
                desc: `Mempermudah & mempercepat belokan pesawat (${stats.agilityRating.toFixed(1)}/10, maks 7.0/10).`,
                level: selectedUpgrades.titanAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Mempercepat pengisian ulang Pelindung dari 30 detik hingga 10 detik (saat ini ${rechargeSec} detik).`,
                level: selectedUpgrades.titanRecharge,
                maxLevel: 10,
                costs: LV10_RECHARGE_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
            </div>
          )}

          {progress.selectedPlane === 'vortex' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderUpgradeCard({
                keyName: 'vortexJet',
                title: 'Kapasitas Jet Booster',
                desc: `Mulai 1 muatan Jet, maksimal 3x Jet (${stats.maxJetCharges}/3), terisi ulang tiap ${rechargeSec} detik.`,
                level: selectedUpgrades.vortexJet,
                maxLevel: 2,
                costs: VORTEX_JET_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexSpeed',
                title: 'Upgrade Kecepatan',
                desc: `Meningkatkan kecepatan supersonik Vortex Jet (${stats.speedRating.toFixed(1)}/10, maks 10/10 tercepat).`,
                level: selectedUpgrades.vortexSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexAgility',
                title: 'Upgrade Kelincahan',
                desc: `Kelincahan manuver tertinggi & paling responsif (${stats.agilityRating.toFixed(1)}/10, maks 10/10 terlincah).`,
                level: selectedUpgrades.vortexAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexStrength',
                title: 'Upgrade Kekuatan',
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (maks 50 = ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil atau ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.gate)}x gawang).`,
                level: selectedUpgrades.vortexStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Mempercepat pengisian ulang Jet dari 30 detik hingga 10 detik (saat ini ${rechargeSec} detik).`,
                level: selectedUpgrades.vortexRecharge,
                maxLevel: 10,
                costs: LV10_RECHARGE_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
            </div>
          )}

          {progress.selectedPlane === 'balance' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {renderUpgradeCard({
                keyName: 'balanceShield',
                title: selectedUpgrades.balanceShield === 0 ? 'Beli Pelindung (0 → 1)' : 'Pelindung Aktif',
                desc: `Membuka kemampuan Pelindung (maks 1), terisi ulang tiap ${rechargeSec} detik.`,
                level: selectedUpgrades.balanceShield,
                maxLevel: 1,
                costs: BALANCE_SHIELD_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceJet',
                title: selectedUpgrades.balanceJet === 0 ? 'Beli Jet Booster (0 → 1)' : 'Jet Booster Aktif',
                desc: `Membuka tombol Jet Booster (maks 1), terisi ulang tiap ${rechargeSec} detik.`,
                level: selectedUpgrades.balanceJet,
                maxLevel: 1,
                costs: BALANCE_JET_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceStrength',
                title: 'Upgrade Kekuatan',
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (maks 75 = ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil atau ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.gate)}x gawang).`,
                level: selectedUpgrades.balanceStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceSpeed',
                title: 'Upgrade Kecepatan',
                desc: `Kecepatan jelajah seimbang (${stats.speedRating.toFixed(1)}/10, maks 8.5/10).`,
                level: selectedUpgrades.balanceSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceAgility',
                title: 'Upgrade Kelincahan',
                desc: `Kelincahan kendali seimbang (${stats.agilityRating.toFixed(1)}/10, maks 8.5/10).`,
                level: selectedUpgrades.balanceAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Mempercepat pengisian ulang Pelindung & Jet dari 30 detik hingga 10 detik (saat ini ${rechargeSec} detik).`,
                level: selectedUpgrades.balanceRecharge,
                maxLevel: 10,
                costs: LV10_RECHARGE_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
            </div>
          )}
        </div>

        {/* Item Legend */}
        <div
          className="mt-4 p-3 rounded-xl border"
          style={{ backgroundColor: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ui-text-muted)' }}>
            Rasio Kemunculan Item Unik &amp; Skor (+2 per Gawang)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 shrink-0 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span><strong>Skor (15%):</strong> +5 Skor</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 shrink-0 text-red-500 fill-red-500" aria-hidden="true" />
              <span><strong>Hati (10%):</strong> +1 Nyawa</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0 text-orange-500 fill-orange-500" aria-hidden="true" />
              <span><strong>Boost (15%):</strong> Kecepatan</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-teal-400 fill-teal-400/30" aria-hidden="true" />
              <span><strong>Perisai (15%):</strong> Tahan Hit</span>
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
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
