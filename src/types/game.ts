export type ScreenState = 'splash' | 'menu' | 'playing' | 'paused' | 'gameover';

export type GameMode = 'standard' | 'practice';

export type ThemeId = 'morning' | 'sunset' | 'arctic' | 'midnight';

export type GraphicsQuality = 'auto' | 'light' | 'high';

export type TextScale = 'normal' | 'large' | 'xlarge';

export type ControlSource = 'gyro' | 'keyboard' | 'touch';

export type PowerUpType = 'turbo' | 'shield' | 'bonus';

export type PlaneId = 'titan' | 'vortex' | 'balance';

export interface PlayerUpgrades {
  titanStrength: number; // 0..2 extra armor hits (base 1 + titanStrength)
  vortexSpeed: number; // 0..3 speed upgrades
  vortexBooster: number; // 0..3 booster upgrades
  balanceStrength: number; // 0..3 armor hits (0..3 safe hits)
  balanceSpeed: number; // 0..3 speed upgrades
  balanceBooster: number; // 0..3 (0 = locked, 1..3 = unlocked + upgraded)
}

export interface PlayerProgress {
  points: number;
  selectedPlane: PlaneId;
  maxLivesBonus: number; // 0..3 => total 3..6 lives
  upgrades: PlayerUpgrades;
}

export interface EffectivePlaneStats {
  planeId: PlaneId;
  name: string;
  roleLabel: string;
  maxLives: number;
  startingArmor: number;
  speedMultiplier: number;
  lateralAgility: number;
  hasBooster: boolean;
  boosterDuration: number;
  boosterCooldown: number;
}

export interface GameSettings {
  gyroEnabled: boolean;
  gyroSensitivity: number; // 0.5 to 2.5
  gyroDeadzone: number; // degrees, e.g. 2 to 8
  invertGyro: boolean;
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
  armorRemaining: number;
  pointsEarned: number;
  hasShield: boolean;
  turboRemaining: number; // seconds remaining
  turboDuration: number;
  hasBooster: boolean;
  boosterActiveRemaining: number;
  boosterCooldownRemaining: number;
  boosterCooldownTotal: number;
  planeId: PlaneId;
  tiltAngleDeg: number; // live left/right gyro or steering tilt
  steerInput: number; // -1 to 1
  activeControl: ControlSource;
  practiceStep: number; // 0, 1, 2, 3
  practiceMessage: string;
  themeId: ThemeId;
}

export interface GameOverSummary {
  score: number;
  distance: number;
  maxCombo: number;
  powerUpsCollected: number;
  pointsEarned: number;
  planeId: PlaneId;
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
  themeId: ThemeId;
  controlUsed: ControlSource;
  createdAt: string;
}
