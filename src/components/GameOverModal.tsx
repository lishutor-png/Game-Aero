import { useState, type FormEvent } from 'react';
import { RotateCcw, Home, Trophy, Send, CheckCircle2 } from 'lucide-react';
import { ENVIRONMENT_THEMES } from '../game/themes';
import { apiUrl } from '../config/api';
import type { GameOverSummary } from '../types/game';

interface GameOverModalProps {
  summary: GameOverSummary;
  defaultPilotName: string;
  onUpdatePilotName: (name: string) => void;
  onRetry: () => void;
  onOpenLeaderboard: () => void;
  onExitToMenu: () => void;
}

export function GameOverModal({
  summary,
  defaultPilotName,
  onUpdatePilotName,
  onRetry,
  onOpenLeaderboard,
  onExitToMenu,
}: GameOverModalProps) {
  const [pilotName, setPilotName] = useState(defaultPilotName);
  const [submitting, setSubmitting] = useState(false);
  const [submittedRank, setSubmittedRank] = useState<number | null>(null);
  const [submitDone, setSubmitDone] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const theme = ENVIRONMENT_THEMES[summary.themeId];

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
      className="fixed inset-0 z-40 flex items-center justify-center p-4 overflow-y-auto"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.76)' }}
    >
      <div
        className="a11y-card w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <div className="text-center mb-5">
          {summary.isNewBest && (
            <div
              className="inline-block px-3 py-1 rounded-lg text-xs font-extrabold uppercase tracking-wider mb-2"
              style={{ backgroundColor: 'var(--ui-amber)', color: '#ffffff' }}
            >
              Rekor Pribadi Baru!
            </div>
          )}
          <h2 id="gameover-title" className="text-2xl font-extrabold">
            Penerbangan Selesai
          </h2>
          <p className="text-xs mt-1" style={{ color: 'var(--ui-text-muted)' }}>
            Tema: {theme.name}
          </p>
        </div>

        {/* Score Breakdown */}
        <div
          className="grid grid-cols-2 gap-3 p-4 rounded-xl border mb-5"
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
              Kombo Terbaik
            </div>
            <div className="text-base font-bold tabular-nums">{summary.maxCombo}x</div>
          </div>
          <div>
            <div className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
              Power-Up Diambil
            </div>
            <div className="text-base font-bold tabular-nums">{summary.powerUpsCollected}</div>
          </div>
        </div>

        {/* Online Global Leaderboard Submission */}
        {summary.mode === 'standard' && (
          <div
            className="p-4 rounded-xl border mb-5"
            style={{
              backgroundColor: 'var(--ui-surface)',
              borderColor: 'var(--ui-border)',
            }}
          >
            {submitDone ? (
              <div className="flex items-center gap-2.5 text-sm font-bold" style={{ color: 'var(--ui-success)' }}>
                <CheckCircle2 className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>
                  Skor tercatat di Papan Peringkat Global
                  {submittedRank ? ` (Peringkat #${submittedRank})` : ''}!
                </span>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-2.5">
                <label htmlFor="submit-pilot-name" className="block text-xs font-bold uppercase tracking-wide">
                  Kirim ke Papan Peringkat Global
                </label>
                <div className="flex gap-2">
                  <input
                    id="submit-pilot-name"
                    type="text"
                    maxLength={24}
                    value={pilotName}
                    onChange={(e) => setPilotName(e.target.value)}
                    placeholder="Nama Pilot Anda"
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
                    className="a11y-focus inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
                    style={{
                      backgroundColor: 'var(--ui-accent)',
                      color: 'var(--ui-accent-text)',
                    }}
                  >
                    <Send className="w-4 h-4" aria-hidden="true" />
                    <span>{submitting ? 'Kirim...' : 'Kirim'}</span>
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

        {/* Navigation Actions */}
        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onRetry}
            className="a11y-focus w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-base cursor-pointer"
            style={{
              backgroundColor: 'var(--ui-accent)',
              color: 'var(--ui-accent-text)',
            }}
          >
            <RotateCcw className="w-4 h-4" aria-hidden="true" />
            <span>Terbang Lagi</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onOpenLeaderboard}
              className="a11y-focus inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
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
              className="a11y-focus inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm border cursor-pointer"
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
  );
}
