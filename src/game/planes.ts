import type {
  EffectivePlaneStats,
  PlaneId,
  PlaneModelTier,
  PlayerProgress,
  WeaponType,
} from '../types/game';

export interface PlaneDefinition {
  id: PlaneId;
  name: string;
  roleLabel: string;
  tagline: string;
  perkSummary: string;
  accentHex: string;
  baseLives: number;
  maxLives: number;
}

export interface WeaponDefinition {
  id: WeaponType;
  name: string;
  shortName: string;
  cost: number;
  fireIntervalSec: number;
  damagePerBolt: number;
  projectileSpeed: number;
  boltCount: number;
  colorHex: number;
  colorCss: string;
  description: string;
}

export interface ModelTierDefinition {
  tier: PlaneModelTier;
  name: string;
  subtitle: string;
  upgradeCost: number; // cost to reach this tier from previous (0 for Tier 1)
  bonusDurability: number;
  bonusSpeed: number;
  bonusAgility: number;
}

export const BASE_LIVES_PER_PLANE = 2;
export const BASE_RECHARGE_SECONDS = 30.0;
export const MIN_RECHARGE_SECONDS = 10.0;

// Nilai pengurangan kekuatan per tabrakan objek pada setiap nyawa:
// Patokan Aegis Titan kekuatan penuh = 100 -> 4x benda kecil (25) atau 2x gawang (50) baru berkurang 1 nyawa.
export const OBSTACLE_DAMAGE = {
  small: 25, // Pilar / Benda Kecil / Asteroid / Batu / Proyektil Musuh
  turbine: 35, // Turbin / Drone / Kapal Musuh
  gate: 50, // Tiang Gawang / Gedung / Boss
} as const;

export const PLANE_CATALOG: Record<PlaneId, PlaneDefinition> = {
  titan: {
    id: 'titan',
    name: 'Aegis Titan',
    roleLabel: 'Fokus Kekuatan',
    tagline: 'Terkuat: di Lv.10 tahan hingga 4x benda kecil atau 2x gawang per nyawa.',
    perkSummary: 'Mulai 1 Pelindung (maks 3), isi ulang 30→10 detik. Kekuatan 60→100/nyawa.',
    accentHex: '#0d9488',
    baseLives: BASE_LIVES_PER_PLANE,
    maxLives: 6,
  },
  vortex: {
    id: 'vortex',
    name: 'Vortex Jet',
    roleLabel: 'Fokus Kecepatan & Lincah',
    tagline: 'Tercepat & terlincah: bermanuver tajam menghindari rintangan.',
    perkSummary: 'Mulai 1 Jet Booster (maks 3x Jet), isi ulang 30→10 detik. Kekuatan 25→50/nyawa.',
    accentHex: '#ea580c',
    baseLives: BASE_LIVES_PER_PLANE,
    maxLives: 4,
  },
  balance: {
    id: 'balance',
    name: 'Aero Prime',
    roleLabel: 'Fokus Keseimbangan',
    tagline: 'Seimbang dalam kekuatan, kecepatan, kelincahan, serta akses Pelindung + Jet.',
    perkSummary: 'Mulai 0 Jet & 0 Pelindung (maks 1 tiap jenis), isi ulang 30→10 detik. Kekuatan 45→75/nyawa.',
    accentHex: '#0284c7',
    baseLives: BASE_LIVES_PER_PLANE,
    maxLives: 5,
  },
};

export const PLANE_IDS: PlaneId[] = ['titan', 'vortex', 'balance'];

