import {
  X,
  Shield,
  Zap,
  Scale,
  Heart,
  Coins,
  Check,
  ArrowUpCircle,
  Star,
  Flame,
  Crosshair,
  Sparkles,
} from 'lucide-react';
import {
  BASE_LIVES_PER_PLANE,
  BALANCE_JET_COSTS,
  BALANCE_SHIELD_COSTS,
  HEART_UPGRADE_COSTS,
  LV10_AGILITY_COSTS,
  LV10_RECHARGE_COSTS,
  LV10_SPEED_COSTS,
  LV10_STRENGTH_COSTS,
  MODEL_TIER_CATALOG,
  OBSTACLE_DAMAGE,
  PLANE_CATALOG,
  PLANE_IDS,
  TITAN_SHIELD_COSTS,
  VORTEX_JET_COSTS,
  WEAPON_CATALOG,
  WEAPON_IDS,
  computeEffectivePlaneStats,
  computePlaneStatsForId,
  getDisplayWeaponLabel,
  getPlaneMaxLives,
  getPlaneModelTier,
} from '../game/planes';
import type { PlaneId, PlaneModelTier, PlayerProgress, PlayerUpgrades, WeaponType } from '../types/game';

interface HangarModalProps {
  progress: PlayerProgress;
  onSelectPlane: (planeId: PlaneId) => void;
  onBuyMaxLife: () => void;
  onBuyUpgrade: (key: keyof PlayerUpgrades) => void;
  onUpgradeModelTier: () => void;
  onSelectOrBuyWeapon: (weaponId: WeaponType) => void;
  onClose: () => void;
}

