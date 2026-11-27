import type { MapId, ThemeId } from '../types/game';

export interface EnvironmentTheme {
  id: ThemeId;
  name: string;
  shortName: string;
  subtitle: string;
  skyHex: number;
  skyTopHex: number;
  fogHex: number;
  fogDensity: number;
  sunHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  rimHex: number;
  groundHex: number;
  gridLineHex: number;
  obstacleHex: number;
  obstacleAccentHex: number;
  sceneryHex: number;
  cloudHex: number;
  particleHex: number;
  uiAccentCss: string;
}

export const ENVIRONMENT_THEMES: Record<ThemeId, EnvironmentTheme> = {
  space: {
    id: 'space',
    name: 'Space Nebula',
    shortName: 'Space',
    subtitle: 'Planet bercincin, nebula, asteroid & stasiun antariksa',
    skyHex: 0x050816,
    skyTopHex: 0x1e1b4b,
    fogHex: 0x090d24,
    fogDensity: 0.0052,
    sunHex: 0xc4b5fd,
    sunIntensity: 1.5,
    hemiSkyHex: 0x6366f1,
    hemiGroundHex: 0x1e1b4b,
    hemiIntensity: 0.95,
    rimHex: 0x38bdf8,
    groundHex: 0x0b1026,
    gridLineHex: 0x818cf8,
    obstacleHex: 0x334155,
    obstacleAccentHex: 0xa855f7,
    sceneryHex: 0x475569,
    cloudHex: 0x6366f1,
    particleHex: 0xe0e7ff,
    uiAccentCss: '#6366f1',
  },
  city: {
    id: 'city',
    name: 'Metro City',
    shortName: 'City',
    subtitle: 'Gedung pencakar langit, jalan raya, jembatan & menara',
    skyHex: 0x1e3a5f,
    skyTopHex: 0x0f172a,
    fogHex: 0x334155,
    fogDensity: 0.0064,
    sunHex: 0xfde68a,
    sunIntensity: 1.55,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x1e293b,
    hemiIntensity: 0.85,
    rimHex: 0x38bdf8,
    groundHex: 0x1e293b,
    gridLineHex: 0xf59e0b,
    obstacleHex: 0x334155,
    obstacleAccentHex: 0x38bdf8,
    sceneryHex: 0x475569,
    cloudHex: 0x94a3b8,
    particleHex: 0xbae6fd,
    uiAccentCss: '#0284c7',
  },
  forest: {
    id: 'forest',
    name: 'Emerald Forest',
    shortName: 'Forest',
    subtitle: 'Hutan lebat, pegunungan, sungai & air terjun berkabut',
    skyHex: 0xbae6fd,
    skyTopHex: 0x38bdf8,
    fogHex: 0xcffafe,
    fogDensity: 0.0068,
    sunHex: 0xfffbeb,
    sunIntensity: 1.6,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x14532d,
    hemiIntensity: 0.9,
    rimHex: 0xa7f3d0,
    groundHex: 0x166534,
    gridLineHex: 0x38bdf8,
    obstacleHex: 0x3f2e21,
    obstacleAccentHex: 0x22c55e,
    sceneryHex: 0x15803d,
    cloudHex: 0xf8fafc,
    particleHex: 0x86efac,
    uiAccentCss: '#059669',
  },
  desert: {
    id: 'desert',
    name: 'Red Desert',
    shortName: 'Desert',
    subtitle: 'Gurun pasir, bukit pasir, formasi batuan & tebing tandus',
    skyHex: 0xfdba74,
    skyTopHex: 0xf97316,
    fogHex: 0xfed7aa,
    fogDensity: 0.0065,
    sunHex: 0xfff7ed,
    sunIntensity: 1.7,
    hemiSkyHex: 0xfdba74,
    hemiGroundHex: 0x9a3412,
    hemiIntensity: 0.85,
    rimHex: 0xfef08a,
    groundHex: 0xd97706,
    gridLineHex: 0xfef3c7,
    obstacleHex: 0x7c2d12,
    obstacleAccentHex: 0xf59e0b,
    sceneryHex: 0xb45309,
    cloudHex: 0xffedd5,
    particleHex: 0xfde68a,
    uiAccentCss: '#d97706',
  },
  snow: {
    id: 'snow',
    name: 'Snow Mountain',
    shortName: 'Snow',
    subtitle: 'Pegunungan bersalju, gletser es, kabut dingin & badai salju',
    skyHex: 0xcbd5e1,
    skyTopHex: 0x64748b,
    fogHex: 0xe2e8f0,
    fogDensity: 0.008,
    sunHex: 0xf0f9ff,
    sunIntensity: 1.45,
    hemiSkyHex: 0xe0f2fe,
    hemiGroundHex: 0x475569,
    hemiIntensity: 0.95,
    rimHex: 0x67e8f9,
    groundHex: 0xe2e8f0,
    gridLineHex: 0x38bdf8,
    obstacleHex: 0x334155,
    obstacleAccentHex: 0x06b6d4,
    sceneryHex: 0x94a3b8,
    cloudHex: 0xf8fafc,
    particleHex: 0xffffff,
    uiAccentCss: '#0891b2',
  },
};

