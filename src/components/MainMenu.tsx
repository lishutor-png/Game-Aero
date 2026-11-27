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
  Heart,
  Shield,
  Flame,
  Maximize2,
  Minimize2,
  ChevronRight,
  Crosshair,
  Map as MapIcon,
} from 'lucide-react';
import { ENVIRONMENT_THEMES, THEME_IDS, normalizeMapId } from '../game/themes';
import { PLANE_CATALOG, computeEffectivePlaneStats, getDisplayWeaponLabel } from '../game/planes';
import { PWAInstallButton } from './PWAInstallButton';
import type { AccessibilitySettings, GameSettings, MapId, PlayerProgress, ThemeId } from '../types/game';

interface MainMenuProps {
  settings: GameSettings;
  accessibility: AccessibilitySettings;
  progress: PlayerProgress;
  bestScore: number;
  currentThemeId: ThemeId;
  hasOpenModal: boolean;
  isFullscreen: boolean;
  canFullscreen: boolean;
  onStartGame: () => void;
  onStartPractice: () => void;
  onSelectMap: (mapId: MapId | 'random') => void;
  onOpenHangar: () => void;
  onOpenSettings: () => void;
  onOpenAccessibility: () => void;
  onOpenLeaderboard: () => void;
  onToggleDarkMode: () => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
}

