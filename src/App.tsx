import { useCallback, useEffect, useRef, useState } from 'react';
import { FlightWorldEngine } from './game/worldEngine';
import { soundEngine } from './game/audio';
import { normalizeMapId } from './game/themes';
import {
  BALANCE_JET_COSTS,
  BALANCE_SHIELD_COSTS,
  BASE_LIVES_PER_PLANE,
  BASE_RECHARGE_SECONDS,
  DEFAULT_PROGRESS,
  HEART_UPGRADE_COSTS,
  LV10_AGILITY_COSTS,
  LV10_RECHARGE_COSTS,
  LV10_SPEED_COSTS,
  LV10_STRENGTH_COSTS,
  MODEL_TIER_CATALOG,
  PLANE_CATALOG,
  TITAN_SHIELD_COSTS,
  VORTEX_JET_COSTS,
  WEAPON_CATALOG,
  computeEffectivePlaneStats,
  getPlaneMaxLives,
  getPlaneModelTier,
} from './game/planes';
import { SplashScreen } from './components/SplashScreen';
import { MainMenu } from './components/MainMenu';
import { GameHud } from './components/GameHud';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { AccessibilityModal } from './components/AccessibilityModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { HangarModal } from './components/HangarModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import type {
  AccessibilitySettings,
  GameMode,
  GameOverSummary,
  GameSettings,
  HudSnapshot,
  PlaneId,
  PlaneModelTier,
  PlayerProgress,
  PlayerUpgrades,
  ScreenState,
  WeaponType,
} from './types/game';

const SETTINGS_KEY = 'aeroglide_settings_v2';
const A11Y_KEY = 'aeroglide_a11y_v1';
const BEST_KEY = 'aeroglide_best_score_v1';
const PROGRESS_KEY = 'aeroglide_progress_v2';

const DEFAULT_SETTINGS: GameSettings = {
  steeringSensitivity: 1.15,
  randomThemePerSession: false,
  selectedTheme: 'forest',
  graphicsQuality: 'auto',
  musicVolume: 0.45,
  sfxVolume: 0.75,
  muted: false,
  pilotName: 'Pilot Garuda',
};

const DEFAULT_A11Y: AccessibilitySettings = {
  darkMode: false,
  highContrast: false,
  textScale: 'normal',
  screenReaderAnnouncements: true,
  reducedMotion: false,
};

const INITIAL_HUD: HudSnapshot = {
  score: 0,
  distance: 0,
  speedKmh: 220,
  difficultyLevel: 1,
  combo: 0,
  lives: BASE_LIVES_PER_PLANE,
  maxLives: BASE_LIVES_PER_PLANE,
  durability: 45,
  maxDurability: 45,
  armorRemaining: 0,
  maxArmor: 0,
  armorRechargeRemaining: 0,
  jetCharges: 0,
  maxJetCharges: 0,
  jetRechargeRemaining: 0,
  rechargeIntervalSec: BASE_RECHARGE_SECONDS,
  pointsEarned: 0,
  hasShield: false,
  shieldActiveRemaining: 0,
  turboRemaining: 0,
  turboDuration: 5.5,
  boosterActiveRemaining: 0,
  planeId: 'balance',
  modelTier: 1,
  weaponType: 'signature',
  effectiveWeaponName: 'Aero Rail',
  effectiveWeaponColorCss: '#0284c7',
  weaponOverrideRemaining: 0,
  steerInput: 0,
  verticalInput: 0,
  activeControl: 'keyboard',
  enemiesDestroyed: 0,
  bossesDefeated: 0,
  stageNumber: 1,
  stageLabel: 'Zona 1/5 · Forest',
  missionGates: 0,
  missionGatesTarget: 4,
  missionKills: 0,
  missionKillsTarget: 5,
  missionItems: 0,
  missionItemsTarget: 2,
  stageClearBanner: '',
  bossActive: false,
  bossName: 'Sylvan Scout Ace (Bos Lv.1)',
  bossHp: 0,
  bossMaxHp: 1,
  practiceStep: 0,
  practiceMessage: '',
  themeId: 'forest',
};

