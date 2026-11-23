import type { EffectivePlaneStats, PlaneId, PlayerProgress } from '../types/game';

export interface PlaneDefinition {
  id: PlaneId;
  name: string;
  roleLabel: string;
  tagline: string;
  perkSummary: string;
  accentHex: string;
  baseSpeedStat: number; // 1..10 UI bar
  baseStrengthStat: number; // 1..10 UI bar
  baseAgilityStat: number; // 1..10 UI bar
}

export const PLANE_CATALOG: Record<PlaneId, PlaneDefinition> = {
  titan: {
    id: 'titan',
    name: 'Aegis Titan',
    roleLabel: 'Fokus Kekuatan',
    tagline: 'Lapis baja kokoh, cenderung lebih lambat namun sangat tangguh.',
    perkSummary: 'Tabrak 1 Gawang Aman! Benturan pertama tidak mengurangi nyawa.',
    accentHex: '#0d9488',
    baseSpeedStat: 4,
    baseStrengthStat: 9,
    baseAgilityStat: 6,
  },
  vortex: {
    id: 'vortex',
    name: 'Vortex Jet',
    roleLabel: 'Fokus Kecepatan',
    tagline: 'Pesawat supersonik lebih cepat dibanding pesawat lain.',
    perkSummary: 'Punya tombol Booster aktif untuk melesat kencang & skor 1.5x.',
    accentHex: '#ea580c',
    baseSpeedStat: 9,
    baseStrengthStat: 4,
    baseAgilityStat: 9,
  },
  balance: {
    id: 'balance',
    name: 'Aero Prime',
    roleLabel: 'Fokus Keseimbangan',
    tagline: 'Kendali stabil & fleksibel untuk segala gaya terbang.',
    perkSummary: 'Bisa beli Booster, Kekuatan (Armor), & Kecepatan memakai Poin.',
    accentHex: '#0284c7',
    baseSpeedStat: 6,
    baseStrengthStat: 6,
    baseAgilityStat: 7,
  },
};

export const PLANE_IDS: PlaneId[] = ['titan', 'vortex', 'balance'];

export const BASE_MAX_LIVES = 3;
export const MAX_LIVES_UPGRADE_CAP = 3; // total up to 6 lives

export const MAX_LIVES_COSTS = [120, 250, 450];
export const TITAN_STRENGTH_COSTS = [140, 280];
export const VORTEX_SPEED_COSTS = [110, 220, 360];
export const VORTEX_BOOSTER_COSTS = [110, 220, 360];
export const BALANCE_STRENGTH_COSTS = [100, 220, 380];
export const BALANCE_SPEED_COSTS = [90, 180, 320];
export const BALANCE_BOOSTER_COSTS = [100, 200, 350];

export const DEFAULT_PROGRESS: PlayerProgress = {
  points: 0,
  selectedPlane: 'balance',
  maxLivesBonus: 0,
  upgrades: {
    titanStrength: 0,
    vortexSpeed: 0,
    vortexBooster: 0,
    balanceStrength: 0,
    balanceSpeed: 0,
    balanceBooster: 0,
  },
};

export function computeEffectivePlaneStats(progress: PlayerProgress): EffectivePlaneStats {
  const maxLives = BASE_MAX_LIVES + Math.min(MAX_LIVES_UPGRADE_CAP, Math.max(0, progress.maxLivesBonus));
  const up = progress.upgrades;

  if (progress.selectedPlane === 'titan') {
    return {
      planeId: 'titan',
      name: PLANE_CATALOG.titan.name,
      roleLabel: PLANE_CATALOG.titan.roleLabel,
      maxLives,
      startingArmor: 1 + up.titanStrength, // Built-in "tabrak 1 gawang aman" + strength upgrades
      speedMultiplier: 0.84,
      lateralAgility: 0.92,
      hasBooster: false,
      boosterDuration: 0,
      boosterCooldown: 0,
    };
  }

  if (progress.selectedPlane === 'vortex') {
    return {
      planeId: 'vortex',
      name: PLANE_CATALOG.vortex.name,
      roleLabel: PLANE_CATALOG.vortex.roleLabel,
      maxLives,
      startingArmor: 0,
      speedMultiplier: 1.18 + up.vortexSpeed * 0.06,
      lateralAgility: 1.16 + up.vortexSpeed * 0.04,
      hasBooster: true,
      boosterDuration: 3.2 + up.vortexBooster * 0.65,
      boosterCooldown: Math.max(4.5, 8.0 - up.vortexBooster * 1.0),
    };
  }

  // Balanced plane ('balance') can buy Booster, Strength, and Speed with points
  return {
    planeId: 'balance',
    name: PLANE_CATALOG.balance.name,
    roleLabel: PLANE_CATALOG.balance.roleLabel,
    maxLives,
    startingArmor: up.balanceStrength,
    speedMultiplier: 1.0 + up.balanceSpeed * 0.075,
    lateralAgility: 1.0 + up.balanceSpeed * 0.05,
    hasBooster: up.balanceBooster > 0,
    boosterDuration: up.balanceBooster > 0 ? 2.8 + (up.balanceBooster - 1) * 0.7 : 0,
    boosterCooldown: up.balanceBooster > 0 ? Math.max(5.0, 9.0 - (up.balanceBooster - 1) * 1.2) : 0,
  };
}
