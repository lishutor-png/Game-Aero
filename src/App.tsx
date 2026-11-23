import { useCallback, useEffect, useRef, useState } from 'react';
import { FlightWorldEngine } from './game/worldEngine';
import { soundEngine } from './game/audio';
import { SplashScreen } from './components/SplashScreen';
import { MainMenu } from './components/MainMenu';
import { GameHud } from './components/GameHud';
import { PauseModal } from './components/PauseModal';
import { GameOverModal } from './components/GameOverModal';
import { SettingsModal } from './components/SettingsModal';
import { AccessibilityModal } from './components/AccessibilityModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { OfflineIndicator } from './components/PWAInstallButton';
import type {
  AccessibilitySettings,
  GameMode,
  GameOverSummary,
  GameSettings,
  HudSnapshot,
  ScreenState,
} from './types/game';

const SETTINGS_KEY = 'aeroglide_settings_v1';
const A11Y_KEY = 'aeroglide_a11y_v1';
const BEST_KEY = 'aeroglide_best_score_v1';

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
  speedKmh: 250,
  difficultyLevel: 1,
  combo: 0,
  hasShield: false,
  turboRemaining: 0,
  turboDuration: 5.5,
  tiltAngleDeg: 0,
  steerInput: 0,
  activeControl: 'keyboard',
  practiceStep: 0,
  practiceMessage: '',
  themeId: 'morning',
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

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FlightWorldEngine | null>(null);

  const [screen, setScreen] = useState<ScreenState>('splash');
  const [gameMode, setGameMode] = useState<GameMode>('standard');
  const [settings, setSettings] = useState<GameSettings>(() => loadJson(SETTINGS_KEY, DEFAULT_SETTINGS));
  const [accessibility, setAccessibility] = useState<AccessibilitySettings>(() =>
    loadJson(A11Y_KEY, DEFAULT_A11Y),
  );
  const [bestScore, setBestScore] = useState<number>(() => {
    try {
      const val = Number(localStorage.getItem(BEST_KEY) || '0');
      return Number.isFinite(val) ? val : 0;
    } catch {
      return 0;
    }
  });

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [gameOverSummary, setGameOverSummary] = useState<GameOverSummary | null>(null);
  const [activeModal, setActiveModal] = useState<'none' | 'settings' | 'accessibility' | 'leaderboard'>('none');
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
          setGameOverSummary(summary);
          setScreen('gameover');
          if (summary.mode === 'standard' && summary.score > bestScore) {
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
        // Non-blocking sensor permission / calibration on user gesture
        void engineRef.current.input.requestGyroPermission();
      }
      setGameMode(mode);
      setGameOverSummary(null);
      setActiveModal('none');
      setScreen('playing');
      engineRef.current?.startSession(mode, settings);
    },
    [settings],
  );

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
    setGameOverSummary(null);
    setScreen('menu');
    announce('Kembali ke Menu Utama.');
  }, [announce]);

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
          bestScore={bestScore}
          currentThemeId={settings.selectedTheme}
          onStartGame={() => void startFlight('standard')}
          onStartPractice={() => void startFlight('practice')}
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
          defaultPilotName={settings.pilotName}
          onUpdatePilotName={(name) => setSettings((prev) => ({ ...prev, pilotName: name }))}
          onRetry={() => void startFlight(gameMode)}
          onOpenLeaderboard={() => {
            soundEngine.playUiClick();
            setActiveModal('leaderboard');
          }}
          onExitToMenu={handleExitToMenu}
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
