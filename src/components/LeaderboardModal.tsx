import { useCallback, useEffect, useState } from 'react';
import { X, Trophy, RefreshCw, Smartphone, Keyboard, Hand } from 'lucide-react';
import { ENVIRONMENT_THEMES, normalizeMapId } from '../game/themes';
import { apiUrl } from '../config/api';
import type { LeaderboardEntry } from '../types/game';

interface LeaderboardModalProps {
  onClose: () => void;
}

export function LeaderboardModal({ onClose }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchBoard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(apiUrl('/api/leaderboard'));
      if (!res.ok) throw new Error('Gagal memuat papan peringkat');
      const data = (await res.json()) as { entries: LeaderboardEntry[] };
      setEntries(Array.isArray(data.entries) ? data.entries : []);
    } catch {
      setError('Tidak dapat terhubung ke server papan peringkat saat ini.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchBoard();
  }, [fetchBoard]);

  const renderControlIcon = (ctrl: string) => {
    if (ctrl === 'gyro') return <Smartphone className="w-3.5 h-3.5" aria-label="Giroskop" />;
    if (ctrl === 'touch') return <Hand className="w-3.5 h-3.5" aria-label="Sentuh" />;
    return <Keyboard className="w-3.5 h-3.5" aria-label="Keyboard" />;
  };

  const getControlLabel = (ctrl: string) => {
    if (ctrl === 'gyro') return 'Giro';
    if (ctrl === 'touch') return 'Sentuh';
    return 'Tombol';
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="leaderboard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.72)' }}
    >
      <div
        className="a11y-card w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl border p-5 sm:p-6 shadow-2xl"
        style={{
          backgroundColor: 'var(--ui-bg-solid)',
          borderColor: 'var(--ui-border)',
          color: 'var(--ui-text)',
        }}
      >
        <div className="flex items-center justify-between gap-4 pb-4 border-b" style={{ borderColor: 'var(--ui-border)' }}>
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6" style={{ color: 'var(--ui-amber)' }} aria-hidden="true" />
            <div>
              <h2 id="leaderboard-title" className="text-xl font-extrabold">
                Papan Peringkat Global
              </h2>
              <p className="text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                Kompetisi skor tertinggi pilot dari seluruh dunia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void fetchBoard()}
              aria-label="Muat ulang papan peringkat"
              className="a11y-focus p-2 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup papan peringkat"
              className="a11y-focus p-2 rounded-xl border cursor-pointer"
              style={{
                backgroundColor: 'var(--ui-surface)',
                borderColor: 'var(--ui-border)',
                color: 'var(--ui-text)',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {loading ? (
            <div className="py-12 text-center text-sm" style={{ color: 'var(--ui-text-muted)' }}>
              Memuat papan peringkat daring...
            </div>
          ) : error ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-sm font-medium" style={{ color: 'var(--ui-danger)' }}>
                {error}
              </p>
              <button
                type="button"
                onClick={() => void fetchBoard()}
                className="a11y-focus px-4 py-2 rounded-xl text-xs font-bold cursor-pointer"
                style={{ backgroundColor: 'var(--ui-accent)', color: 'var(--ui-accent-text)' }}
              >
                Coba Lagi
              </button>
            </div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-base font-bold">Belum ada skor tercatat</p>
              <p className="text-sm" style={{ color: 'var(--ui-text-muted)' }}>
                Terbang di Mode Standar dan kirimkan skor Anda untuk menjadi pilot pertama di peringkat #1!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const theme = ENVIRONMENT_THEMES[normalizeMapId(entry.themeId)];
                return (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border"
                    style={{
                      backgroundColor: rank <= 3 ? 'var(--ui-surface-muted)' : 'var(--ui-surface)',
                      borderColor: rank === 1 ? 'var(--ui-amber)' : 'var(--ui-border)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold tabular-nums shrink-0"
                        style={{
                          backgroundColor:
                            rank === 1
                              ? '#f59e0b'
                              : rank === 2
                                ? '#94a3b8'
                                : rank === 3
                                  ? '#b45309'
                                  : 'var(--ui-surface-muted)',
                          color: rank <= 3 ? '#ffffff' : 'var(--ui-text)',
                        }}
                      >
                        {rank}
                      </span>
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate">{entry.pilotName}</div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ui-text-muted)' }}>
                          <span className="inline-flex items-center gap-1">
                            {renderControlIcon(entry.controlUsed)}
                            <span>{getControlLabel(entry.controlUsed)}</span>
                          </span>
                          <span>·</span>
                          <span>{theme.name}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-base font-extrabold tabular-nums">
                        {entry.score.toLocaleString('id-ID')}
                      </div>
                      <div className="text-xs tabular-nums" style={{ color: 'var(--ui-text-muted)' }}>
                        {entry.distance.toLocaleString('id-ID')} m
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
