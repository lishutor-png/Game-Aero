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
} from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import { PWAInstallButton } from './PWAInstallButton';
import type { AccessibilitySettings, GameSettings, ThemeId } from '../types/game';

interface MainMenuProps {
  settings: GameSettings;
  accessibility: AccessibilitySettings;
  bestScore: number;
  currentThemeId: ThemeId;
  onStartGame: () => void;
  onStartPractice: () => void;
  onOpenSettings: () => void;
  onOpenAccessibility: () => void;
  onOpenLeaderboard: () => void;
  onToggleDarkMode: () => void;
  onToggleMute: () => void;
}

export function MainMenu({
  settings,
  accessibility,
  bestScore,
  currentThemeId,
  onStartGame,
  onStartPractice,
  onOpenSettings,
  onOpenAccessibility,
  onOpenLeaderboard,
  onToggleDarkMode,
  onToggleMute,
}: MainMenuProps) {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        onStartGame();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStartGame]);

  const activeTheme = ENVIRONMENT_THEMES[currentThemeId];

  return (
    <main
      aria-label="Menu Utama AeroGlide 3D"
      className="fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 pointer-events-none"
    >
      {/* Top Row: Brand Title Lockup + Quick Utility Toggles */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div
          className="a11y-card pointer-events-auto rounded-2xl px-5 py-4 border shadow-lg max-w-md"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          <div className="flex items-center gap-3">
            <svg
              width="44"
              height="44"
              viewBox="0 0 64 64"
              fill="none"
              aria-hidden="true"
              className="shrink-0"
            >
              <rect width="64" height="64" rx="16" fill="var(--ui-accent)" />
              <path
                d="M32 12L40 31L54 38V43L39 39L37 50L44 54V57L32 54L20 57V54L27 50L25 39L10 43V38L24 31L32 12Z"
                fill="var(--ui-accent-text)"
              />
            </svg>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight leading-none">
                AERO<span style={{ color: 'var(--ui-accent)' }}>GLIDE</span> 3D
              </h1>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--ui-text-muted)' }}>
                Tema: <strong>{settings.randomThemePerSession ? 'Acak Tiap Sesi' : activeTheme.name}</strong> · Rekor:{' '}
                <strong className="tabular-nums">{bestScore.toLocaleString('id-ID')}</strong>
              </p>
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
            className="a11y-focus a11y-card flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold shadow-sm cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {accessibility.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{accessibility.darkMode ? 'Mode Terang' : 'Mode Gelap'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={settings.muted}
            aria-label={settings.muted ? 'Nyalakan suara dan musik' : 'Bisukan suara dan musik'}
            title={settings.muted ? 'Nyalakan Suara' : 'Bisukan'}
            className="a11y-focus a11y-card flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-sm font-semibold shadow-sm cursor-pointer transition-colors"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden sm:inline">{settings.muted ? 'Senyap' : 'Audio Aktif'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Dock: Keeps center 3D gliding plane 100% unobstructed */}
      <div className="flex flex-col items-center gap-3 w-full max-w-3xl mx-auto">
        <nav
          aria-label="Navigasi Permainan"
          className="a11y-card pointer-events-auto w-full rounded-2xl p-3 sm:p-4 border shadow-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          {/* Primary Play Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <button
              type="button"
              onClick={onStartGame}
              className="a11y-focus inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-base shadow-md cursor-pointer transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: 'var(--ui-accent)',
                color: 'var(--ui-accent-text)',
              }}
            >
              <Play className="w-5 h-5 fill-current" aria-hidden="true" />
              <span>Mulai Terbang</span>
            </button>

            <button
              type="button"
              onClick={onStartPractice}
              className="a11y-focus inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl font-semibold text-sm border cursor-pointer transition-colors"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <GraduationCap className="w-4 h-4" aria-hidden="true" />
              <span>Mode Latihan</span>
            </button>
          </div>

          {/* Secondary Actions */}
          <div className="grid grid-cols-3 sm:flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="a11y-focus inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl font-semibold text-sm border cursor-pointer transition-colors"
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
              className="a11y-focus inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl font-semibold text-sm border cursor-pointer transition-colors"
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
              className="a11y-focus inline-flex items-center justify-center gap-2 px-3.5 py-3 rounded-xl font-semibold text-sm border cursor-pointer transition-colors"
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
          className="px-4 py-1.5 rounded-lg text-xs font-medium text-center border"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text-muted)',
          }}
        >
          Miringkan Perangkat Kiri/Kanan · A / D atau Panah · Sentuh Geser · Enter Mulai
        </div>
      </div>
    </main>
  );
}
