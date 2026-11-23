import { useCallback, useEffect, useRef, useState } from 'react';
import { FlightWorldEngine } from './game/worldEngine';
import { soundEngine } from './game/audio';
import {
  BALANCE_BOOSTER_COSTS,
  BALANCE_SPEED_COSTS,
  BALANCE_STRENGTH_COSTS,
  DEFAULT_PROGRESS,
  MAX_LIVES_COSTS,
  MAX_LIVES_UPGRADE_CAP,
  TITAN_STRENGTH_COSTS,
  VORTEX_BOOSTER_COSTS,
  VORTEX_SPEED_COSTS,
  computeEffectivePlaneStats,
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
  PlayerProgress,
  PlayerUpgrades,
  ScreenState,
} from './types/game';

const SETTINGS_KEY = 'aeroglide_settings_v1';
const A11Y_KEY = 'aeroglide_a11y_v1';
const BEST_KEY = 'aeroglide_best_score_v1';
const PROGRESS_KEY = 'aeroglide_progress_v1';

const DEFAULT_SETTINGS: GameSettings = {
  gyroEnabled: true,
  gyroSensitivity: 1.25,
  gyroDeadzone: 3.0,
  invertGyro: false,
  randomThemePerSession: true,
  selectedTheme: 'morning',
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
  lives: 3,
  maxLives: 3,
  armorRemaining: 0,
  pointsEarned: 0,
  hasShield: false,
  turboRemaining: 0,
  turboDuration: 5.5,
  hasBooster: false,
  boosterActiveRemaining: 0,
  boosterCooldownRemaining: 0,
  boosterCooldownTotal: 0,
  planeId: 'balance',
  tiltAngleDeg: 0,
  steerInput: 0,
  activeControl: 'keyboard',
  practiceStep: 0,
  practiceMessage: '',
  themeId: 'morning',
};

const UPGRADE_COST_MAP: Record<keyof PlayerUpgrades, number[]> = {
  titanStrength: TITAN_STRENGTH_COSTS,
  vortexSpeed: VORTEX_SPEED_COSTS,
  vortexBooster: VORTEX_BOOSTER_COSTS,
  balanceStrength: BALANCE_STRENGTH_COSTS,
  balanceSpeed: BALANCE_SPEED_COSTS,
  balanceBooster: BALANCE_BOOSTER_COSTS,
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

function loadProgress(): PlayerProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return DEFAULT_PROGRESS;
    const parsed = JSON.parse(raw) as Partial<PlayerProgress>;
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      upgrades: {
        ...DEFAULT_PROGRESS.upgrades,
        ...(parsed.upgrades ?? {}),
      },
    };
  } catch {
    return DEFAULT_PROGRESS;
  }
}

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlightWorldEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [settings, setSettings] = useState<GameSettings>(() => loadJson(SETTINGS_KEY, DEFAULT_SETTINGS));
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

    engine.setPlaneType(progress.selectedPlane);
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
      try {
        const orientation = window.screen?.orientation as unknown as { lock?: (o: string) => Promise<void> };
        if (typeof orientation?.lock === 'function') {
          void orientation.lock('landscape').catch(() => {});
        }
      } catch {
        // ignore where orientation lock is unsupported
      }
      if (settings.gyroEnabled && engineRef.current) {
        void engineRef.current.input.requestGyroPermission();
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
      setProgress((prev) => ({ ...prev, selectedPlane: planeId }));
      engineRef.current?.setPlaneType(planeId);
      announce(`Pesawat diganti ke ${planeId}.`);
    },
    [announce],
  );

  const handleBuyMaxLife = useCallback(() => {
    setProgress((prev) => {
      if (prev.maxLivesBonus >= MAX_LIVES_UPGRADE_CAP) return prev;
      const cost = MAX_LIVES_COSTS[prev.maxLivesBonus];
      if (prev.points < cost) return prev;
      soundEngine.playPowerUp('shield');
      return {
        ...prev,
        points: prev.points - cost,
        maxLivesBonus: prev.maxLivesBonus + 1,
      };
    });
  }, []);

  const handleBuyUpgrade = useCallback((key: keyof PlayerUpgrades) => {
    setProgress((prev) => {
      const costs = UPGRADE_COST_MAP[key];
      const currentLv = prev.upgrades[key];
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
    engineRef.current?.setPlaneType(progress.selectedPlane);
    setGameOverSummary(null);
    setScreen('menu');
    announce('Kembali ke Menu Utama.');
  }, [announce, progress.selectedPlane]);

  const handleCalibrate = useCallback(() => {
    soundEngine.playUiClick();
    engineRef.current?.input.calibrateCenter();
    announce('Posisi tengah sensor giroskop dikalibrasi.');
  }, [announce]);

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
    <div className="relative w-screen h-screen overflow-hidden">
      {/* Live Screen Reader Announcer */}
      <div className="sr-only-live" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Offline Connectivity Banner */}
      <OfflineIndicator />

      {/* Isolated WebGL Canvas Container */}
      <div
        ref={canvasMountRef}
        className="fixed inset-0 z-0"
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
          currentThemeId={settings.selectedTheme}
          hasOpenModal={activeModal !== 'none'}
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
          onCalibrate={handleCalibrate}
          onActivateBooster={() => {
            engineRef.current?.activateBooster();
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
          onCalibrate={handleCalibrate}
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
          onChange={setSettings}
          onRequestGyro={async () => {
            if (!engineRef.current) return 'Mesin 3D belum siap.';
            const res = await engineRef.current.input.requestGyroPermission();
            return res.message;
          }}
          onCalibrate={handleCalibrate}
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
