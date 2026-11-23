import type { ThemeId } from '../types/game';

export interface EnvironmentTheme {
  id: ThemeId;
  name: string;
  subtitle: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  sunHex: number;
  sunIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  groundHex: number;
  gridLineHex: number;
  obstacleHex: number;
  obstacleAccentHex: number;
  sceneryHex: number;
  cloudHex: number;
  uiAccentCss: string;
}

export const ENVIRONMENT_THEMES: Record<ThemeId, EnvironmentTheme> = {
  morning: {
    id: 'morning',
    name: 'Cakrawala Pagi',
    subtitle: 'Langit cerah pesisir & awan lembut',
    skyHex: 0xbae6fd,
    fogHex: 0xcbeafe,
    fogDensity: 0.0068,
    sunHex: 0xfff3d6,
    sunIntensity: 1.55,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x0ea5e9,
    hemiIntensity: 0.85,
    groundHex: 0x0284c7,
    gridLineHex: 0x7dd3fc,
    obstacleHex: 0x1e293b,
    obstacleAccentHex: 0xf59e0b,
    sceneryHex: 0x38bdf8,
    cloudHex: 0xf8fafc,
    uiAccentCss: '#0284c7',
  },
  sunset: {
    id: 'sunset',
    name: 'Lembah Senja',
    subtitle: 'Cahaya keemasan & tebing hangat',
    skyHex: 0xfdba74,
    fogHex: 0xfed7aa,
    fogDensity: 0.0072,
    sunHex: 0xffedd5,
    sunIntensity: 1.6,
    hemiSkyHex: 0xfb923c,
    hemiGroundHex: 0x7c2d12,
    hemiIntensity: 0.8,
    groundHex: 0x9a3412,
    gridLineHex: 0xfdba74,
    obstacleHex: 0x431407,
    obstacleAccentHex: 0x38bdf8,
    sceneryHex: 0xc2410c,
    cloudHex: 0xffedd5,
    uiAccentCss: '#d97706',
  },
  arctic: {
    id: 'arctic',
    name: 'Fajar Kutub',
    subtitle: 'Ufuk es tenang & kilau aurora',
    skyHex: 0x1e293b,
    fogHex: 0x1e293b,
    fogDensity: 0.0075,
    sunHex: 0x99f6e4,
    sunIntensity: 1.4,
    hemiSkyHex: 0x2dd4bf,
    hemiGroundHex: 0x0f172a,
    hemiIntensity: 0.9,
    groundHex: 0x0f172a,
    gridLineHex: 0x2dd4bf,
    obstacleHex: 0x334155,
    obstacleAccentHex: 0x2dd4bf,
    sceneryHex: 0x475569,
    cloudHex: 0xcbd5e1,
    uiAccentCss: '#0d9488',
  },
  midnight: {
    id: 'midnight',
    name: 'Malam Neon Santai',
    subtitle: 'Langit malam nyaman untuk mata',
    skyHex: 0x0b1120,
    fogHex: 0x0f172a,
    fogDensity: 0.0078,
    sunHex: 0xa5b4fc,
    sunIntensity: 1.35,
    hemiSkyHex: 0x38bdf8,
    hemiGroundHex: 0x1e1b4b,
    hemiIntensity: 0.9,
    groundHex: 0x090d1a,
    gridLineHex: 0x38bdf8,
    obstacleHex: 0x1e1b4b,
    obstacleAccentHex: 0x38bdf8,
    sceneryHex: 0x312e81,
    cloudHex: 0x334155,
    uiAccentCss: '#38bdf8',
  },
};

export const THEME_IDS: ThemeId[] = ['morning', 'sunset', 'arctic', 'midnight'];

export function pickRandomTheme(exclude?: ThemeId): ThemeId {
  const pool = exclude ? THEME_IDS.filter((id) => id !== exclude) : THEME_IDS;
  return pool[Math.floor(Math.random() * pool.length)];
}