export const THEME_IDS: ThemeId[] = ['forest', 'desert', 'city', 'snow', 'space'];

export const CAMPAIGN_STAGE_ORDER: MapId[] = ['forest', 'desert', 'city', 'snow', 'space'];

export interface CampaignStageConfig {
  stage: number;
  mapId: MapId;
  difficultyLabel: string;
  bossName: string;
  bossWeaponDesc: string;
  bossHp: number;
  bossScore: number;
  bossPoints: number;
  missionGatesTarget: number;
  missionKillsTarget: number;
  missionItemsTarget: number;
  bossCooldownSec: number;
}

export const CAMPAIGN_STAGES: CampaignStageConfig[] = [
  {
    stage: 1,
    mapId: 'forest',
    difficultyLabel: 'Mudah',
    bossName: 'Sylvan Scout Ace (Bos Lv.1)',
    bossWeaponDesc: '1 Tembakan Tunggal',
    bossHp: 170,
    bossScore: 100,
    bossPoints: 35,
    missionGatesTarget: 4,
    missionKillsTarget: 5,
    missionItemsTarget: 2,
    bossCooldownSec: 2.0,
  },
  {
    stage: 2,
    mapId: 'desert',
    difficultyLabel: 'Sedang',
    bossName: 'Dune Twin-Fang (Bos Lv.2)',
    bossWeaponDesc: '2 Tembakan Kembar',
    bossHp: 320,
    bossScore: 220,
    bossPoints: 75,
    missionGatesTarget: 6,
    missionKillsTarget: 8,
    missionItemsTarget: 3,
    bossCooldownSec: 1.75,
  },
  {
    stage: 3,
    mapId: 'city',
    difficultyLabel: 'Menantang',
    bossName: 'Metro Tri-Valkyrie (Bos Lv.3)',
    bossWeaponDesc: '3 Tembakan Kipas & Burst',
    bossHp: 520,
    bossScore: 380,
    bossPoints: 140,
    missionGatesTarget: 8,
    missionKillsTarget: 12,
    missionItemsTarget: 4,
    bossCooldownSec: 1.5,
  },
  {
    stage: 4,
    mapId: 'snow',
    difficultyLabel: 'Sulit',
    bossName: 'Frost Quad-Dominator (Bos Lv.4)',
    bossWeaponDesc: '4 Tembakan Beruntun & Sebar',
    bossHp: 780,
    bossScore: 600,
    bossPoints: 240,
    missionGatesTarget: 10,
    missionKillsTarget: 16,
    missionItemsTarget: 5,
    bossCooldownSec: 1.25,
  },
  {
    stage: 5,
    mapId: 'space',
    difficultyLabel: 'Sangat Sulit',
    bossName: 'Void Sovereign Prime (Bos Final)',
    bossWeaponDesc: '5 Tembakan Radial & Sapuan',
    bossHp: 1120,
    bossScore: 1000,
    bossPoints: 400,
    missionGatesTarget: 12,
    missionKillsTarget: 22,
    missionItemsTarget: 6,
    bossCooldownSec: 1.0,
  },
];

export function getStageConfig(stageIndex: number): CampaignStageConfig {
  if (stageIndex < CAMPAIGN_STAGES.length) {
    return CAMPAIGN_STAGES[Math.max(0, stageIndex)];
  }
  const extra = stageIndex - CAMPAIGN_STAGES.length + 1;
  const base = CAMPAIGN_STAGES[CAMPAIGN_STAGES.length - 1];
  return {
    stage: stageIndex + 1,
    mapId: 'space',
    difficultyLabel: `Overdrive +${extra}`,
    bossName: `Void Overlord Mk.${extra + 1} (Overdrive)`,
    bossWeaponDesc: '5+ Tembakan Kombo Ekstrem',
    bossHp: base.bossHp + extra * 340,
    bossScore: base.bossScore + extra * 350,
    bossPoints: base.bossPoints + extra * 120,
    missionGatesTarget: base.missionGatesTarget + extra * 2,
    missionKillsTarget: base.missionKillsTarget + extra * 4,
    missionItemsTarget: base.missionItemsTarget + Math.min(4, extra),
    bossCooldownSec: Math.max(0.75, base.bossCooldownSec - extra * 0.08),
  };
}

export function normalizeMapId(raw: string | undefined): MapId {
  if (!raw) return 'forest';
  if (raw === 'space' || raw === 'city' || raw === 'forest' || raw === 'desert' || raw === 'snow') {
    return raw;
  }
  // Map legacy theme names gracefully
  if (raw === 'morning') return 'forest';
  if (raw === 'sunset') return 'desert';
  if (raw === 'arctic') return 'snow';
  if (raw === 'midnight') return 'space';
  return 'forest';
}

export function pickRandomTheme(exclude?: ThemeId): ThemeId {
  const pool = exclude ? THEME_IDS.filter((id) => id !== exclude) : THEME_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
