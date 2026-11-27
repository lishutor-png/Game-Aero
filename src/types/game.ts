export type ScreenState = 'splash' | 'menu' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'standard' | 'practice';

export type MapId = 'space' | 'city' | 'forest' | 'desert' | 'snow';

// Keep ThemeId alias for backwards compatibility across components/API
export type ThemeId = MapId;

export type GraphicsQuality = 'auto' | 'light' | 'high';

export type TextScale = 'normal' | 'large' | 'xlarge';

export type ControlSource = 'keyboard' | 'touch';

export type PowerUpType = 'turbo' | 'shield' | 'bonus' | 'heart' | 'weapon';

export type PlaneId = 'titan' | 'vortex' | 'balance';

export type PlaneModelTier = 1 | 2 | 3 | 4;

export type WeaponType =
  | 'signature'
  | 'single'
  | 'rapid'
  | 'double'
  | 'triple'
  | 'spread'
  | 'burst'
  | 'autolock'
  | 'laser';

export type EnemyKind = 'drone' | 'fighter' | 'interceptor' | 'warship' | 'boss';

export interface PlayerUpgrades {
  titanShield: number; // 0..2 => total 1..3 Pelindung
  titanStrength: number; // 0..10
  titanSpeed: number; // 0..10
  titanAgility: number; // 0..10
  titanRecharge: number; // 0..10 => 30s..10s
  vortexJet: number; // 0..2 => total 1..3 Jet
  vortexStrength: number; // 0..10
  vortexSpeed: number; // 0..10
  vortexAgility: number; // 0..10
  vortexRecharge: number; // 0..10 => 30s..10s
  balanceShield: number; // 0..1 => total 0..1 Pelindung
  balanceJet: number; // 0..1 => total 0..1 Jet
  balanceStrength: number; // 0..10
  balanceSpeed: number; // 0..10
  balanceAgility: number; // 0..10
  balanceRecharge: number; // 0..10 => 30s..10s
}

export interface PlayerProgress {
  points: number;
  selectedPlane: PlaneId;
  heartsBonus: Record<PlaneId, number>; // per-plane hearts bonus (base 2 for all)
  planeTiers: Record<PlaneId, PlaneModelTier>; // 1..4 visual & frame evolution
  selectedWeapon: WeaponType;
  unlockedWeapons: WeaponType[];
  upgrades: PlayerUpgrades;
}

export interface EffectivePlaneStats {
  planeId: PlaneId;
  name: string;
  roleLabel: string;
  modelTier: PlaneModelTier;
  weaponType: WeaponType;
  maxLives: number;
  maxArmorCharges: number;
  maxJetCharges: number;
  rechargeIntervalSec: number; // 30s at Lv.0 -> 10s at Lv.10
  speedMultiplier: number;
  lateralAgility: number;
  boosterDuration: number;
  maxDurabilityPerLife: number;
  strengthRating: number; // 1..10
  speedRating: number; // 1..10
  agilityRating: number; // 1..10
}

export interface GameSettings {
  steeringSensitivity: number; // 0.6 to 2.0
  randomThemePerSession: boolean;
  selectedTheme: ThemeId;
  graphicsQuality: GraphicsQuality;
  musicVolume: number; // 0 to 1
  sfxVolume: number; // 0 to 1
  muted: boolean;
  pilotName: string;
}

export interface AccessibilitySettings {
  darkMode: boolean;
  highContrast: boolean;
  textScale: TextScale;
  screenReaderAnnouncements: boolean;
  reducedMotion: boolean;
}

export interface HudSnapshot {
  score: number;
  distance: number;
  speedKmh: number;
  difficultyLevel: number;
  combo: number;
  lives: number;
  maxLives: number;
  durability: number;
  maxDurability: number;
  armorRemaining: number;
  maxArmor: number;
  armorRechargeRemaining: number;
  jetCharges: number;
  maxJetCharges: number;
  jetRechargeRemaining: number;
  rechargeIntervalSec: number;
  pointsEarned: number;
  hasShield: boolean;
  shieldActiveRemaining: number;
  turboRemaining: number; // seconds remaining
  turboDuration: number;
  boosterActiveRemaining: number;
  planeId: PlaneId;
  modelTier: PlaneModelTier;
  weaponType: WeaponType;
  effectiveWeaponName: string;
  effectiveWeaponColorCss: string;
  weaponOverrideRemaining: number;
  steerInput: number; // -1 to 1
  verticalInput: number; // -1 to 1
  activeControl: ControlSource;
  enemiesDestroyed: number;
  bossActive: boolean;
  bossName: string;
  bossHp: number;
  bossMaxHp: number;
  practiceStep: number; // 0, 1, 2, 3
  practiceMessage: string;
  themeId: ThemeId;
}

export interface GameOverSummary {
  score: number;
  distance: number;
  maxCombo: number;
  powerUpsCollected: number;
  enemiesDestroyed: number;
  pointsEarned: number;
  planeId: PlaneId;
  modelTier: PlaneModelTier;
  weaponType: WeaponType;
  themeId: ThemeId;
  controlUsed: ControlSource;
  mode: GameMode;
  isNewBest: boolean;
}

export interface LeaderboardEntry {
  id: string;
  pilotName: string;
  score: number;
  distance: number;
  themeId: string;
  controlUsed: ControlSource;
  createdAt: string;
}