export function MainMenu({
  settings,
  accessibility,
  progress,
  bestScore,
  currentThemeId,
  hasOpenModal,
  isFullscreen,
  canFullscreen,
  onStartGame,
  onStartPractice,
  onSelectMap,
  onOpenHangar,
  onOpenSettings,
  onOpenAccessibility,
  onOpenLeaderboard,
  onToggleDarkMode,
  onToggleMute,
  onToggleFullscreen,
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

  const activeTheme = ENVIRONMENT_THEMES[normalizeMapId(currentThemeId)];
  const activePlane = PLANE_CATALOG[progress.selectedPlane];
  const stats = computeEffectivePlaneStats(progress);
  const weaponDisplay = getDisplayWeaponLabel(progress.selectedPlane, stats.weaponType);

  return (
    <main
      aria-label="Menu Utama AeroGlide 3D"
      className="fixed inset-0 z-20 flex flex-col justify-between p-3 sm:p-5 pointer-events-none"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
    >
      {/* Top Bar: Brand Identity + Clean Quick Utilities */}
      <header className="flex items-start justify-between gap-3">
        <div
          className="a11y-card pointer-events-auto flex items-center gap-3 rounded-2xl px-3.5 py-2.5 border shadow-lg"
          style={{
            backgroundColor: 'var(--ui-bg)',
            borderColor: 'var(--ui-border)',
            color: 'var(--ui-text)',
          }}
        >
          <img
            src="/icon.svg"
            alt="Logo AeroGlide 3D"
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl shrink-0 shadow-sm"
          />
          <div className="min-w-0">
            <h1 className="font-display text-xl sm:text-2xl font-bold tracking-tight leading-none whitespace-nowrap">
              AERO<span style={{ color: 'var(--ui-accent)' }}>GLIDE</span> 3D
            </h1>
            <div
              className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] sm:text-xs mt-1 font-medium tabular-nums"
              style={{ color: 'var(--ui-text-muted)' }}
            >
              <span>{settings.pilotName || 'Pilot'}</span>
              <span aria-hidden="true">·</span>
              <span>Rekor {bestScore.toLocaleString('id-ID')}</span>
              <span aria-hidden="true">·</span>
              <span className="font-bold" style={{ color: 'var(--ui-amber)' }}>
                {progress.points.toLocaleString('id-ID')} Poin
              </span>
            </div>
          </div>
        </div>

        {/* Top-Right Utility Controls */}
        <div className="pointer-events-auto flex items-center justify-end gap-1.5 sm:gap-2">
          <PWAInstallButton />

          {canFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              aria-pressed={isFullscreen}
              aria-label={isFullscreen ? 'Keluar dari layar penuh' : 'Aktifkan layar penuh'}
              title={isFullscreen ? 'Keluar Layar Penuh' : 'Layar Penuh'}
              className="a11y-focus a11y-card flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold shadow-sm cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
              style={{
                backgroundColor: 'var(--ui-bg)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              <span className="hidden md:inline">{isFullscreen ? 'Normal' : 'Layar Penuh'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-pressed={accessibility.darkMode}
            aria-label={accessibility.darkMode ? 'Matikan mode gelap' : 'Aktifkan mode gelap malam'}
            title="Mode Gelap"
            className="a11y-focus a11y-card flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold shadow-sm cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--ui-bg)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {accessibility.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden md:inline">{accessibility.darkMode ? 'Terang' : 'Gelap'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={settings.muted}
            aria-label={settings.muted ? 'Nyalakan suara dan musik' : 'Bisukan suara dan musik'}
            title={settings.muted ? 'Nyalakan Suara' : 'Bisukan'}
            className="a11y-focus a11y-card flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-semibold shadow-sm cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
            style={{
              backgroundColor: 'var(--ui-bg)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="hidden md:inline">{settings.muted ? 'Senyap' : 'Audio'}</span>
          </button>
        </div>
      </header>

      {/* Bottom Corner Framing: Keeps Center 3D Gliding Plane 100% Unobstructed */}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-between gap-3">
          {/* Bottom-Left: Active Aircraft + Map Selector */}
          <section
            aria-label="Pesawat & Map Aktif"
            className="a11y-card pointer-events-auto rounded-2xl p-3 sm:p-3.5 border shadow-xl sm:max-w-sm w-full space-y-2.5"
            style={{
              backgroundColor: 'var(--ui-bg)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold" style={{ color: 'var(--ui-text-muted)' }}>
                  {activePlane.roleLabel} · Tier {stats.modelTier}/4
                </div>
                <h2 className="font-display text-base sm:text-lg font-bold truncate" style={{ color: activePlane.accentHex }}>
                  {activePlane.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenHangar}
                className="a11y-focus inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer transition-transform active:scale-95 whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--ui-amber)',
                  color: '#ffffff',
                }}
              >
                <Plane className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Hangar</span>
                <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>

            <div className="pt-2 border-t flex flex-wrap items-center justify-between gap-1.5 text-[11px] tabular-nums" style={{ borderColor: 'var(--ui-border)' }}>
              <span className="inline-flex items-center gap-1 font-bold" style={{ color: '#ef4444' }}>
                <Heart className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                <span>{stats.maxLives} Hati</span>
              </span>

              {stats.maxArmorCharges > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#0d9488' }}>
                  <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{stats.maxArmorCharges} Perisai</span>
                </span>
              )}

              {stats.maxJetCharges > 0 && (
                <span className="inline-flex items-center gap-1 font-semibold" style={{ color: '#ea580c' }}>
                  <Flame className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{stats.maxJetCharges}x Jet</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1 font-bold" style={{ color: weaponDisplay.colorCss }}>
                <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{weaponDisplay.name}</span>
              </span>
            </div>

            {/* Quick 5-Map Selector */}
            <div className="pt-2 border-t" style={{ borderColor: 'var(--ui-border)' }}>
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--ui-text-muted)' }}>
                <span className="inline-flex items-center gap-1">
                  <MapIcon className="w-3 h-3" aria-hidden="true" />
                  Pilih Map 3D
                </span>
                <span>{settings.randomThemePerSession ? 'Acak' : activeTheme.name}</span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {THEME_IDS.map((mid) => {
                  const t = ENVIRONMENT_THEMES[mid];
                  const active = !settings.randomThemePerSession && normalizeMapId(settings.selectedTheme) === mid;
                  return (
                    <button
                      key={mid}
                      type="button"
                      onClick={() => onSelectMap(mid)}
                      aria-pressed={active}
                      className="a11y-focus py-1.5 px-1 rounded-lg text-[10px] font-bold cursor-pointer truncate border transition-colors"
                      style={{
                        backgroundColor: active ? t.uiAccentCss : 'var(--ui-surface)',
                        color: active ? '#ffffff' : 'var(--ui-text)',
                        borderColor: active ? t.uiAccentCss : 'var(--ui-border)',
                      }}
                    >
                      {t.shortName}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => onSelectMap('random')}
                  aria-pressed={settings.randomThemePerSession}
                  className="a11y-focus py-1.5 px-1 rounded-lg text-[10px] font-bold cursor-pointer truncate border transition-colors"
                  style={{
                    backgroundColor: settings.randomThemePerSession ? 'var(--ui-accent)' : 'var(--ui-surface)',
                    color: settings.randomThemePerSession ? '#ffffff' : 'var(--ui-text)',
                    borderColor: settings.randomThemePerSession ? 'var(--ui-accent)' : 'var(--ui-border)',
                  }}
                >
                  Acak
                </button>
              </div>
            </div>
          </section>

          {/* Bottom-Right: Dominant Launch CTA + Secondary Navigation */}
          <nav
            aria-label="Navigasi Permainan"
            className="a11y-card pointer-events-auto rounded-2xl p-3 sm:p-4 border shadow-xl flex flex-col gap-2.5"
            style={{
              backgroundColor: 'var(--ui-bg)',
              borderColor: 'var(--ui-border)',
              color: 'var(--ui-text)',
            }}
          >
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStartGame}
                className="a11y-focus flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-display font-bold text-sm sm:text-base shadow-lg cursor-pointer transition-transform active:scale-[0.97] whitespace-nowrap shrink-0"
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
                className="a11y-focus inline-flex items-center justify-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm border cursor-pointer transition-colors whitespace-nowrap shrink-0"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <GraduationCap className="w-4 h-4" aria-hidden="true" />
                <span>Latihan</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onOpenLeaderboard}
                className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Peringkat</span>
              </button>

              <button
                type="button"
                onClick={onOpenSettings}
                className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <Settings className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Pengaturan</span>
              </button>

              <button
                type="button"
                onClick={onOpenAccessibility}
                className="a11y-focus inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-xs border cursor-pointer transition-colors whitespace-nowrap"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                  color: 'var(--ui-text)',
                }}
              >
                <Accessibility className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Aksesibel</span>
              </button>
            </div>
          </nav>
        </div>

        {/* Single Clean Control Hint Line */}
        <div
          className="text-[11px] font-medium text-center py-0.5 drop-shadow-sm"
          style={{ color: 'var(--ui-text)' }}
        >
          WASD / Panah · Spasi Tembak · Shift Booster · Q Perisai · Multitouch Layar Sentuh
        </div>
      </div>
    </main>
  );
}
