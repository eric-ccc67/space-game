// api/ranking.js — reemplazo de api.php para Vercel (Node.js + Postgres/Neon).
// vercel.json redirige /api.php?action=... a esta función, así que el juego no cambia.
// Acciones: saveRun (POST) · save (POST, compatibilidad) · getTop · addStar (POST)

const DIFICULTADES = ['facil', 'medio', 'dificil', 'lunatico'];
const MODOS = ['moderno', 'infinito', 'clasico'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS scores (
    id SERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    score INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE TABLE IF NOT EXISTS players (
    player_key TEXT PRIMARY KEY,
    player_name TEXT NOT NULL,
    stars INTEGER NOT NULL DEFAULT 0,
    best_score INTEGER NOT NULL DEFAULT 0,
    best_difficulty TEXT NOT NULL DEFAULT 'medio',
    best_mode TEXT NOT NULL DEFAULT 'moderno',
    best_level INTEGER NOT NULL DEFAULT 0,
    best_victory INTEGER NOT NULL DEFAULT 0,
    best_items INTEGER NOT NULL DEFAULT 0,
    best_powerups INTEGER NOT NULL DEFAULT 0,
    best_coins INTEGER NOT NULL DEFAULT 0,
    best_gems INTEGER NOT NULL DEFAULT 0,
    best_kills INTEGER NOT NULL DEFAULT 0,
    best_bombs INTEGER NOT NULL DEFAULT 0,
    best_graze INTEGER NOT NULL DEFAULT 0,
    best_power_lvl INTEGER NOT NULL DEFAULT 1,
    best_detail TEXT,
    last_score INTEGER NOT NULL DEFAULT 0,
    games_played INTEGER NOT NULL DEFAULT 0,
    victories INTEGER NOT NULL DEFAULT 0,
    total_items BIGINT NOT NULL DEFAULT 0,
    total_powerups BIGINT NOT NULL DEFAULT 0,
    total_kills BIGINT NOT NULL DEFAULT 0,
    max_coins INTEGER NOT NULL DEFAULT 0,
    gems INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    best_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_players_best ON players (best_score DESC)`,
];

// ---------------------------------------------------------------- utilidades
function limpiarNombre(raw) {
  const n = String(raw == null ? '' : raw).trim().replace(/[\u0000-\u001F\u007F]/g, '');
  return Array.from(n).slice(0, 10).join('');
}
function entero(v, max = 2147483647) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(max, Math.trunc(n)));
}

// ---------------------------------------------------------------- lógica
async function guardarPartida(db, r) {
  const key = r.name.toLowerCase();
  const detalle = JSON.stringify(r.detail);
  const detalleOk = detalle.length > 2000 ? '{}' : detalle;
  const victoria = r.victory ? 1 : 0;

  await db.query('INSERT INTO scores (player_name, score, difficulty) VALUES ($1,$2,$3)', [r.name, r.score, r.difficulty]);

  const prev = await db.query('SELECT best_score FROM players WHERE player_key = $1', [key]);
  const isNewBest = prev.rows.length === 0 || r.score > prev.rows[0].best_score;

  const up = await db.query(
    `INSERT INTO players
       (player_key, player_name, best_score, best_difficulty, best_mode, best_level, best_victory, best_items,
        best_powerups, best_coins, best_gems, best_kills, best_bombs, best_graze, best_power_lvl, best_detail,
        last_score, games_played, victories, total_items, total_powerups, total_kills, max_coins, gems)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$3,1,$7,$8,$9,$12,$10,$11)
     ON CONFLICT (player_key) DO UPDATE SET
       last_score      = EXCLUDED.last_score,
       games_played    = players.games_played + 1,
       victories       = players.victories + EXCLUDED.victories,
       total_items     = players.total_items + EXCLUDED.total_items,
       total_powerups  = players.total_powerups + EXCLUDED.total_powerups,
       total_kills     = players.total_kills + EXCLUDED.total_kills,
       max_coins       = GREATEST(players.max_coins, EXCLUDED.max_coins),
       gems            = EXCLUDED.gems,
       best_difficulty = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_difficulty ELSE players.best_difficulty END,
       best_mode       = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_mode ELSE players.best_mode END,
       best_level      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_level ELSE players.best_level END,
       best_victory    = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_victory
                              ELSE GREATEST(players.best_victory, EXCLUDED.best_victory) END,
       best_items      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_items ELSE players.best_items END,
       best_powerups   = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_powerups ELSE players.best_powerups END,
       best_coins      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_coins ELSE players.best_coins END,
       best_gems       = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_gems ELSE players.best_gems END,
       best_kills      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_kills ELSE players.best_kills END,
       best_bombs      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_bombs ELSE players.best_bombs END,
       best_graze      = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_graze ELSE players.best_graze END,
       best_power_lvl  = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_power_lvl ELSE players.best_power_lvl END,
       best_detail     = CASE WHEN EXCLUDED.best_score > players.best_score THEN EXCLUDED.best_detail ELSE players.best_detail END,
       best_at         = CASE WHEN EXCLUDED.best_score > players.best_score THEN now() ELSE players.best_at END,
       player_name     = players.player_name,
       best_score      = GREATEST(players.best_score, EXCLUDED.best_score),
       updated_at      = now()
     RETURNING best_score`,
    [key, r.name, r.score, r.difficulty, r.mode, r.level, victoria, r.items, r.powerups, r.coins, r.gems,
     r.kills, r.bombs, r.graze, r.powerLevel, detalleOk]
  );
  const best = up.rows[0].best_score;
  const rk = await db.query('SELECT COUNT(*)::int + 1 AS rank FROM players WHERE best_score > $1', [best]);
  return { isNewBest, best, rank: rk.rows[0].rank };
}

function leerRun(d) {
  const name = limpiarNombre(d && d.name);
  const dificultad = d && d.difficulty;
  if (!d || typeof d !== 'object' || name === '' || d.score === undefined || d.score === null ||
      !Number.isFinite(Number(d.score)) || !DIFICULTADES.includes(dificultad)) return null;
  const detalle = {};
  if (d.powerupsDetail && typeof d.powerupsDetail === 'object') {
    let i = 0;
    for (const [k, v] of Object.entries(d.powerupsDetail)) {
      if (++i > 12) break;
      detalle[Array.from(String(k)).slice(0, 24).join('')] = entero(v, 100000);
    }
  }
  return {
    name, score: entero(d.score), difficulty: dificultad,
    mode: MODOS.includes(d.mode) ? d.mode : 'moderno',
    level: entero(d.level, 255), victory: !!d.victory,
    items: entero(d.items), powerups: entero(d.powerups), coins: entero(d.coins, 7), gems: entero(d.gems),
    kills: entero(d.kills), bombs: entero(d.bombs), graze: entero(d.graze),
    powerLevel: Math.max(1, entero(d.powerLevel === undefined ? 1 : d.powerLevel, 255)),
    detail: detalle,
  };
}

// ---------------------------------------------------------------- handler
function crearHandler(getDb) {
  let listo = null;
  return async function handler(req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    const send = (code, obj) => { res.statusCode = code; res.end(JSON.stringify(obj)); };

    let action = '';
    try { action = (req.query && req.query.action) || new URL(req.url, 'http://x').searchParams.get('action') || ''; } catch (e) {}
    const esPost = req.method === 'POST';

    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = null; } }

    let db;
    try {
      db = getDb();
      if (!listo) listo = (async () => { for (const q of SCHEMA) await db.query(q); })();
      await listo;
    } catch (e) {
      listo = null;
      console.error('DB:', e);
      return send(500, { error: 'No se pudo conectar a la base de datos.' });
    }

    try {
      if (action === 'saveRun' && esPost) {
        const run = leerRun(body);
        if (!run) return send(400, { error: 'Datos incompletos o inválidos' });
        return send(200, { success: true, ...(await guardarPartida(db, run)) });
      }
      if (action === 'save' && esPost) {
        const b = body || {};
        const run = leerRun({ name: b.name, score: b.score, difficulty: b.difficulty });
        if (!run) return send(400, { error: 'Datos incompletos o inválidos' });
        return send(200, { success: true, ...(await guardarPartida(db, run)) });
      }
      if (action === 'getTop') {
        const r = await db.query(
          `SELECT player_name, best_score AS score, best_difficulty AS difficulty, stars,
                  best_level AS level, best_victory AS victory, best_items AS items, best_powerups AS powerups,
                  best_coins AS coins, best_gems AS gems, best_kills AS kills, games_played
           FROM players WHERE best_score > 0 ORDER BY best_score DESC, best_at ASC LIMIT 10`);
        return send(200, r.rows);
      }
      if (action === 'addStar' && esPost) {
        const name = limpiarNombre(body && body.name);
        if (!name) return send(400, { error: 'Datos incompletos' });
        await db.query(
          `INSERT INTO players (player_key, player_name, stars) VALUES ($1,$2,1)
           ON CONFLICT (player_key) DO UPDATE SET stars = 1`, [name.toLowerCase(), name]);
        return send(200, { success: true });
      }
      return send(400, { error: 'Acción no reconocida' });
    } catch (e) {
      console.error('API:', e);
      return send(500, { error: 'No se pudo completar la operación.' });
    }
  };
}

// Conexión real (Neon / Postgres). Vercel + Neon definen DATABASE_URL automáticamente.
let pool = null;
function dbReal() {
  if (!pool) {
    const { Pool } = require('pg');
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Falta DATABASE_URL');
    pool = new Pool({ connectionString: url, max: 1, ssl: { rejectUnauthorized: false } });
  }
  return pool;
}

module.exports = crearHandler(dbReal);
module.exports.crearHandler = crearHandler;