export const WEAPON_CATALOG: Record<WeaponType, WeaponDefinition> = {
  signature: {
    id: 'signature',
    name: 'Senjata Khusus Pesawat',
    shortName: 'Khusus',
    cost: 0,
    fireIntervalSec: 0.24,
    damagePerBolt: 18,
    projectileSpeed: 195,
    boltCount: 3,
    colorHex: 0x10b981,
    colorCss: '#059669',
    description: 'Aegis Titan: Menyebar (Spread) · Vortex Jet: Burst Fire 3x · Aero Prime: Auto Lock pelacak.',
  },
  single: {
    id: 'single',
    name: 'Single Shot',
    shortName: 'Single',
    cost: 0,
    fireIntervalSec: 0.18,
    damagePerBolt: 20,
    projectileSpeed: 190,
    boltCount: 1,
    colorHex: 0x0ea5e9,
    colorCss: '#0284c7',
    description: 'Tembakan plasma tunggal cepat dan akurat dari moncong pesawat.',
  },
  rapid: {
    id: 'rapid',
    name: 'Tembakan Cepat (Rapid)',
    shortName: 'Rapid',
    cost: 140,
    fireIntervalSec: 0.09,
    damagePerBolt: 14,
    projectileSpeed: 215,
    boltCount: 2,
    colorHex: 0xfacc15,
    colorCss: '#ca8a04',
    description: 'Senapan beruntun super cepat dengan laju tembak ganda untuk menghancurkan target.',
  },
  double: {
    id: 'double',
    name: 'Double Shot',
    shortName: 'Double',
    cost: 190,
    fireIntervalSec: 0.19,
    damagePerBolt: 18,
    projectileSpeed: 195,
    boltCount: 2,
    colorHex: 0x14b8a6,
    colorCss: '#0d9488',
    description: 'Meriam sayap kembar dengan dua proyektil sejajar berenergi tinggi.',
  },
  triple: {
    id: 'triple',
    name: 'Triple Shot',
    shortName: 'Triple',
    cost: 340,
    fireIntervalSec: 0.22,
    damagePerBolt: 16,
    projectileSpeed: 200,
    boltCount: 3,
    colorHex: 0xf59e0b,
    colorCss: '#d97706',
    description: 'Tiga peluru serentak (lurus & sudut kiri/kanan) untuk area luas.',
  },
  burst: {
    id: 'burst',
    name: 'Burst Fire (3-Ronde)',
    shortName: 'Burst',
    cost: 460,
    fireIntervalSec: 0.34,
    damagePerBolt: 16,
    projectileSpeed: 220,
    boltCount: 6,
    colorHex: 0x06b6d4,
    colorCss: '#0891b2',
    description: 'Menembakkan 3 rentetan peluru ganda berkecepatan tinggi secara beruntun.',
  },
  spread: {
    id: 'spread',
    name: 'Tembakan Menyebar',
    shortName: 'Spread',
    cost: 580,
    fireIntervalSec: 0.28,
    damagePerBolt: 16,
    projectileSpeed: 185,
    boltCount: 5,
    colorHex: 0xf97316,
    colorCss: '#ea580c',
    description: 'Semburan 5 proyektil kipas lebar untuk menyapu gelombang musuh & rintangan.',
  },
  autolock: {
    id: 'autolock',
    name: 'Auto Lock Pelacak',
    shortName: 'AutoLock',
    cost: 760,
    fireIntervalSec: 0.24,
    damagePerBolt: 22,
    projectileSpeed: 195,
    boltCount: 2,
    colorHex: 0x22c55e,
    colorCss: '#16a34a',
    description: 'Peluru pintar yang otomatis mengunci dan mengejar musuh di depan pesawat.',
  },
  laser: {
    id: 'laser',
    name: 'Laser Shot',
    shortName: 'Laser',
    cost: 960,
    fireIntervalSec: 0.23,
    damagePerBolt: 42,
    projectileSpeed: 260,
    boltCount: 2,
    colorHex: 0xd946ef,
    colorCss: '#c026d3',
    description: 'Sinar laser supersonik berwarna magenta yang menembus pertahanan kapal & boss.',
  },
};

export const WEAPON_IDS: WeaponType[] = [
  'signature',
  'rapid',
  'double',
  'triple',
  'burst',
  'spread',
  'autolock',
  'laser',
  'single',
];

export const IN_FLIGHT_WEAPON_POOL: Array<Exclude<WeaponType, 'signature'>> = [
  'rapid',
  'spread',
  'burst',
  'autolock',
  'triple',
  'laser',
];

export function resolveEffectiveWeapon(
  planeId: PlaneId,
  weaponType: WeaponType,
): Exclude<WeaponType, 'signature'> {
  if (weaponType !== 'signature') return weaponType;
  if (planeId === 'titan') return 'spread';
  if (planeId === 'vortex') return 'burst';
  return 'autolock';
}

export function getDisplayWeaponLabel(
  planeId: PlaneId,
  weaponType: WeaponType,
): { name: string; shortName: string; colorCss: string } {
  if (weaponType === 'signature') {
    if (planeId === 'titan') {
      return { name: 'Khas Titan: Menyebar', shortName: 'Titan Spread', colorCss: '#ea580c' };
    }
    if (planeId === 'vortex') {
      return { name: 'Khas Vortex: Burst Fire', shortName: 'Vortex Burst', colorCss: '#0891b2' };
    }
    return { name: 'Khas Aero: Auto Lock', shortName: 'Aero Lock', colorCss: '#16a34a' };
  }
  const def = WEAPON_CATALOG[weaponType];
  return { name: def.name, shortName: def.shortName, colorCss: def.colorCss };
}

