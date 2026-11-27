import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface LeaderboardRecord {
  id: string;
  pilotName: string;
  score: number;
  distance: number;
  themeId: string;
  controlUsed: string;
  createdAt: string;
}

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'leaderboard.json');
const MAX_ENTRIES = 100;

function ensureStorage(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, '[]', 'utf8');
  }
}

function readLeaderboard(): LeaderboardRecord[] {
  ensureStorage();
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function writeLeaderboard(entries: LeaderboardRecord[]): void {
  ensureStorage();
  fs.writeFileSync(DATA_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

function sanitizePilotName(name: unknown): string {
  if (typeof name !== 'string') return 'Pilot Anonim';
  const cleaned = name.replace(/[^\p{L}\p{N}\s\-_.]/gu, '').trim().slice(0, 24);
  return cleaned.length >= 2 ? cleaned : 'Pilot Anonim';
}

async function startServer(): Promise<void> {
  const app = express();
  const isProd = process.env.NODE_ENV === 'production';
  const port = isProd
    ? Number(process.env.PORT) || 3000
    : Number(process.env.DEFAULT_APP_PORT) || 3000;

  app.use(express.json({ limit: '16kb' }));

  app.use('/api', (_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (_req.method === 'OPTIONS') {
      res.sendStatus(204);
      return;
    }
    next();
  });

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.get('/api/leaderboard', (_req, res) => {
    const entries = readLeaderboard()
      .sort((a, b) => b.score - a.score || b.distance - a.distance)
      .slice(0, 50);
    res.json({ entries });
  });

  app.post('/api/leaderboard', (req, res) => {
    const body = req.body as Record<string, unknown> | undefined;
    if (!body) {
      res.status(400).json({ error: 'Payload tidak valid.' });
      return;
    }

    const rawScore = Number(body.score);
    const rawDistance = Number(body.distance);
    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 10_000_000) {
      res.status(400).json({ error: 'Skor tidak valid.' });
      return;
    }
    if (!Number.isFinite(rawDistance) || rawDistance < 0 || rawDistance > 1_000_000) {
      res.status(400).json({ error: 'Jarak tidak valid.' });
      return;
    }

    const allowedThemes = ['space', 'city', 'forest', 'desert', 'snow', 'morning', 'sunset', 'arctic', 'midnight'];
    const themeId =
      typeof body.themeId === 'string' && allowedThemes.includes(body.themeId)
        ? body.themeId
        : 'space';

    const allowedControls = ['gyro', 'keyboard', 'touch'];
    const controlUsed =
      typeof body.controlUsed === 'string' && allowedControls.includes(body.controlUsed)
        ? body.controlUsed
        : 'keyboard';

    const entry: LeaderboardRecord = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      pilotName: sanitizePilotName(body.pilotName),
      score: Math.round(rawScore),
      distance: Math.round(rawDistance),
      themeId,
      controlUsed,
      createdAt: new Date().toISOString(),
    };

    const existing = readLeaderboard();
    existing.push(entry);
    existing.sort((a, b) => b.score - a.score || b.distance - a.distance);
    const trimmed = existing.slice(0, MAX_ENTRIES);
    writeLeaderboard(trimmed);

    const rank = trimmed.findIndex((item) => item.id === entry.id) + 1;
    res.status(201).json({ entry, rank: rank > 0 ? rank : null });
  });

  if (isProd) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    process.env.DISABLE_HMR = 'true';
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript').send(`
const sheetsMap = new Map();
export function updateStyle(id, content) {
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement('style');
    style.setAttribute('type', 'text/css');
    style.setAttribute('data-vite-dev-id', id);
    style.textContent = content;
    document.head.appendChild(style);
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  const style = sheetsMap.get(id);
  if (style) {
    style.remove();
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    dispose() {},
    prune() {},
    decline() {},
    invalidate() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== '.' && url[0] !== '/') return url;
  const pathname = url.replace(/[?#].*$/, '');
  const { search, hash } = new URL(url, 'http://vite.dev');
  return pathname + '?' + queryToInject + (search ? '&' + search.slice(1) : '') + (hash || '');
}
export class ErrorOverlay extends HTMLElement {}
`);
    });
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`AeroGlide 3D server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
