import { useState, type FormEvent } from 'react';
import { RotateCcw, Home, Trophy, Send, CheckCircle2, Coins, Wrench } from 'lucide-react';
import { ENVIRONMENT_THEMES, normalizeMapId } from '../game/themes';
import { MODEL_TIER_CATALOG, PLANE_CATALOG, getDisplayWeaponLabel } from '../game/planes';
import { apiUrl } from '../config/api';
import type { GameOverSummary } from '../types/game';

interface GameOverModalProps {
  summary: GameOverSummary;
  totalPoints: number;
  defaultPilotName: string;
  onUpdatePilotName: (name: string) => void;
  onRetry: () => void;
  onOpenHangar: () => void;
  onOpenLeaderboard: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  summary,
  totalPoints,
  defaultPilotName,
  onUpdatePilotName,
  onRetry,
  onOpenHangar,
  onOpenLeaderboard,
  onExitToMenu,
}: GameOverModalProps) {
  const [pilotName, setPilotName] = useState(defaultPilotName);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const theme = ENVIRONMENT_THEMES[normalizeMapId(summary.themeId)];
  const planeDef = PLANE_CATALOG[summary.planeId];
  const tierDef = MODEL_TIER_CATALOG[summary.modelTier];
  const weaponDisplay = getDisplayWeaponLabel(summary.planeId, summary.weaponType);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submitDone) return;
    setSubmitting(true);
    setSubmitError('');

    const cleanName = pilotName.trim() || 'Pilot Anonim';
    onUpdatePilotName(cleanName);

    try {
      const res = await fetch(apiUrl('/api/leaderboard'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pilotName: cleanName,
          score: summary.score,
          distance: summary.distance,
          themeId: summary.themeId,
          controlUsed: summary.controlUsed,
        }),
      });
      if (!res.ok) throw new Error('Gagal mengirim skor');
      const data = (await res.json()) as { rank: number | null };
      setSubmittedRank(data.rank);
      setSubmitDone(true);
    } catch {
      setSubmitError('Gagal mengirim skor ke papan peringkat daring.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="gameover-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.82)' }}
    >
      <div
        className="a11y-card my-auto w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border-2 p-4 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
          <div>
            <div className="flex items-center gap-2">
              <h2 id="gameover-title" className="text-xl sm:text-2xl font-extrabold">
                Penerbangan Selesai
              </h2>
              {summary.isNewBest && (
                <span
                  className="px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ backgroundColor: 'var(--ui-amber)', color: '#ffffff' }}
                >
                  Rekor Baru!
                </span>
              )}
            </div>
            <p className="text-xs mt-0.5" style={{ color: 'var(--ui-text-muted)' }}>
              {planeDef.name} (Lv.{tierDef.tier}) · {weaponDisplay.name} · Peta: {theme.name}
            </p>
          </div>

          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-extrabold tabular-nums"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-amber)',
              color: 'var(--ui-amber)',
            }}
          >
            <Coins className="w-4 h-4" aria-hidden="true" />
            <span>Total Poin: {totalPoints.toLocaleString('id-ID')}</span>
          </div>
        </div>

        {/* Landscape 2-Column Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
          {/* Left Column: Score & Points Breakdown */}
          <div
            className="grid grid-cols-2 gap-3 p-3.5 rounded-xl border"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
            }}
          >
            <div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Total Skor
              </div>
              <div className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--ui-accent)' }}>
                {summary.score.toLocaleString('id-ID')}
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Jarak Terbang
              </div>
              <div className="text-2xl font-extrabold tabular-nums">
                {summary.distance.toLocaleString('id-ID')} m
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Poin Didapat
              </div>
              <div className="text-base font-extrabold tabular-nums" style={{ color: 'var(--ui-amber)' }}>
                +{summary.pointsEarned.toLocaleString('id-ID')} Poin
              </div>
            </div>
            <div>
              <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Musuh Hancur / Kombo
              </div>
              <div className="text-base font-bold tabular-nums">
                {summary.enemiesDestroyed} musuh · {summary.maxCombo}x
              </div>
            </div>
          </div>

          {/* Right Column: Leaderboard Submit + Navigation Actions */}
          <div className="space-y-3">
            {summary.mode === 'standard' && (
              <div
                className="p-3.5 rounded-xl border"
                style={{
                  backgroundColor: 'var(--ui-surface)',
                  borderColor: 'var(--ui-border)',
                }}
              >
                {submitDone ? (
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-bold" style={{ color: 'var(--ui-success)' }}>
                    <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                    <span>
                      Skor tercatat di Peringkat Global
                      {submittedRank ? ` (#${submittedRank})` : ''}!
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-2">
                    <label htmlFor="submit-pilot-name" className="block text-[11px] font-bold uppercase tracking-wide">
                      Kirim ke Papan Peringkat Global
                    </label>
                    <div className="flex gap-2">
                      <input
                        id="submit-pilot-name"
                        type="text"
                        maxLength={24}
                        value={pilotName}
                        onChange={(e) => setPilotName(e.target.value)}
                        placeholder="Nama Pilot"
                        className="a11y-focus flex-1 min-w-0 px-3 py-2 rounded-xl border text-sm"
                        style={{
                          backgroundColor: 'var(--ui-bg-solid)',
                          borderColor: 'var(--ui-border)',
                          color: 'var(--ui-text)',
                        }}
                      />
                      <button
                        type="submit"
                        disabled={submitting}
                        className="a11y-focus inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
                        style={{
                          backgroundColor: 'var(--ui-accent)',
                          color: 'var(--ui-accent-text)',
                        }}
                      >
                        <Send className="w-4 h-4" aria-hidden="true" />
                        <span>{submitting ? '...' : 'Kirim'}</span>
                      </button>
                    </div>
                    {submitError && (
                      <p className="text-xs font-medium" style={{ color: 'var(--ui-danger)' }}>
                        {submitError}
                      </p>
                    )}
                  </form>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onRetry}
                  className="a11y-focus inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                  style={{
                    backgroundColor: 'var(--ui-accent)',
                    color: 'var(--ui-accent-text)',
                  }}
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  <span>Terbang Lagi</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenHangar}
                  className="a11y-focus inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
                  style={{
                    backgroundColor: 'var(--ui-amber)',
                    color: '#ffffff',
                  }}
                >
                  <Wrench className="w-4 h-4" aria-hidden="true" />
                  <span>Hangar &amp; Beli</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onOpenLeaderboard}
                  className="a11y-focus inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer"
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
                  onClick={onExitToMenu}
                  className="a11y-focus inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm border cursor-pointer"
                  style={{
                    backgroundColor: 'var(--ui-surface-muted)',
                    borderColor: 'var(--ui-border)',
                    color: 'var(--ui-text)',
                  }}
                >
                  <Home className="w-4 h-4" aria-hidden="true" />
                  <span>Menu Utama</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
