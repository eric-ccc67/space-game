/* ===== spawn_director.js ===== */
// ============================================================================================
//  DIRECTOR DE APARICIONES  ·  v40
// --------------------------------------------------------------------------------------------
//  Problema: durante las oleadas salían pocos enemigos y muy de vez en cuando (un enemigo suelto cada par de segundos
//  y una fila cada 6-8 s, y con la pantalla casi vacía entre medias).
//
//  Qué hace este módulo (se llama una vez por cuadro desde el bucle de oleadas de juego.js):
//    1) SUELO DE ENEMIGOS: si hay menos enemigos "normales" en pantalla que el mínimo de la dificultad, va soltando
//       enemigos sueltos a buen ritmo hasta llenar ese mínimo. La pantalla ya no se queda vacía.
//    2) OLEADAS TEMÁTICAS (packs) cada pocos segundos, rotando entre cuatro tipos para que no se sienta repetitivo:
//         · PINZA     dos grupos que entran por los laterales y se cierran sobre el centro
//         · LLUVIA    una tromba de enemigos rápidos (los pequeños que embisten y NO disparan: presión sin muro de balas)
//         · ESCOLTA   un enemigo pesado con dos escoltas, escalonados
//         · CASCADA   una cadena en diagonal que cruza la pantalla
//    3) Un poco más de enemigos sueltos y de filas en formación (multiplicadores loneK / formK).
//  Todo respeta el tope de enemigos de la dificultad (con un pequeño margen para los packs) y el tope de balas enemigas
//  de siempre. Durante las mini secciones (eventos) el ritmo baja igual que antes (evDens).
//  La IA adaptativa (ia_adaptativa.js) sigue subiendo maxEnemies / ritmo cuando el jugador está muy fuerte.
//
//  Si quitas el <script>, el juego sigue como antes (juego.js comprueba que SpawnDirector exista).
//  CONSOLA:  SpawnDirector.cfg.enabled = false   ·   SpawnDirector.force('pinza' | 'lluvia' | 'escolta' | 'cascada')
//            SpawnDirector.state  -> contadores internos
// ============================================================================================
(function () {
    'use strict';
    if (typeof Enemy === 'undefined' || typeof enemies === 'undefined' || typeof difficultySettings === 'undefined') return;

    const CFG = {
        enabled: true,
        // mínimo de enemigos normales vivos en pantalla (por dificultad). +1 en los últimos niveles de Lunático.
        MIN_ALIVE: { facil: 3, medio: 4, dificil: 5, lunatico: 6 },
        // cuadros (a 60/s) entre enemigos sueltos cuando faltan para llegar al mínimo
        TRICKLE: { facil: 52, medio: 40, dificil: 32, lunatico: 26 },
        // cuadros entre oleadas temáticas [mín, máx]
        PACK_EVERY: { facil: [430, 650], medio: [340, 540], dificil: [280, 450], lunatico: [230, 390] },
        // los packs pueden pasarse del tope de enemigos por este margen
        SLACK: 3,
        LONE_K: 1.5,      // multiplicador del ritmo de enemigos sueltos del juego base
        FORM_K: 0.68      // multiplicador del tiempo entre filas en formación (menos = más seguidas)
    };

    let trickleT = 90, packT = 260, lastPack = '', packsDone = 0, trickled = 0;

    const W = () => playAreaW;
    const lvl = () => (typeof currentLevelIndex === 'function') ? currentLevelIndex() : 0;
    const rr = (a, b) => a + Math.random() * (b - a);
    const clampX = (x, w) => Math.max(10, Math.min(W() - w - 10, x));
    const lateL = () => (typeof lunaticLate === 'function') ? lunaticLate() : 0;
    const wOf = t => (t === 2 ? 96 : (t === 3 ? 60 : 78));

    function mk(x, y, type) {
        const e = new Enemy(clampX(x, wOf(type)), y, type, lvl());
        e.spawnX = e.x; e.entryFromX = e.x;
        enemies.push(e);
        return e;
    }
    const straight = (e, sway) => { e.entryPattern = 'straight'; e.sway = sway === undefined ? 6 : sway; return e; };
    const fromSide = (e, side, dur) => {
        e.entryPattern = side < 0 ? 'sideL' : 'sideR';
        e.entryFromX = side < 0 ? -e.width - 20 : W() + 20;
        e.entryDuration = dur || 80;
        return e;
    };

    // ---------------------------------------------------------------- enemigo suelto
    function spawnLone() {
        const r = Math.random(), l = lateL();
        const type = r < 0.16 + 0.04 * l ? 2 : (r < 0.30 + 0.09 * l ? 3 : 1);
        const w = wOf(type);
        let x = (typeof pickSpawnX === 'function') ? pickSpawnX(w) : null;
        if (x === null) return false;
        mk(x, -60, type);
        return true;
    }

    // ---------------------------------------------------------------- oleadas temáticas
    const PACKS = {
        // dos grupos desde los laterales
        pinza: {
            size: () => 2 * perSide(),
            run() {
                const n = perSide(), gap = 86;
                for (let side = -1; side <= 1; side += 2) {
                    const cx = side < 0 ? W() * 0.22 : W() * 0.78;
                    for (let i = 0; i < n; i++) {
                        const x = cx - 39 + (i - (n - 1) / 2) * gap * 0.55 * (side < 0 ? 1 : -1);
                        const e = mk(x, -60 - i * 46, 1);
                        fromSide(e, side, 78 + i * 8);
                        e.sway = 12;
                    }
                }
            }
        },
        // tromba de pequeños veloces (no disparan)
        lluvia: {
            size: () => rainN(),
            run() {
                const n = rainN(), lanes = Math.max(3, Math.floor((W() - 40) / 66));
                const order = [];
                for (let i = 0; i < lanes; i++) order.push(i);
                order.sort(() => Math.random() - 0.5);
                for (let i = 0; i < n; i++) {
                    const lane = order[i % lanes];
                    const x = 20 + lane * ((W() - 80) / Math.max(1, lanes - 1)) + rr(-8, 8);
                    straight(mk(x, -60 - i * rr(52, 88), 3), 10);
                }
            }
        },
        // pesado + dos escoltas
        escolta: {
            size: () => 3,
            run() {
                const cx = rr(W() * 0.3, W() * 0.7), gap = Math.min(120, (W() - 100) / 2);
                straight(mk(cx - 48, -60, 2), 14);
                straight(mk(cx - 39 - gap, -120, 1), 10);
                straight(mk(cx - 39 + gap, -120, 1), 10);
            }
        },
        // cadena diagonal
        cascada: {
            size: () => cascN(),
            run() {
                const n = cascN(), left = Math.random() < 0.5;
                const x0 = left ? W() * 0.12 : W() * 0.88 - 78, x1 = left ? W() * 0.88 - 78 : W() * 0.12;
                for (let i = 0; i < n; i++) straight(mk(x0 + (x1 - x0) * (i / (n - 1)), -60 - i * 58, 1), 4);
            }
        }
    };
    const NAMES = Object.keys(PACKS);
    function perSide() { return (currentDiff === 'facil' || currentDiff === 'medio') ? 2 : 3; }
    function rainN() { return ({ facil: 5, medio: 6, dificil: 7, lunatico: 8 })[currentDiff] || 6; }
    function cascN() { return currentDiff === 'facil' ? 4 : 5; }

    function launch(name) {
        const p = PACKS[name]; if (!p) return false;
        p.run(); lastPack = name; packsDone++;
        return true;
    }

    // ---------------------------------------------------------------- API
    function tick(normalCount, maxEn, evDens, late) {
        if (!CFG.enabled) return;
        evDens = evDens === undefined ? 1 : evDens;
        const d = currentDiff;

        // 1) suelo de enemigos
        const minAlive = Math.min(maxEn, Math.round(CFG.MIN_ALIVE[d] * (0.55 + 0.45 * evDens)) + (late > 0 ? 1 : 0));
        trickleT--;
        if (trickleT <= 0 && normalCount < minAlive) {
            if (spawnLone()) trickled++;
            trickleT = Math.round((CFG.TRICKLE[d] || 40) * rr(0.8, 1.25) / Math.max(0.45, evDens));
        } else if (trickleT < -120) trickleT = 30;      // nada que soltar: no acumula "deuda" de tiempo

        // 2) oleadas temáticas
        packT -= Math.max(0.35, evDens);
        if (packT <= 0) {
            const room = maxEn + CFG.SLACK - normalCount;
            const cand = NAMES.filter(n => n !== lastPack && PACKS[n].size() <= room);
            const entering = enemies.some(e => e.y < 60 && !e.fromEvent && e.t < 60);      // aún está entrando algo: espera un poco
            if (cand.length && !entering) {
                launch(cand[Math.floor(Math.random() * cand.length)]);
                const r = CFG.PACK_EVERY[d] || [340, 540];
                packT = rr(r[0], r[1]);
            } else packT = 40;
        }
    }
    function reset() { trickleT = 90; packT = rr(200, 300); lastPack = ''; }

    window.SpawnDirector = {
        cfg: CFG, tick, reset,
        loneK() { return CFG.enabled ? CFG.LONE_K : 1; },
        formK() { return CFG.enabled ? CFG.FORM_K : 1; },
        force(name) { return launch(name) ? 'ok: ' + name : 'packs: ' + NAMES.join(' | '); },
        get state() { return { trickleT, packT: Math.round(packT), lastPack, packsDone, trickled }; }
    };
})();
