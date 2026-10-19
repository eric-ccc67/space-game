/* ===== ia_adaptativa.js ===== */
// ============================================================================================
//  IA ADAPTATIVA  ·  v36
// --------------------------------------------------------------------------------------------
//  Mide qué tan FUERTE está el jugador (Nivel de Ataque, partners, power-ups activos, poderes del Caos,
//  bombas, COMBO, poderes de combo y Modo Arcoíris) y hace que el juego se endurezca solo.
//
//  FUERZA  ->  AMENAZA (0 a 1, suavizada: sube rápido y baja despacio)  ->  EFECTO = amenaza x factor de dificultad
//
//  Con un EFECTO alto:
//    · los enemigos BAJAN MÁS RÁPIDO
//    · sus disparos apuntados salen en X3 (abanico de 3 balas)
//    · APARECEN MÁS ENEMIGOS (más filas y más enemigos a la vez)
//    · los enemigos tienen MÁS DEFENSA
//    · los JEFES y MINI JEFES tienen MÁS DEFENSA (según qué tan fuerte esté el jugador), descansan menos y sus patrones son más densos
//    · las MINI SECCIONES (eventos especiales) arrancan antes, avisan menos, son más rápidas y traen más cosas (y una 4.ª mini sección)
//  Todo escala "un poco" según la dificultad (Fácil < Medio < Difícil < Lunático).
//
//  PODERES DE COMBO: en la fuerza cuentan x4 por nivel (COMBO_PERK_WEIGHT), no x15.
//
//  No modifica el balance base: solo engancha funciones (enemyDefenseFactor, bossDefenseFactor, Enemy.update, Enemy.maybeShoot,
//  drawHud) y ajusta difficultySettings mientras se juega (se restaura al salir). Las mini secciones consultan este módulo desde
//  WaveAttacks (juego.js). Si quitas el <script>, el juego sigue exactamente igual que antes.
//  Se carga DESPUÉS de juego.js y de combo.js.
//
//  CONSOLA:  AIAdapt.state            -> { raw, T (amenaza), E (efecto), ... }
//            AIAdapt.force(0.8)       -> fuerza la amenaza (0 a 1) para probar · AIAdapt.force(null) la libera
//            AIAdapt.hud(true)        -> medidor de amenaza en pantalla
//            AIAdapt.cfg.enabled = false  -> apaga la IA
// ============================================================================================
(function () {
    'use strict';
    if (typeof difficultySettings === 'undefined' || typeof Enemy === 'undefined' || typeof Bullet === 'undefined' ||
        typeof window.drawHud !== 'function' || typeof window.enemyDefenseFactor !== 'function' ||
        typeof window.bossDefenseFactor !== 'function' || typeof window.pushEnemyBullet !== 'function') return;

    // ---------------------------------------------------------------- ajustes (todo se puede tocar aquí)
    const CFG = {
        enabled: true,

        // --- cómo se mide la fuerza del jugador (puntos; con SCORE_FULL puntos la amenaza llega al máximo)
        SCORE_FULL: 90,
        W_ATTACK: 28,              // Nivel de Ataque (1 a 15)
        W_PARTNERS: 14,            // partners (0 a 6)
        W_POWERUP: { doubleFire: 7, superShot: 7, shield: 3, paralyze: 2 },   // power-ups de siempre mientras duran
        W_CHAOS: 5, CHAOS_CAP: 22, // poderes del Caos activos (cada uno suma W_CHAOS; imán, fiesta y tiempo lento suman menos)
        W_BOMBS: 4,                // stock de bombas (0 a 4)
        W_COMBO: 10,               // tamaño del combo (llega al tope en x80)
        W_RAINBOW: 8,              // Modo Arcoíris activo
        COMBO_PERK_WEIGHT: 4,      // PODERES DE COMBO: cada nivel de poder suma x4 (no x15)
        COMBO_PERK_CAP: 24,        // tope de lo que pueden sumar los poderes de combo

        // --- rapidez con la que la amenaza sube / baja (por cuadro)
        RISE: 0.02, FALL: 0.004,

        // --- cuánto pesa la dificultad en el efecto (EFECTO = amenaza x esto)
        DIFF_K: { facil: 0.60, medio: 1.00, dificil: 1.15, lunatico: 1.30 },

        // --- efectos con EFECTO = 1 (en Lunático puede llegar a 1.3)
        DESCENT_MAX: 0.30,         // +30 % de velocidad de descenso
        TRIPLE_MAX: 0.90,          // probabilidad de que un disparo apuntado salga en x3
        TRIPLE_SPREAD: 0.26,       // apertura del abanico (radianes)
        SPAWN_RATE_MAX: 0.55,      // +55 % de ritmo de aparición de enemigos
        MAX_ENEMIES_MAX: 3,        // +3 enemigos a la vez
        FORMATION_MAX: 0.35,       // las filas en formación llegan ~35 % más seguido
        ENEMY_DEF_MAX: 0.50,       // +50 % de defensa de enemigos comunes
        BOSS_DEF_MAX: 0.60,        // +60 % de defensa de jefes y mini jefes
        BOSS_REST_MAX: 0.12,       // jefes/enemigos esperan hasta 12 % menos entre disparos y habilidades
        DENSITY_MAX: 0.08,         // +8 % de densidad de balas en los patrones
        EVENT_TELE_MAX: 0.22,      // aviso de las mini secciones hasta 22 % más corto (nunca baja de 60 % del original)
        EVENT_SPEED_MAX: 0.20,     // ondas expansivas hasta +20 % más rápidas
        EVENT_TIME_MAX: 0.20,      // las mini secciones arrancan hasta 20 % antes y la pausa entre ellas es más corta
        EVENT_EXTRA_AT: 0.60,      // con este EFECTO o más hay una 4.ª mini sección por oleada
        BOSS_EVENT_GAP_MAX: 0.25,  // (eventos_jefes.js, si está cargado) descansos entre eventos del jefe hasta 25 % más cortos
        BOSS_EVENT_K_MAX: 0.12     // (eventos_jefes.js, si está cargado) intensidad de sus eventos hasta +12 %
    };

    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const S = { raw: 0, T: 0, E: 0, frame: 0, force: null, parts: {} };

    // ---------------------------------------------------------------- ¿está activa?
    function active() {
        try { return CFG.enabled && isPlaying && currentMode !== 'clasico'; } catch (e) { return false; }
    }
    const dk = () => (CFG.DIFF_K[currentDiff] !== undefined ? CFG.DIFF_K[currentDiff] : 1);
    const effect = () => (active() ? S.E : 0);

    // ---------------------------------------------------------------- medición de la fuerza del jugador
    const CHAOS_LIGHT = { magnet: 0.3, party: 0.3, slowmo: 0.5 };   // pesan menos porque no suben tu daño
    function rawStrength() {
        const now = Date.now(), P = {};
        P.ataque = clamp((powerLevel - 1) / Math.max(1, MAX_POWER_LEVEL - 1), 0, 1) * CFG.W_ATTACK;
        P.partners = clamp((typeof partners !== 'undefined' && partners ? partners.length : 0) / 6, 0, 1) * CFG.W_PARTNERS;
        let pu = 0; for (const k in CFG.W_POWERUP) if (powerUps && powerUps[k] > now) pu += CFG.W_POWERUP[k];
        P.powerups = pu;
        let ch = 0;
        try { if (window.Caos && Caos.keys) Caos.keys.forEach(k => { if (powerUps[k] > now) ch += CFG.W_CHAOS * (CHAOS_LIGHT[k] !== undefined ? CHAOS_LIGHT[k] : 1); }); } catch (e) {}
        P.caos = Math.min(CFG.CHAOS_CAP, ch);
        P.bombas = clamp((typeof bombStock !== 'undefined' ? bombStock : 0) / Math.max(1, BOMB_MAX), 0, 1) * CFG.W_BOMBS;
        let cb = 0, pk = 0, rb = 0;
        const C = window.Combo && Combo.state;
        if (C && C.alive && C.n > 0) {
            cb = clamp(C.n / 80, 0, 1) * CFG.W_COMBO;
            if (C.rainbow > 0) rb = CFG.W_RAINBOW;
            const p = C.perks || {}, lv = (p.iman | 0) + (p.laser | 0) + (p.orbes | 0) + (p.furia | 0);
            pk = Math.min(CFG.COMBO_PERK_CAP, lv * CFG.COMBO_PERK_WEIGHT);        // x4 por nivel de poder de combo
        }
        P.combo = cb; P.poderesCombo = pk; P.arcoiris = rb;
        S.parts = P;
        return P.ataque + P.partners + P.powerups + P.caos + P.bombas + P.combo + P.poderesCombo + P.arcoiris;
    }

    // ---------------------------------------------------------------- ajustes de dificultad en vivo
    const BASE = {};
    Object.keys(difficultySettings).forEach(k => {
        const d = difficultySettings[k];
        BASE[k] = { enemySpawnRate: d.enemySpawnRate, maxEnemies: d.maxEnemies, bulletIntervalMult: d.bulletIntervalMult, bulletDensity: d.bulletDensity };
    });
    let lastKey = null;
    function restoreKey(k) { const d = difficultySettings[k], b = BASE[k]; if (d && b) Object.assign(d, b); }
    function restoreAll() { Object.keys(BASE).forEach(restoreKey); lastKey = null; }
    function applyDiff() {
        const k = currentDiff, d = difficultySettings[k], b = BASE[k];
        if (!d || !b) return;
        if (lastKey && lastKey !== k) restoreKey(lastKey);
        lastKey = k;
        const E = S.E;
        d.enemySpawnRate = b.enemySpawnRate * (1 + CFG.SPAWN_RATE_MAX * E);
        d.maxEnemies = b.maxEnemies + Math.round(CFG.MAX_ENEMIES_MAX * E);
        d.bulletIntervalMult = b.bulletIntervalMult * (1 - CFG.BOSS_REST_MAX * E);
        d.bulletDensity = b.bulletDensity * (1 + CFG.DENSITY_MAX * E);
    }

    // eventos_jefes.js (opcional): descansos entre eventos de jefe más cortos
    let BE0 = null;
    function applyBossEvents() {
        try {
            const cfg = window.BossEvents && BossEvents.cfg; if (!cfg) return;
            if (!BE0) BE0 = { bossFirst: cfg.bossFirst, bossGap: cfg.bossGap.slice(), miniFirst: cfg.miniFirst, miniGap: cfg.miniGap.slice(), invFirst: cfg.invFirst, invGap: cfg.invGap.slice() };
            const f = 1 - CFG.BOSS_EVENT_GAP_MAX * S.E;
            cfg.bossFirst = Math.round(BE0.bossFirst * f); cfg.miniFirst = Math.round(BE0.miniFirst * f); cfg.invFirst = Math.round(BE0.invFirst * f);
            cfg.bossGap = BE0.bossGap.map(v => Math.round(v * f)); cfg.miniGap = BE0.miniGap.map(v => Math.round(v * f)); cfg.invGap = BE0.invGap.map(v => Math.round(v * f));
        } catch (e) {}
    }

    // ---------------------------------------------------------------- tick (una vez por cuadro de juego)
    function tick() {
        if (!active()) { if (S.T > 0 || lastKey) { S.T = 0; S.E = 0; S.raw = 0; restoreAll(); } return; }
        S.frame++;
        if (S.frame % 6 === 0 || S.frame === 1) S.raw = rawStrength();
        const target = S.force !== null ? clamp(S.force, 0, 1) : clamp(S.raw / CFG.SCORE_FULL, 0, 1);
        S.T += (target - S.T) * (target > S.T ? CFG.RISE : CFG.FALL);
        if (Math.abs(target - S.T) < 0.0005) S.T = target;
        S.E = clamp(S.T * dk(), 0, 1.4);
        applyDiff();
        // más filas en formación
        try { if ((levelPhase === 'wave1' || levelPhase === 'wave2') && formationCooldown > 1) formationCooldown -= CFG.FORMATION_MAX * S.E; } catch (e) {}
        applyBossEvents();
    }
    setInterval(() => { if (typeof isPlaying !== 'undefined' && !isPlaying && (S.T > 0 || lastKey)) { S.T = 0; S.E = 0; S.raw = 0; S.frame = 0; restoreAll(); } }, 400);

    // ---------------------------------------------------------------- DEFENSA (enemigos comunes y jefes)
    const _ed = window.enemyDefenseFactor;
    window.enemyDefenseFactor = function (e) {
        const f = _ed.apply(this, arguments);
        if (!active() || (e && (e.isMinion || e.isFodder))) return f;
        return f * (1 + CFG.ENEMY_DEF_MAX * S.E);
    };
    const _bd = window.bossDefenseFactor;
    window.bossDefenseFactor = function () {
        const f = _bd.apply(this, arguments);
        if (!active()) return f;
        return f * (1 + CFG.BOSS_DEF_MAX * S.E);
    };

    // ---------------------------------------------------------------- BAJAN MÁS RÁPIDO
    const _upd = Enemy.prototype.update;
    Enemy.prototype.update = function () {
        const r = _upd.apply(this, arguments);
        if (S.E > 0.02 && active() && !this.isMinion && !this.isFodder && !this.role && !this.fromEvent) this.y += this.vy * CFG.DESCENT_MAX * S.E;
        return r;
    };

    // ---------------------------------------------------------------- DISPAROS EN X3
    // Si el disparo normal del enemigo es una sola bala apuntada, con cierta probabilidad salen 3 (abanico).
    let collecting = false, collected = null;
    const _push = window.pushEnemyBullet;
    window.pushEnemyBullet = function (b) { if (collecting && collected) collected.push(b); return _push.apply(this, arguments); };
    const _shoot = Enemy.prototype.maybeShoot;
    Enemy.prototype.maybeShoot = function () {
        if (S.E < 0.05 || !active() || this.isMinion || this.isFodder || this.role || this.type === 3) return _shoot.apply(this, arguments);
        collected = []; collecting = true;
        let r;
        try { r = _shoot.apply(this, arguments); } finally { collecting = false; }
        const got = collected; collected = null;
        if (got.length === 1 && Math.random() < Math.min(1, CFG.TRIPLE_MAX * S.E)) {
            const b = got[0], cx = this.x + this.width / 2, cy = this.y + this.height / 2;
            const sp = Math.hypot(b.vx, b.vy), a = Math.atan2(b.vy, b.vx);
            [-CFG.TRIPLE_SPREAD, CFG.TRIPLE_SPREAD].forEach(d => window.pushEnemyBullet(new Bullet(cx, cy, true, false, Math.cos(a + d) * sp, Math.sin(a + d) * sp)));
        }
        return r;
    };

    // ---------------------------------------------------------------- MINI SECCIONES (las consulta WaveAttacks en juego.js)
    let evCache = { b: null, q: -1, out: null };
    function scaleEvent(b) {
        if (!active() || S.E < 0.03) return b;
        const q = Math.round(S.E * 20);
        if (evCache.b === b && evCache.q === q) return evCache.out;
        const e = q / 20;
        const out = Object.assign({}, b, {
            tele: Math.max(Math.round(b.tele * 0.6), Math.round(b.tele * (1 - CFG.EVENT_TELE_MAX * e))),      // aviso algo más corto (con piso)
            waveSpd: b.waveSpd * (1 + CFG.EVENT_SPEED_MAX * e),
            rowN: b.rowN + Math.round(2 * e), lockN: b.lockN + Math.round(1.6 * e), pulseN: b.pulseN + (e >= 0.7 ? 1 : 0),   // juego.js los limita al ancho de pantalla
            burstN: b.burstN + Math.round(3 * e), roleMax: b.roleMax + Math.round(1.5 * e),
            rolePeriod: Math.round(b.rolePeriod * (1 - 0.25 * e))
        });
        evCache = { b, q, out };
        return out;
    }
    const evTime = () => (active() ? 1 - CFG.EVENT_TIME_MAX * S.E : 1);
    const extraEvent = () => active() && S.E >= CFG.EVENT_EXTRA_AT;
    const evK = () => (active() ? 1 + CFG.BOSS_EVENT_K_MAX * S.E : 1);

    // ---------------------------------------------------------------- medidor opcional en pantalla
    let showHud = false;
    function drawMeter() {
        const W = playAreaW, x = W - 118, y = 8, w = 108, k = clamp(S.T, 0, 1);
        ctx.save(); ctx.globalAlpha = 0.85; ctx.textAlign = 'left'; ctx.font = '7px "Press Start 2P", monospace';
        ctx.fillStyle = '#12000a'; ctx.fillRect(x - 3, y - 3, w + 6, 24);
        ctx.fillStyle = '#cfd6e4'; ctx.fillText('AMENAZA ' + Math.round(k * 100) + '%', x, y + 6);
        ctx.fillStyle = 'rgba(255,255,255,0.15)'; ctx.fillRect(x, y + 11, w, 6);
        ctx.fillStyle = k < 0.4 ? '#5aff8a' : (k < 0.75 ? '#ffd23a' : '#ff4a4a'); ctx.fillRect(x, y + 11, w * k, 6);
        ctx.restore();
    }

    // ---------------------------------------------------------------- gancho al HUD (una vez por cuadro)
    const prevHud = window.drawHud;
    window.drawHud = function () {
        try { tick(); } catch (e) { if (!tick._w) { tick._w = 1; console.warn('ia_adaptativa:', e); } }
        const r = prevHud.apply(this, arguments);
        if (showHud && active()) { try { drawMeter(); } catch (e) {} }
        return r;
    };

    window.AIAdapt = {
        cfg: CFG, state: S,
        strength: rawStrength, effect, scaleEvent, evTime, extraEvent, evK,
        force(t) { S.force = (t === null || t === undefined) ? null : clamp(+t, 0, 1); },
        hud(on) { showHud = on === undefined ? !showHud : !!on; return showHud; }
    };
})();
