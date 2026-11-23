import type { EffectivePlaneStats, PlaneId, PlayerProgress } from '../types/game';

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

export const BASE_LIVES_PER_PLANE = 2;
export const BASE_RECHARGE_SECONDS = 30.0;
export const MIN_RECHARGE_SECONDS = 10.0;

// Nilai pengurangan kekuatan per tabrakan objek pada setiap nyawa:
// Patokan Aegis Titan kekuatan penuh = 100 -> 4x benda kecil (25) atau 2x gawang (50) baru berkurang 1 nyawa.
export const OBSTACLE_DAMAGE = {
  small: 25, // Pilar / Benda Kecil & Pilar Bergerak
  turbine: 35, // Turbin Besar
  gate: 50, // Tiang Gawang
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

export function computePlaneStatsForId(progress: PlayerProgress, planeId: PlaneId): EffectivePlaneStats {
  const def = PLANE_CATALOG[planeId];
  const maxLives = getPlaneMaxLives(progress, planeId);
  const up = progress.upgrades;

  if (planeId === 'titan') {
    const str = clampLv(up.titanStrength, 10);
    const spd = clampLv(up.titanSpeed, 10);
    const agi = clampLv(up.titanAgility, 10);
    const rch = clampLv(up.titanRecharge, 10);

    // Kekuatan per nyawa: Lv.0 = 60 -> Lv.10 = 100 (4x benda kecil @25, 2x gawang @50)
    const maxDurabilityPerLife = 60 + str * 4;

    return {
      planeId,
      name: def.name,
      roleLabel: def.roleLabel,
      maxLives,
      maxArmorCharges: 1 + clampLv(up.titanShield, 2), // 1..3 Pelindung
      maxJetCharges: 0,
      rechargeIntervalSec: computeRechargeSeconds(rch),
      speedMultiplier: 0.76 + spd * 0.03, // 0.76x -> 1.06x
      lateralAgility: 0.84 + agi * 0.032, // 0.84x -> 1.16x
      boosterDuration: 0,
      maxDurabilityPerLife,
      strengthRating: Number((maxDurabilityPerLife / 10).toFixed(1)), // 6.0 -> 10.0
      speedRating: Number((3.5 + spd * 0.3).toFixed(1)), // 3.5 -> 6.5
      agilityRating: Number((4.0 + agi * 0.3).toFixed(1)), // 4.0 -> 7.0
    };
  }

  if (planeId === 'vortex') {
    const str = clampLv(up.vortexStrength, 10);
    const spd = clampLv(up.vortexSpeed, 10);
    const agi = clampLv(up.vortexAgility, 10);
    const rch = clampLv(up.vortexRecharge, 10);

    // Kekuatan per nyawa: Lv.0 = 25 -> Lv.10 = 50 (2x benda kecil @25, 1x gawang @50)
    const maxDurabilityPerLife = Math.round(25 + str * 2.5);

    return {
      planeId,
      name: def.name,
      roleLabel: def.roleLabel,
      maxLives,
      maxArmorCharges: 0,
      maxJetCharges: 1 + clampLv(up.vortexJet, 2), // 1..3 Jet
      rechargeIntervalSec: computeRechargeSeconds(rch),
      speedMultiplier: 1.12 + spd * 0.044, // 1.12x -> 1.56x
      lateralAgility: 1.15 + agi * 0.048, // 1.15x -> 1.63x
      boosterDuration: 2.6 + spd * 0.14, // 2.6s -> 4.0s
      maxDurabilityPerLife,
      strengthRating: Number((maxDurabilityPerLife / 10).toFixed(1)), // 2.5 -> 5.0
      speedRating: Number((7.5 + spd * 0.25).toFixed(1)), // 7.5 -> 10.0
      agilityRating: Number((7.5 + agi * 0.25).toFixed(1)), // 7.5 -> 10.0
    };
  }

  // Aero Prime (balance): Kekuatan per nyawa Lv.0 = 45 -> Lv.10 = 75 (3x benda kecil @25, 2x gawang @50)
  const str = clampLv(up.balanceStrength, 10);
  const spd = clampLv(up.balanceSpeed, 10);
  const agi = clampLv(up.balanceAgility, 10);
  const rch = clampLv(up.balanceRecharge, 10);
  const maxDurabilityPerLife = 45 + str * 3;

  return {
    planeId: 'balance',
    name: def.name,
    roleLabel: def.roleLabel,
    maxLives,
    maxArmorCharges: clampLv(up.balanceShield, 1),
    maxJetCharges: clampLv(up.balanceJet, 1),
    rechargeIntervalSec: computeRechargeSeconds(rch),
    speedMultiplier: 0.94 + spd * 0.034, // 0.94x -> 1.28x
    lateralAgility: 0.98 + agi * 0.036, // 0.98x -> 1.34x
    boosterDuration: 2.3 + spd * 0.1, // 2.3s -> 3.3s
    maxDurabilityPerLife,
    strengthRating: Number((maxDurabilityPerLife / 10).toFixed(1)), // 4.5 -> 7.5
    speedRating: Number((5.5 + spd * 0.3).toFixed(1)), // 5.5 -> 8.5
    agilityRating: Number((5.5 + agi * 0.3).toFixed(1)), // 5.5 -> 8.5
  };
}

export function computeEffectivePlaneStats(progress: PlayerProgress): EffectivePlaneStats {
  return computePlaneStatsForId(progress, progress.selectedPlane);
}
