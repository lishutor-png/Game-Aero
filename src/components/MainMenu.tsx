import { useEffect } from 'react';
import {
  Play,
  GraduationCap,
  Trophy,
  Settings,
  Accessibility,
  Moon,
  Sun,
  Volume2,
  VolumeX,
  Plane,
  Coins,
  Heart,
} from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import { PLANE_CATALOG, computeEffectivePlaneStats } from '../game/planes';
import { PWAInstallButton } from './PWAInstallButton';
import type { AccessibilitySettings, GameSettings, PlayerProgress, ThemeId } from '../types/game';

interface MainMenuProps {
  settings: GameSettings;
  accessibility: AccessibilitySettings;
  progress: PlayerProgress;
  bestScore: number;
  currentThemeId: ThemeId;
  hasOpenModal: boolean;
  onStartGame: () => void;
  onStartPractice: () => void;
  onOpenHangar: () => void;
  onOpenSettings: () => void;
  onOpenAccessibility: () => void;
  onOpenLeaderboard: () => void;
  onToggleDarkMode: () => void;
  onToggleMute: () => void;
}

export function MainMenu({
  settings,
  accessibility,
  progress,
  bestScore,
  currentThemeId,
  hasOpenModal,
  onStartGame,
  onStartPractice,
  onOpenHangar,
  onOpenSettings,
  onOpenAccessibility,
  onOpenLeaderboard,
  onToggleDarkMode,
  onToggleMute,
}: MainMenuProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (hasOpenModal) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Enter') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [hasOpenModal, onStartGame]);

  const activeTheme = ENVIRONMENT_THEMES[currentThemeId];
  const activePlane = PLANE_CATALOG[progress.selectedPlane];
  const stats = computeEffectivePlaneStats(progress);

  return (
    <main
      aria-label="Menu Utama AeroGlide 3D"
      className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none"
    >
      {/* Top Row: Brand Title Lockup + Points/Lives + Quick Utility Toggles */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div
          className="a11y-card pointer-events-auto rounded-2xl px-4 py-3 border shadow-lg max-w-lg"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          <div className="flex items-center gap-3">
            <img
              src="/icon.svg"
              alt="Logo AeroGlide 3D"
              className="w-11 h-11 rounded-xl shrink-0 shadow-sm"
            />
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-none">
                AERO<span style={{ color: 'var(--ui-accent)' }}>GLIDE</span> 3D
              </h1>
              <p className="text-[11px] sm:text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                Tema: <strong>{settings.randomThemePerSession ? 'Acak Tiap Sesi' : activeTheme.name}</strong> · Rekor:{' '}
                <strong className="tabular-nums">{bestScore.toLocaleString('id-ID')}</strong>
              </p>
              <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-[11px] font-bold">
                <span className="inline-flex items-center gap-1" style={{ color: activePlane.accentHex }}>
                  <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{activePlane.name}</span>
                </span>
                <span className="inline-flex items-center gap-1" style={{ color: '#ef4444' }}>
                  <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                  <span>{stats.maxLives} Nyawa</span>
                </span>
                <span className="inline-flex items-center gap-1 tabular-nums" style={{ color: 'var(--ui-amber)' }}>
                  <Coins className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{progress.points.toLocaleString('id-ID')} Poin</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Mode & Audio Controls */}
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <PWAInstallButton />

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-pressed={accessibility.darkMode}
            aria-label={accessibility.darkMode ? 'Matikan mode gelap' : 'Aktifkan mode gelap malam'}
            title="Mode Gelap (Malam Hari)"
            className="a11y-focus a11y-card flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold shadow-sm cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {accessibility.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{accessibility.darkMode ? 'Terang' : 'Gelap'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={settings.muted}
            aria-label={settings.muted ? 'Nyalakan suara dan musik' : 'Bisukan suara dan musik'}
            title={settings.muted ? 'Nyalakan Suara' : 'Bisukan'}
            className="a11y-focus a11y-card flex items-center gap-2 px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold shadow-sm cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{settings.muted ? 'Senyap' : 'Audio'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Dock: Keeps center 3D gliding plane 100% unobstructed */}
      <div className="flex flex-col items-center gap-2 w-full max-w-4xl mx-auto">
        <nav
          aria-label="Navigasi Permainan"
          className="a11y-card pointer-events-auto w-full rounded-2xl p-2.5 sm:p-3.5 border shadow-xl flex flex-wrap items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          {/* Primary Play + Practice + Hangar */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStartGame}
              className="a11y-focus inline-flex items-center justify-center gap-2 px-5 py-2.5 sm:py-3 rounded-xl font-bold text-sm sm:text-base shadow-md cursor-pointer transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--ui-accent)',
                color: 'var(--ui-accent-text)',
              }}
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" aria-hidden="true" />
              <span>Mulai Terbang</span>
            </button>

            <button
              type="button"
              onClick={onStartPractice}
              className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              <span>Latihan</span>
            </button>

            <button
              type="button"
              onClick={onOpenHangar}
              className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-amber)',
                borderColor: 'var(--ui-amber)',
                color: '#ffffff',
              }}
            >
              <Plane className="w-4 h-4" aria-hidden="true" />
              <span>Pesawat &amp; Upgrade</span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <Trophy className="w-4 h-4" aria-hidden="true" />
              <span>Peringkat</span>
            </button>

            <button
              type="button"
              onClick={onOpenSettings}
              className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <Settings className="w-4 h-4" aria-hidden="true" />
              <span>Pengaturan</span>
            </button>

            <button
              type="button"
              onClick={onOpenAccessibility}
              className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <Accessibility className="w-4 h-4" aria-hidden="true" />
              <span>Aksesibel</span>
            </button>
          </div>
        </nav>

        {/* Single flat control-hint line */}
        <div
          className="px-3 py-1 rounded-lg text-[11px] font-medium text-center border"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text-muted)',
          }}
        >
          Miringkan Perangkat Kiri/Kanan · A / D atau Panah · Sentuh Geser · Spasi Booster
        </div>
      </div>
    </main>
  );
}