const UPGRADE_COST_MAP: Record<keyof PlayerUpgrades, number[]> = {
  titanShield: TITAN_SHIELD_COSTS,
  titanStrength: LV10_STRENGTH_COSTS,
  titanSpeed: LV10_SPEED_COSTS,
  titanAgility: LV10_AGILITY_COSTS,
  titanRecharge: LV10_RECHARGE_COSTS,
  vortexJet: VORTEX_JET_COSTS,
  vortexStrength: LV10_STRENGTH_COSTS,
  vortexSpeed: LV10_SPEED_COSTS,
  vortexAgility: LV10_AGILITY_COSTS,
  vortexRecharge: LV10_RECHARGE_COSTS,
  balanceShield: BALANCE_SHIELD_COSTS,
  balanceJet: BALANCE_JET_COSTS,
  balanceStrength: LV10_STRENGTH_COSTS,
  balanceSpeed: LV10_SPEED_COSTS,
  balanceAgility: LV10_AGILITY_COSTS,
  balanceRecharge: LV10_RECHARGE_COSTS,
};

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...(JSON.parse(raw) as Partial<T>) };
  } catch {
    return fallback;
  }
}

function loadSettings(): GameSettings {
  const merged = loadJson(SETTINGS_KEY, DEFAULT_SETTINGS);
  return {
    ...merged,
    selectedTheme: normalizeMapId(merged.selectedTheme),
  };
}

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    const validSaved = Array.isArray(parsed.unlockedWeapons)
      ? parsed.unlockedWeapons.filter((w): w is WeaponType => w in WEAPON_CATALOG)
      : [];
    const unlockedWeapons: WeaponType[] = Array.from(new Set<WeaponType>(['signature', 'single', ...validSaved]));
    const isUntouchedLegacySingle =
      parsed.selectedWeapon === 'single' && validSaved.length <= 1;
    const selectedWeapon: WeaponType =
      !isUntouchedLegacySingle && parsed.selectedWeapon && unlockedWeapons.includes(parsed.selectedWeapon)
        ? parsed.selectedWeapon
        : 'signature';
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      heartsBonus: {
        ...DEFAULT_PROGRESS.heartsBonus,
        ...(parsed.heartsBonus ?? {}),
      },
      planeTiers: {
        ...DEFAULT_PROGRESS.planeTiers,
        ...(parsed.planeTiers ?? {}),
      },
      selectedWeapon,
      unlockedWeapons,
      upgrades: {
        ...DEFAULT_PROGRESS.upgrades,
        ...(parsed.upgrades ?? {}),
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

function tryEnterFullscreen() {
  try {
    const doc = document as Document & { webkitFullscreenElement?: Element };
    const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => Promise<void> };
    if (!document.fullscreenElement && !doc.webkitFullscreenElement) {
      if (typeof el.requestFullscreen === 'function') {
        void el.requestFullscreen().catch(() => {});
      } else if (typeof el.webkitRequestFullscreen === 'function') {
        void el.webkitRequestFullscreen();
      }
    }
  } catch {
    // ignore where fullscreen API is restricted (e.g., iOS Safari or sandboxed iframe)
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlightWorldEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [settings, setSettings] = useState<GameSettings>(loadSettings);
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() =>
    loadJson(A11Y_KEY, DEFAULT_A11Y),
  );
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const val = Number(localStorage.getItem(BEST_KEY) || '0');
      return Number.isFinite(val) ? val : 0;
    } catch {
      return 0;
    }
  });

  const bestScoreRef = useRef(bestScore);
  bestScoreRef.current = bestScore;

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummary | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'accessibility' | 'leaderboard' | 'hangar'>('none');
  const [announcement, setAnnouncement] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canFullscreen =
    typeof document !== 'undefined' &&
    Boolean(document.fullscreenEnabled || (document.documentElement as HTMLElement & { webkitRequestFullscreen?: unknown }).webkitRequestFullscreen);

  useEffect(() => {
    const syncFs = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element };
      setIsFullscreen(Boolean(document.fullscreenElement || doc.webkitFullscreenElement));
    };
    document.addEventListener('fullscreenchange', syncFs);
    document.addEventListener('webkitfullscreenchange', syncFs);
    return () => {
      document.removeEventListener('fullscreenchange', syncFs);
      document.removeEventListener('webkitfullscreenchange', syncFs);
    };
  }, []);

  const handleToggleFullscreen = useCallback(() => {
    soundEngine.playUiClick();
    try {
      const doc = document as Document & {
        webkitFullscreenElement?: Element;
        webkitExitFullscreen?: () => Promise<void>;
      };
      if (document.fullscreenElement || doc.webkitFullscreenElement) {
        if (typeof document.exitFullscreen === 'function') {
          void document.exitFullscreen().catch(() => {});
        } else if (typeof doc.webkitExitFullscreen === 'function') {
          void doc.webkitExitFullscreen();
        }
      } else {
        tryEnterFullscreen();
      }
    } catch {
      // ignore
    }
  }, []);

  const announce = useCallback(
    (msg: string) => {
      if (!accessibility.screenReaderAnnouncements) return;
      setAnnouncement('');
      window.setTimeout(() => setAnnouncement(msg), 20);
    },
    [accessibility.screenReaderAnnouncements],
  );

  // Sync accessibility classes & font scaling to document root
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('theme-dark', accessibility.darkMode);
    root.classList.toggle('high-contrast', accessibility.highContrast);

    const scale =
      accessibility.textScale === 'xlarge'
        ? '1.28'
        : accessibility.textScale === 'large'
          ? '1.14'
          : '1';
    root.style.setProperty('--ui-font-scale', scale);

    try {
      localStorage.setItem(A11Y_KEY, JSON.stringify(accessibility));
    } catch {
      // ignore storage errors
    }
  }, [accessibility]);

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  useEffect(() => {
    try {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
    } catch {
      // ignore
    }
  }, [progress]);

  // Apply live settings to 3D engine
  useEffect(() => {
    engineRef.current?.applySettings(settings, {
      highContrast: accessibility.highContrast,
      reducedMotion: accessibility.reducedMotion,
    });
  }, [settings, accessibility.highContrast, accessibility.reducedMotion]);

  // Keep latest announce callback in ref so WebGL engine mounts ONCE cleanly
  const announceRef = useRef(announce);
  announceRef.current = announce;

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new FlightWorldEngine(
      mount,
      {
        onHudUpdate: (snapshot) => setHud(snapshot),
        onGameOver: (summary) => {
          setActiveModal('none');
          setGameOverSummary(summary);
          setScreen('gameover');

          if (summary.pointsEarned > 0) {
            setProgress((prev) => ({
              ...prev,
              points: prev.points + summary.pointsEarned,
            }));
          }

          if (summary.mode === 'standard' && summary.score > bestScoreRef.current) {
            bestScoreRef.current = summary.score;
            setBestScore(summary.score);
            engine.updateBestScore(summary.score);
            try {
              localStorage.setItem(BEST_KEY, String(summary.score));
            } catch {
              // ignore
            }
          }
        },
        onAnnounce: (msg) => announceRef.current(msg),
      },
      bestScore,
    );

    engine.setPlaneType(progress.selectedPlane, getPlaneModelTier(progress, progress.selectedPlane));
    engine.applyTheme('forest');
    engine.applySettings(settings, {
      highContrast: accessibility.highContrast,
      reducedMotion: accessibility.reducedMotion,
    });

    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    engineRef.current?.updateBestScore(bestScore);
  }, [bestScore]);

  const handleSplashComplete = useCallback(() => {
    setScreen('menu');
    announce('AeroGlide 3D siap. Anda berada di Menu Utama.');
  }, [announce]);

  const startFlight = useCallback(
    async (mode: GameMode) => {
      soundEngine.playUiClick();
      tryEnterFullscreen();
      try {
        const orientation = window.screen?.orientation as unknown as { lock?: (o: string) => Promise<void> };
        if (typeof orientation?.lock === 'function') {
          void orientation.lock('landscape').catch(() => {});
        }
      } catch {
        // ignore where orientation lock is unsupported
      }
      const effectiveStats = computeEffectivePlaneStats(progress);
      setGameMode(mode);
      setGameOverSummary(null);
      setActiveModal('none');
      setScreen('playing');
      engineRef.current?.startSession(mode, settings, effectiveStats);
    },
    [progress, settings],
  );

  const handleSelectPlane = useCallback(
    (planeId: PlaneId) => {
      soundEngine.playUiClick();
      setProgress((prev) => {
        const tier = getPlaneModelTier(prev, planeId);
        engineRef.current?.setPlaneType(planeId, tier);
        return { ...prev, selectedPlane: planeId };
      });
      announce(`Pesawat diganti ke ${PLANE_CATALOG[planeId].name}.`);
    },
    [announce],
  );

  const handleBuyMaxLife = useCallback(() => {
    setProgress((prev) => {
      const planeId = prev.selectedPlane;
      const def = PLANE_CATALOG[planeId];
      const currentLives = getPlaneMaxLives(prev, planeId);
      const currentBonus = currentLives - BASE_LIVES_PER_PLANE;
      const maxBonus = def.maxLives - BASE_LIVES_PER_PLANE;
      if (currentBonus >= maxBonus) return prev;

      const cost = HEART_UPGRADE_COSTS[currentBonus];
      if (prev.points < cost) return prev;
      soundEngine.playPowerUp('heart');
      return {
        ...prev,
        points: prev.points - cost,
        heartsBonus: {
          ...prev.heartsBonus,
          [planeId]: currentBonus + 1,
        },
      };
    });
  }, []);

  const handleBuyUpgrade = useCallback((key: keyof PlayerUpgrades) => {
    setProgress((prev) => {
      const costs = UPGRADE_COST_MAP[key];
      const currentLv = prev.upgrades[key] ?? 0;
      if (currentLv >= costs.length) return prev;
      const cost = costs[currentLv];
      if (prev.points < cost) return prev;
      soundEngine.playPowerUp('turbo');
      return {
        ...prev,
        points: prev.points - cost,
        upgrades: {
          ...prev.upgrades,
          [key]: currentLv + 1,
        },
      };
    });
  }, []);

  const handleUpgradeModelTier = useCallback(() => {
    setProgress((prev) => {
      const planeId = prev.selectedPlane;
      const currentTier = getPlaneModelTier(prev, planeId);
      if (currentTier >= 4) return prev;
      const nextTier = (currentTier + 1) as PlaneModelTier;
      const cost = MODEL_TIER_CATALOG[nextTier].upgradeCost;
      if (prev.points < cost) return prev;
      soundEngine.playPowerUp('shield');
      engineRef.current?.setPlaneType(planeId, nextTier);
      return {
        ...prev,
        points: prev.points - cost,
        planeTiers: {
          ...prev.planeTiers,
          [planeId]: nextTier,
        },
      };
    });
  }, []);

  const handleSelectOrBuyWeapon = useCallback((weaponId: WeaponType) => {
    setProgress((prev) => {
      const unlocked = prev.unlockedWeapons.includes(weaponId);
      if (unlocked) {
        soundEngine.playUiClick();
        return { ...prev, selectedWeapon: weaponId };
      }
      const def = WEAPON_CATALOG[weaponId];
      if (prev.points < def.cost) return prev;
      soundEngine.playPowerUp('turbo');
      return {
        ...prev,
        points: prev.points - def.cost,
        unlockedWeapons: [...prev.unlockedWeapons, weaponId],
        selectedWeapon: weaponId,
      };
    });
  }, []);

  const handlePause = useCallback(() => {
    soundEngine.playUiClick();
    engineRef.current?.pause();
    setScreen('paused');
    announce('Permainan dijeda.');
  }, [announce]);

  const handleResume = useCallback(() => {
    soundEngine.playUiClick();
    setScreen('playing');
    engineRef.current?.resume();
    announce('Permainan dilanjutkan.');
  }, [announce]);

  const handleExitToMenu = useCallback(() => {
    soundEngine.playUiClick();
    engineRef.current?.returnToMenu();
    engineRef.current?.setPlaneType(progress.selectedPlane, getPlaneModelTier(progress, progress.selectedPlane));
    setGameOverSummary(null);
    setScreen('menu');
    announce('Kembali ke Menu Utama.');
  }, [announce, progress]);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => {
      const nextMuted = !prev.muted;
      if (!nextMuted) soundEngine.unlock();
      return { ...prev, muted: nextMuted };
    });
  }, []);

  // Global Escape key handling for Pause / Modals
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (activeModal !== 'none') {
          setActiveModal('none');
          return;
        }
        if (screen === 'playing') {
          handlePause();
        } else if (screen === 'paused') {
          handleResume();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeModal, screen, handlePause, handleResume]);

  return (
    <div className="fixed inset-0 w-screen h-dvh overflow-hidden">
      {/* Live Screen Reader Announcer */}
      <div className="sr-only-live" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 w-full h-full z-0"
        aria-hidden="true"
      />

      {/* Screen 1: Splash Screen */}
      {screen === 'splash' && (
        <SplashScreen
          onComplete={handleSplashComplete}
          reducedMotion={accessibility.reducedMotion}
        />
      )}

      {/* Screen 2: Main Menu */}
      {screen === 'menu' && (
        <MainMenu
          settings={settings}
          accessibility={accessibility}
          progress={progress}
          bestScore={bestScore}
          hasOpenModal={activeModal !== 'none'}
          isFullscreen={isFullscreen}
          canFullscreen={canFullscreen}
          onStartGame={() => void startFlight('standard')}
          onStartPractice={() => void startFlight('practice')}
          onOpenHangar={() => {
            soundEngine.playUiClick();
            setActiveModal('hangar');
          }}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setActiveModal('settings');
          }}
          onOpenAccessibility={() => {
            soundEngine.playUiClick();
            setActiveModal('accessibility');
          }}
          onOpenLeaderboard={() => {
            soundEngine.playUiClick();
            setActiveModal('leaderboard');
          }}
          onToggleDarkMode={() => {
            soundEngine.playUiClick();
            setAccessibility((prev) => ({ ...prev, darkMode: !prev.darkMode }));
          }}
          onToggleMute={handleToggleMute}
          onToggleFullscreen={handleToggleFullscreen}
        />
      )}

      {/* Screen 3: Active Gameplay HUD */}
      {screen === 'playing' && (
        <GameHud
          hud={hud}
          mode={gameMode}
          bestScore={bestScore}
          muted={settings.muted}
          onPause={handlePause}
          onToggleMute={handleToggleMute}
          onActivateBooster={() => {
            engineRef.current?.activateBooster();
          }}
          onActivateShield={() => {
            engineRef.current?.activateShield();
          }}
          onControlButton={(action, pressed) => {
            engineRef.current?.setControlButton(action, pressed);
          }}
          onJoystickInput={(steer, vertical, active) => {
            engineRef.current?.setJoystickInput(steer, vertical, active);
          }}
        />
      )}

      {/* Pause Modal */}
      {screen === 'paused' && activeModal === 'none' && (
        <PauseModal
          onResume={handleResume}
          onRestart={() => void startFlight(gameMode)}
          onOpenSettings={() => {
            soundEngine.playUiClick();
            setActiveModal('settings');
          }}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {/* Game Over Modal */}
      {screen === 'gameover' && gameOverSummary && activeModal === 'none' && (
        <GameOverModal
          summary={gameOverSummary}
          totalPoints={progress.points}
          defaultPilotName={settings.pilotName}
          onUpdatePilotName={(name) => setSettings((prev) => ({ ...prev, pilotName: name }))}
          onRetry={() => void startFlight(gameMode)}
          onOpenHangar={() => {
            soundEngine.playUiClick();
            setActiveModal('hangar');
          }}
          onOpenLeaderboard={() => {
            soundEngine.playUiClick();
            setActiveModal('leaderboard');
          }}
          onExitToMenu={handleExitToMenu}
        />
      )}

      {/* Hangar & Upgrade Shop Modal */}
      {activeModal === 'hangar' && (
        <HangarModal
          progress={progress}
          onSelectPlane={handleSelectPlane}
          onBuyMaxLife={handleBuyMaxLife}
          onBuyUpgrade={handleBuyUpgrade}
          onUpgradeModelTier={handleUpgradeModelTier}
          onSelectOrBuyWeapon={handleSelectOrBuyWeapon}
          onClose={() => {
            soundEngine.playUiClick();
            setActiveModal('none');
          }}
        />
      )}

      {/* Settings Modal */}
      {activeModal === 'settings' && (
        <SettingsModal
          settings={settings}
          onChange={(next) => {
            setSettings(next);
          }}
          onClose={() => {
            soundEngine.playUiClick();
            setActiveModal('none');
          }}
        />
      )}

      {/* Accessibility Modal */}
      {activeModal === 'accessibility' && (
        <AccessibilityModal
          accessibility={accessibility}
          onChange={setAccessibility}
          onClose={() => {
            soundEngine.playUiClick();
            setActiveModal('none');
          }}
        />
      )}

      {/* Global Leaderboard Modal */}
      {activeModal === 'leaderboard' && (
        <LeaderboardModal
          onClose={() => {
            soundEngine.playUiClick();
            setActiveModal('none');
          }}
        />
      )}
    </div>
  );
}