export function HangarModal({
  progress,
  onSelectPlane,
  onBuyMaxLife,
  onBuyUpgrade,
  onUpgradeModelTier,
  onSelectOrBuyWeapon,
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

  const currentTier = getPlaneModelTier(progress, progress.selectedPlane);
  const currentTierDef = MODEL_TIER_CATALOG[currentTier];
  const nextTier = (currentTier < 4 ? currentTier + 1 : 4) as PlaneModelTier;
  const nextTierDef = MODEL_TIER_CATALOG[nextTier];
  const canUpgradeTier = currentTier < 4;

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
              Hangar Pesawat, Evolusi &amp; Arsenal Senjata
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              Evolusi model Lv.1–Lv.4, beli 5 senjata tempur, serta tingkatkan kekuatan, kecepatan, kelincahan, &amp; isi ulang.
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

        {/* Plane Visual Model Evolution (Level 1 -> Level 4) + Per-Plane Max Lives */}
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* Model Evolution Card */}
          <div
            className="p-3.5 rounded-xl border flex flex-col justify-between gap-3"
            style={{ backgroundColor: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="inline-flex items-center gap-1.5 text-sm font-extrabold">
                  <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
                  <span>{currentTierDef.name}</span>
                </div>
                <p className="text-xs mt-1 leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
                  {currentTierDef.subtitle}
                </p>
              </div>
              <span
                className="text-xs font-extrabold px-2 py-1 rounded-lg tabular-nums shrink-0"
                style={{ backgroundColor: 'var(--ui-surface-muted)', color: selectedDef.accentHex }}
              >
                Tier {currentTier}/4
              </span>
            </div>

            <button
              type="button"
              disabled={!canUpgradeTier || progress.points < nextTierDef.upgradeCost}
              onClick={onUpgradeModelTier}
              className="a11y-focus w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor:
                  canUpgradeTier && progress.points >= nextTierDef.upgradeCost
                    ? 'var(--ui-amber)'
                    : 'var(--ui-surface-muted)',
                color:
                  canUpgradeTier && progress.points >= nextTierDef.upgradeCost
                    ? '#ffffff'
                    : 'var(--ui-text)',
              }}
            >
              <ArrowUpCircle className="w-4 h-4" aria-hidden="true" />
              <span>
                {canUpgradeTier
                  ? `Evolusi ke ${nextTierDef.name} (${nextTierDef.upgradeCost} Poin)`
                  : 'Bentuk Legendary Maksimal'}
              </span>
            </button>
          </div>

          {/* Per-Plane Max Lives Card */}
          <div
            className="p-3.5 rounded-xl border flex flex-col justify-between gap-3"
            style={{ backgroundColor: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}
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
                  Upgrade hati khusus per pesawat (awal {BASE_LIVES_PER_PLANE}, maks {selectedDef.maxLives}).
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canUpgradeLives || progress.points < nextLifeCost}
              onClick={onBuyMaxLife}
              className="a11y-focus w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        </div>

        {/* Weapon Arsenal */}
        <div className="mt-4">
          <div className="flex items-center gap-2 mb-2.5">
            <Crosshair className="w-4 h-4" style={{ color: 'var(--ui-accent)' }} aria-hidden="true" />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--ui-text-muted)' }}>
              Arsenal Senjata Pesawat
            </h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {WEAPON_IDS.map((wid) => {
              const w = WEAPON_CATALOG[wid];
              const unlocked = progress.unlockedWeapons.includes(wid);
              const equipped = progress.selectedWeapon === wid;
              const affordable = progress.points >= w.cost;
              const display = getDisplayWeaponLabel(progress.selectedPlane, wid);

              return (
                <div
                  key={wid}
                  className="flex flex-col justify-between p-3 rounded-xl border"
                  style={{
                    backgroundColor: equipped ? 'var(--ui-surface-muted)' : 'var(--ui-surface)',
                    borderColor: equipped ? display.colorCss : 'var(--ui-border)',
                    borderWidth: equipped ? '2px' : '1px',
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-extrabold" style={{ color: display.colorCss }}>
                        {wid === 'signature' ? display.name : w.name}
                      </span>
                      <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: 'var(--ui-text-muted)' }}>
                        {wid === 'signature' ? 'KHUSUS' : `${w.boltCount}x DMG ${w.damagePerBolt}`}
                      </span>
                    </div>
                    <p className="text-[11px] mt-1 leading-snug" style={{ color: 'var(--ui-text-muted)' }}>
                      {w.description}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!unlocked && !affordable}
                    onClick={() => onSelectOrBuyWeapon(wid)}
                    className="a11y-focus mt-2.5 w-full px-2.5 py-2 rounded-lg text-[11px] font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      backgroundColor: equipped
                        ? display.colorCss
                        : unlocked
                          ? 'var(--ui-bg-solid)'
                          : affordable
                            ? 'var(--ui-accent)'
                            : 'var(--ui-surface-muted)',
                      color: equipped || (!unlocked && affordable) ? '#ffffff' : 'var(--ui-text)',
                      border: unlocked && !equipped ? '1px solid var(--ui-border)' : 'none',
                    }}
                  >
                    {equipped ? 'Dipakai' : unlocked ? 'Pakai Senjata' : `Beli (${w.cost} Poin)`}
                  </button>
                </div>
              );
            })}
          </div>
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
                        <span>{planeMaxLives}/{def.maxLives} Hati · Lv.{pStats.modelTier}</span>
                      </span>
                      <span style={{ color: 'var(--ui-text-muted)' }}>
                        {id === 'titan'
                          ? `Pelindung: ${pStats.maxArmorCharges}/3 · ${Math.round(pStats.rechargeIntervalSec)}d`
                          : id === 'vortex'
                            ? `Jet: ${pStats.maxJetCharges}/3 · ${Math.round(pStats.rechargeIntervalSec)}d`
                            : `Pelindung ${pStats.maxArmorCharges}/1 · Jet ${pStats.maxJetCharges}/1`}
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
              Upgrade Atribut {selectedDef.name}
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
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil atau ${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.gate)}x gawang).`,
                level: selectedUpgrades.titanStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanSpeed',
                title: 'Upgrade Kecepatan',
                desc: `Kecepatan jelajah Aegis Titan (${stats.speedRating.toFixed(1)}/10).`,
                level: selectedUpgrades.titanSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanAgility',
                title: 'Upgrade Kelincahan',
                desc: `Kelincahan manuver (${stats.agilityRating.toFixed(1)}/10).`,
                level: selectedUpgrades.titanAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.titan.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'titanRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Percepat isi ulang Pelindung dari 30s → 10s (saat ini ${rechargeSec}d).`,
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
                desc: `Kecepatan supersonik Vortex Jet (${stats.speedRating.toFixed(1)}/10).`,
                level: selectedUpgrades.vortexSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexAgility',
                title: 'Upgrade Kelincahan',
                desc: `Kelincahan manuver tertinggi (${stats.agilityRating.toFixed(1)}/10).`,
                level: selectedUpgrades.vortexAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexStrength',
                title: 'Upgrade Kekuatan',
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil).`,
                level: selectedUpgrades.vortexStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.vortex.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'vortexRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Percepat isi ulang Jet dari 30s → 10s (saat ini ${rechargeSec}d).`,
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
                desc: `Membuka kemampuan Perisai (maks 1), terisi ulang tiap ${rechargeSec} detik.`,
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
                desc: `Ketahanan ${stats.maxDurabilityPerLife}/nyawa (${Math.ceil(stats.maxDurabilityPerLife / OBSTACLE_DAMAGE.small)}x benda kecil).`,
                level: selectedUpgrades.balanceStrength,
                maxLevel: 10,
                costs: LV10_STRENGTH_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceSpeed',
                title: 'Upgrade Kecepatan',
                desc: `Kecepatan jelajah seimbang (${stats.speedRating.toFixed(1)}/10).`,
                level: selectedUpgrades.balanceSpeed,
                maxLevel: 10,
                costs: LV10_SPEED_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceAgility',
                title: 'Upgrade Kelincahan',
                desc: `Kelincahan kendali seimbang (${stats.agilityRating.toFixed(1)}/10).`,
                level: selectedUpgrades.balanceAgility,
                maxLevel: 10,
                costs: LV10_AGILITY_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
              {renderUpgradeCard({
                keyName: 'balanceRecharge',
                title: 'Isi Ulang Kemampuan',
                desc: `Percepat isi ulang Pelindung & Jet dari 30s → 10s (saat ini ${rechargeSec}d).`,
                level: selectedUpgrades.balanceRecharge,
                maxLevel: 10,
                costs: LV10_RECHARGE_COSTS,
                accent: PLANE_CATALOG.balance.accentHex,
              })}
            </div>
          )}
        </div>

        {/* Item Drop Rate Legend */}
        <div
          className="mt-4 p-3 rounded-xl border"
          style={{ backgroundColor: 'var(--ui-surface)', borderColor: 'var(--ui-border)' }}
        >
          <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--ui-text-muted)' }}>
            Rasio Item &amp; Perolehan Poin (+1/10m · +6 Gerbang · +8..+35 Musuh · 15% Skor + Bonus Bos 35..400 Poin)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 shrink-0 text-red-500 fill-red-500" aria-hidden="true" />
              <span><strong>Hati (2%):</strong> +1 Nyawa</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 shrink-0 text-teal-400 fill-teal-400/30" aria-hidden="true" />
              <span><strong>Perisai (5%):</strong> Tahan Hit</span>
            </div>
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 shrink-0 text-orange-500 fill-orange-500" aria-hidden="true" />
              <span><strong>Booster (5%):</strong> Kecepatan</span>
            </div>
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 shrink-0 text-amber-400 fill-amber-400" aria-hidden="true" />
              <span><strong>Skor (10%):</strong> +15 Skor</span>
            </div>
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 shrink-0 text-fuchsia-400" aria-hidden="true" />
              <span><strong>Senjata (8%):</strong> Ganti Mode</span>
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