export const MODEL_TIER_CATALOG: Record<PlaneModelTier, ModelTierDefinition> = {
  1: {
    tier: 1,
    name: 'LEVEL 1 – Basic Fighter',
    subtitle: 'Pesawat standar modern dengan mesin jet tunggal & sayap ringkas.',
    upgradeCost: 0,
    bonusDurability: 0,
    bonusSpeed: 0,
    bonusAgility: 0,
  },
  2: {
    tier: 2,
    name: 'LEVEL 2 – Advanced Fighter',
    subtitle: 'Sayap lebih lebar, intake udara ekstra, sirip canard & mesin lebih kuat.',
    upgradeCost: 220,
    bonusDurability: 5,
    bonusSpeed: 0.04,
    bonusAgility: 0.04,
  },
  3: {
    tier: 3,
    name: 'LEVEL 3 – Elite Fighter',
    subtitle: 'Desain futuristik, dua mesin jet kembar, meriam sayap & pendar cahaya.',
    upgradeCost: 520,
    bonusDurability: 10,
    bonusSpeed: 0.08,
    bonusAgility: 0.08,
  },
  4: {
    tier: 4,
    name: 'LEVEL 4 – Legendary Fighter',
    subtitle: 'Rangka tempur premium, sayap multi-bilah, halo energi & dual-afterburner eksklusif.',
    upgradeCost: 940,
    bonusDurability: 15,
    bonusSpeed: 0.12,
    bonusAgility: 0.12,
  },
};

// Per-plane Hearts
export const HEART_UPGRADE_COSTS = [120, 240, 420, 650]; // 2->3, 3->4, 4->5, 5->6

// Ability capacity unlocks (fixed per-plane rules)
export const TITAN_SHIELD_COSTS = [200, 440]; // 1->2->3 Pelindung
export const VORTEX_JET_COSTS = [200, 440]; // 1->2->3 Jet
export const BALANCE_SHIELD_COSTS = [260]; // 0->1 Pelindung
export const BALANCE_JET_COSTS = [260]; // 0->1 Jet

// Level 1..10 challenging progression curves
export const LV10_STRENGTH_COSTS = [70, 125, 190, 270, 365, 475, 605, 755, 925, 1140];
export const LV10_SPEED_COSTS = [70, 120, 185, 260, 350, 460, 590, 740, 910, 1120];
export const LV10_AGILITY_COSTS = [60, 110, 170, 240, 325, 425, 545, 685, 845, 1040];
export const LV10_RECHARGE_COSTS = [80, 140, 210, 295, 395, 510, 645, 800, 980, 1200];

export const DEFAULT_PROGRESS: PlayerProgress = {
  points: 0,
  selectedPlane: 'balance',
  heartsBonus: {
    titan: 0,
    vortex: 0,
    balance: 0,
  },
  planeTiers: {
    titan: 1,
    vortex: 1,
    balance: 1,
  },
  selectedWeapon: 'signature',
  unlockedWeapons: ['signature', 'single'],
  upgrades: {
    titanShield: 0,
    titanStrength: 0,
    titanSpeed: 0,
    titanAgility: 0,
    titanRecharge: 0,
    vortexJet: 0,
    vortexStrength: 0,
    vortexSpeed: 0,
    vortexAgility: 0,
    vortexRecharge: 0,
    balanceShield: 0,
    balanceJet: 0,
    balanceStrength: 0,
    balanceSpeed: 0,
    balanceAgility: 0,
    balanceRecharge: 0,
  },
};

function clampLv(val: number | undefined, max: number): number {
  return Math.min(max, Math.max(0, Number.isFinite(val) ? Number(val) : 0));
}

export function clampModelTier(val: number | undefined): PlaneModelTier {
  const n = Math.round(Number.isFinite(val) ? Number(val) : 1);
  if (n >= 4) return 4;
  if (n === 3) return 3;
  if (n === 2) return 2;
  return 1;
}

export function computeRechargeSeconds(rechargeLevel: number | undefined): number {
  const lv = clampLv(rechargeLevel, 10);
  // Lv.0 = 30s -> Lv.10 = 10s (-2s per level)
  return Math.max(MIN_RECHARGE_SECONDS, BASE_RECHARGE_SECONDS - lv * 2.0);
}

export function getPlaneMaxLives(progress: PlayerProgress, planeId: PlaneId): number {
  const def = PLANE_CATALOG[planeId];
  const maxBonus = def.maxLives - BASE_LIVES_PER_PLANE;
  const bonus = clampLv(progress.heartsBonus?.[planeId], maxBonus);
  return BASE_LIVES_PER_PLANE + bonus;
}

export function getPlaneModelTier(progress: PlayerProgress, planeId: PlaneId): PlaneModelTier {
  return clampModelTier(progress.planeTiers?.[planeId]);
}

export function computePlaneStatsForId(progress: PlayerProgress, planeId: PlaneId): EffectivePlaneStats {
  const def = PLANE_CATALOG[planeId];
  const maxLives = getPlaneMaxLives(progress, planeId);
  const modelTier = getPlaneModelTier(progress, planeId);
  const tierDef = MODEL_TIER_CATALOG[modelTier];
  const weaponType: WeaponType = progress.selectedWeapon || 'signature';
  const up = progress.upgrades;

  if (planeId === 'titan') {
    const str = clampLv(up.titanStrength, 10);
    const spd = clampLv(up.titanSpeed, 10);
    const agi = clampLv(up.titanAgility, 10);
    const rch = clampLv(up.titanRecharge, 10);

    // Kekuatan per nyawa: Lv.0 = 60 -> Lv.10 = 100 (4x benda kecil @25, 2x gawang @50) + tier bonus
    const maxDurabilityPerLife = 60 + str * 4 + tierDef.bonusDurability;

    return {
      planeId,
      name: def.name,
      roleLabel: def.roleLabel,
      modelTier,
      weaponType,
      maxLives,
      maxArmorCharges: 1 + clampLv(up.titanShield, 2), // 1..3 Pelindung
      maxJetCharges: 0,
      rechargeIntervalSec: computeRechargeSeconds(rch),
      speedMultiplier: 0.76 + spd * 0.03 + tierDef.bonusSpeed,
      lateralAgility: 0.84 + agi * 0.032 + tierDef.bonusAgility,
      boosterDuration: 0,
      maxDurabilityPerLife,
      strengthRating: Math.min(10, Number((maxDurabilityPerLife / 10).toFixed(1))),
      speedRating: Math.min(10, Number((3.5 + spd * 0.3 + (modelTier - 1) * 0.15).toFixed(1))),
      agilityRating: Math.min(10, Number((4.0 + agi * 0.3 + (modelTier - 1) * 0.15).toFixed(1))),
    };
  }

  if (planeId === 'vortex') {
    const str = clampLv(up.vortexStrength, 10);
    const spd = clampLv(up.vortexSpeed, 10);
    const agi = clampLv(up.vortexAgility, 10);
    const rch = clampLv(up.vortexRecharge, 10);

    const maxDurabilityPerLife = Math.round(25 + str * 2.5) + Math.round(tierDef.bonusDurability * 0.6);

    return {
      planeId,
      name: def.name,
      roleLabel: def.roleLabel,
      modelTier,
      weaponType,
      maxLives,
      maxArmorCharges: 0,
      maxJetCharges: 1 + clampLv(up.vortexJet, 2), // 1..3 Jet
      rechargeIntervalSec: computeRechargeSeconds(rch),
      speedMultiplier: 1.12 + spd * 0.044 + tierDef.bonusSpeed,
      lateralAgility: 1.15 + agi * 0.048 + tierDef.bonusAgility,
      boosterDuration: 2.6 + spd * 0.14,
      maxDurabilityPerLife,
      strengthRating: Math.min(10, Number((maxDurabilityPerLife / 10).toFixed(1))),
      speedRating: Math.min(10, Number((7.5 + spd * 0.25).toFixed(1))),
      agilityRating: Math.min(10, Number((7.5 + agi * 0.25).toFixed(1))),
    };
  }

  // Aero Prime (balance)
  const str = clampLv(up.balanceStrength, 10);
  const spd = clampLv(up.balanceSpeed, 10);
  const agi = clampLv(up.balanceAgility, 10);
  const rch = clampLv(up.balanceRecharge, 10);
  const maxDurabilityPerLife = 45 + str * 3 + Math.round(tierDef.bonusDurability * 0.8);

  return {
    planeId: 'balance',
    name: def.name,
    roleLabel: def.roleLabel,
    modelTier,
    weaponType,
    maxLives,
    maxArmorCharges: clampLv(up.balanceShield, 1),
    maxJetCharges: clampLv(up.balanceJet, 1),
    rechargeIntervalSec: computeRechargeSeconds(rch),
    speedMultiplier: 0.94 + spd * 0.034 + tierDef.bonusSpeed,
    lateralAgility: 0.98 + agi * 0.036 + tierDef.bonusAgility,
    boosterDuration: 2.3 + spd * 0.1,
    maxDurabilityPerLife,
    strengthRating: Math.min(10, Number((maxDurabilityPerLife / 10).toFixed(1))),
    speedRating: Math.min(10, Number((5.5 + spd * 0.3 + (modelTier - 1) * 0.1).toFixed(1))),
    agilityRating: Math.min(10, Number((5.5 + agi * 0.3 + (modelTier - 1) * 0.1).toFixed(1))),
  };
}

export function computeEffectivePlaneStats(progress: PlayerProgress): EffectivePlaneStats {
  return computePlaneStatsForId(progress, progress.selectedPlane);
}
