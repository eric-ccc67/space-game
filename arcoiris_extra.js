/* ===== arcoiris_extra.js ===== */
// ============================================================================================
//  MODO ARCOÍRIS · EXTRAS  ·  v38
// --------------------------------------------------------------------------------------------
//  Mientras dura el Modo Arcoíris (combo x50, ver combo.js) pasan cosas nuevas, todas con aviso:
//   · SEGADORES (insta-kill): una columna BRILLANTE parpadea con un "!" y suena una alarma aguda; justo después un
//     segador gigante cae por ese carril a toda velocidad, rebota abajo y vuelve a SUBIR (o al revés). Si te toca,
//     pierdes una vida aunque tengas escudo. Las balas y la bomba no lo destruyen: ¡esquívalo!
//   · HORDAS: formaciones de naves que bajan RAPIDÍSIMO. Cada una que derrotas suelta GEMAS (para la tienda).
//   · ENEMIGOS DORADOS: mucho más lentos que la horda pero valen x2 gemas (y puntos). Llevan una etiqueta "x2".
//  Se carga DESPUÉS de combo.js (que lo llama con ArcoirisExtra.start() / .frame()). Si quitas el <script>, el
//  Modo Arcoíris queda como antes. Todo se ajusta en CFG.
//  Consola:  ArcoirisExtra.test()  -> lanza un Modo Arcoíris ahora mismo (con partida en curso).
// ============================================================================================
(function () {
    'use strict';
    if (typeof Extras === 'undefined' || !window.Combo) return;

    // ---------------------------------------------------------------- ajustes
    const CFG = {
        INSTAKILL: 'life',        // 'life' = el segador quita 1 vida ignorando escudo y armadura · 'gameover' = fin de la partida
        WARN: 84,                 // cuadros de aviso antes de cada segador (84 = 1.4 s)
        KILL_SIZE: 60,            // tamaño del segador (px)
        KILL_FALL: 12.5,          // velocidad al bajar (px por cuadro)
        KILL_RISE: 8.5,           // velocidad al subir
        KILL_HIT: 0.36,           // radio de golpe = KILL_SIZE * esto (más chico que el dibujo: las púas no cuentan)
        HORDE_SPEED: [8.8, 10.4], // velocidad de la horda (px por cuadro): ¡rapidísimos!
        GOLD_SPEED: 6.2,          // velocidad de los dorados
        HORDE_GEMS: 2,            // gemas por enemigo de la horda
        GOLD_MULT: 2,             // los dorados dan esto x las gemas de la horda
        HORDE_SCORE: 120,
        MAX_ENEMIES: 40
    };

    const TAU = Math.PI * 2, S = Math.sin, K = Math.cos;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const PW = () => playAreaW, PH = () => playAreaH;
    const low = () => (typeof performanceMode !== 'undefined' && performanceMode);
    const hue = (h) => 'hsl(' + (((h % 360) + 360) % 360 | 0) + ',100%,60%)';
    const pcx = () => player.x + player.width / 2, pcy = () => player.y + player.height / 2;
    const FONT = '"Press Start 2P", monospace';

    const A = { on: false, T: 0, total: 1200, warns: [], reapers: [], horde: [], floats: [], sched: [], gems: 0, banner: 0, bannerTxt: '', bannerCol: '#fff', shakeEnd: 0 };

    // ---------------------------------------------------------------- sonido
    function beep(f0, f1, dur, type, vol) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
            o.type = type || 'square'; o.connect(g); g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1 || f0), t0 + dur);
            g.gain.setValueAtTime(vol || 0.03, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.02);
        } catch (e) {}
    }
    const sfxGem = (big) => { beep(big ? 1568 : 1319, big ? 2349 : 1760, 0.08, 'triangle', 0.03); if (big) setTimeout(() => beep(2093, 3136, 0.12, 'triangle', 0.03), 60); };

    // ---------------------------------------------------------------- sprites (se hornean una vez en canvas pequeños)
    // Las naves se dibujan con media fila (6 columnas, la última es el centro) y se espejan solas.
    const HALF = {
        a: ['.....y', '....ky', '...kbb', '..kbbw', 'kkkbbc', 'kaabbc', 'kdaabb', '.kdaab', '..kdab', '...kdb', '....kk', '.....k'],
        b: ['.....o', '....yy', '...kbb', '..kbbw', '.kkbbc', '.kabbc', '.kdaab', '..kdab', '..kdab', '...kdb', '....kk', '.....k']
    };
    function bakeShip(frame, pal) {
        const rows = HALF[frame], w = 11, h = rows.length, c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d');
        rows.forEach((r, j) => {
            const full = r + r.slice(0, 5).split('').reverse().join('');
            for (let i = 0; i < w; i++) { const ch = full[i]; if (ch !== '.') { x.fillStyle = pal[ch]; x.fillRect(i, j, 1, 1); } }
        });
        return c;
    }
    const SHIP_CACHE = {};
    function shipSprite(frame, hueDeg, gold) {
        const key = frame + (gold ? 'G' : Math.round(hueDeg / 20));
        if (SHIP_CACHE[key]) return SHIP_CACHE[key];
        const pal = gold
            ? { k: '#3a2000', b: '#fff0a0', a: '#ffc41c', d: '#c47a00', w: '#ffffff', c: '#ff6a3c', y: '#ffffff', o: '#ffd23a' }
            : { k: '#1a1030', b: 'hsl(' + hueDeg + ',100%,72%)', a: 'hsl(' + hueDeg + ',95%,58%)', d: 'hsl(' + hueDeg + ',80%,38%)', w: '#ffffff', c: '#7ffcff', y: '#fff27a', o: '#ff8a2a' };
        return (SHIP_CACHE[key] = bakeShip(frame, pal));
    }
    // segador: disco con púas (polar → píxeles), 30x30, se escala x2
    let SAW = null;
    function sawSprite() {
        if (SAW) return SAW;
        const N = 30, c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'), m = (N - 1) / 2;
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const dx = i - m, dy = j - m, r = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
            const R = 10.2 + 4.6 * Math.pow(Math.max(0, K(an * 7)), 2.2);      // 7 púas
            if (r > R) continue;
            let col;
            if (r > R - 1.3) col = '#26000e';                                    // contorno
            else if (r > 8.6) col = (K(an * 7) > 0.45 ? '#ffffff' : (dy + dx < 0 ? '#ff6a78' : '#ff2a3d'));   // dientes: filo blanco
            else if (r > 6.2) col = ((Math.floor((an + Math.PI) / TAU * 14) & 1) ? '#4a3d66' : '#352c52');     // aro de metal
            else col = '#14001e';                                                // fondo del ojo
            x.fillStyle = col; x.fillRect(i, j, 1, 1);
        }
        return (SAW = c);
    }

    // ---------------------------------------------------------------- creación
    function laneX(avoid) {
        const lw = CFG.KILL_SIZE + 8, W = PW();
        for (let n = 0; n < 12; n++) {
            const x = clamp(pcx() + rnd(-110, 110), lw / 2 + 6, W - lw / 2 - 6);
            if (!avoid.some(a => Math.abs(a - x) < lw + 26)) return x;
        }
        return clamp(rnd(lw, W - lw), lw / 2 + 6, W - lw / 2 - 6);
    }
    function warnReapers(n, ups) {
        const used = [];
        for (let i = 0; i < n; i++) {
            const x = laneX(used); used.push(x);
            A.warns.push({ x, w: CFG.KILL_SIZE + 8, t: -i * 14, up: !!(ups && ups[i]), done: false });
        }
        A.banner = 56; A.bannerTxt = '¡PELIGRO!'; A.bannerCol = '#ff3355';
    }
    function spawnReaper(w) {
        const sz = CFG.KILL_SIZE;
        A.reapers.push({ x: w.x, y: w.up ? PH() + sz : -sz, up: w.up, phase: 0, hold: 0, t: 0, spin: 0, trail: [], sz });
    }
    function spawnShip(x, y, vy, gold, i) {
        if (A.horde.length >= CFG.MAX_ENEMIES) return;
        A.horde.push({ x, y, vy, vx: 0, gold: !!gold, hp: gold ? 2 : 0.9, t: i * 3, ph: Math.random() * TAU, i, hue: (i * 37) % 360, sz: gold ? 40 : 30, flash: 0, trail: [] });
    }
    function spawnHorde(kind, goldCount) {
        const W = PW(), sp = rnd(CFG.HORDE_SPEED[0], CFG.HORDE_SPEED[1]), list = [];
        if (kind === 'v') {
            const n = 4; for (let i = -n; i <= n; i++) list.push([W / 2 + i * Math.min(48, (W - 70) / (2 * n)), -30 - Math.abs(i) * 36]);
        } else if (kind === 'rows') {
            const c = 7, g = (W - 60) / (c - 1); for (let r = 0; r < 3; r++) for (let i = 0; i < c; i++) list.push([30 + i * g, -30 - r * 70 - (i % 2) * 18]);
        } else if (kind === 'snake') {
            const n = 14; for (let i = 0; i < n; i++) list.push([W * (0.1 + 0.8 * (0.5 + 0.5 * S(i * 0.62))), -30 - i * 40]);
        } else {                                                                                      // columnas
            const c = 5, g = (W - 80) / (c - 1); for (let i = 0; i < c; i++) for (let r = 0; r < 3; r++) list.push([40 + i * g, -30 - r * 46 - i * 22]);
        }
        list.forEach(([x, y], i) => spawnShip(x, y, sp, false, i));
        for (let g = 0; g < goldCount; g++) spawnShip(rnd(60, W - 60), -60 - g * 150, CFG.GOLD_SPEED, true, 3 + g);
        A.banner = 70; A.bannerTxt = '¡HORDA!'; A.bannerCol = '#7cfcfc';
        [0, 1, 2, 3].forEach(i => setTimeout(() => beep(520 + i * 160, 700 + i * 200, 0.08, 'square', 0.03), i * 60));
    }

    // ---------------------------------------------------------------- guion del Modo Arcoíris (cuadros desde que empieza)
    function buildSchedule() {
        const T = A.total, s = [
            [110, () => warnReapers(1, [false])],
            [300, () => spawnHorde('v', 0)],
            [500, () => spawnShip(rnd(70, PW() - 70), -50, CFG.GOLD_SPEED, true, 1)],
            [560, () => warnReapers(2, [false, true])],
            [790, () => spawnHorde('rows', 2)],
            [980, () => warnReapers(2, [true, false])],
            [1090, () => spawnHorde('snake', 1)]
        ];
        A.sched = s.filter(e => e[0] < T - 70).map(e => ({ t: e[0], f: e[1], done: false }));
    }

    // ---------------------------------------------------------------- efectos sobre el jugador
    function killPlayer(by) {
        if (!isPlaying || Date.now() <= invulnerableUntil) return;
        createExplosion(pcx(), pcy(), '#ff3355', 46);
        if (CFG.INSTAKILL === 'gameover') lives = 0; else lives -= 1;
        invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50);
        screenShake = Math.max(screenShake, 16);
        beep(140, 40, 0.5, 'sawtooth', 0.06);
        if (lives <= 0) gameOver();
    }
    function hurtByShip() {                                   // golpe normal: respeta escudo e invulnerabilidad
        if (!isPlaying || Date.now() <= invulnerableUntil) return false;
        if (typeof bombEffect !== 'undefined' && bombEffect && bombEffect.active) return false;
        if (powerUps.shield > Date.now()) { createExplosion(pcx(), player.y, '#0ff', 8, true); invulnerableUntil = Date.now() + 500; return true; }
        createExplosion(pcx(), pcy(), player.color, 30);
        lives -= (typeof shipHitDamage === 'function' ? shipHitDamage() : 1);
        invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50);
        screenShake = Math.max(screenShake, 8);
        if (lives <= 0) gameOver();
        return true;
    }
    function giveGems(n, x, y, big) {
        let mul = 1; try { mul += (typeof Shop !== 'undefined' && Shop.gemMul) ? Shop.gemMul() : 0; } catch (e) {}
        const g = Math.max(1, Math.round(n * mul));
        const practice = !!(Extras.inPractice && Extras.inPractice());
        if (!practice) { A.gems += g; try { Shop.addGems(g); Extras.bump('gem', g); } catch (e) {} }
        A.floats.push({ x, y, t: 0, txt: (practice ? '' : '+' + g), big: !!big });
        sfxGem(big);
    }

    // ---------------------------------------------------------------- lógica por cuadro
    function bulletDamage(b) { return b.isSuper ? 3 : (b.source === 'partner' ? (0.3 + (window.Combo ? Combo.partnerBonus() : 0)) : (b.dmgMult || 1)); }

    function step() {
        const W = PW(), H = PH(), fz = !!Combo.state.fz;
        if (fz) return;
        A.T++;
        // guion
        A.sched.forEach(e => { if (!e.done && A.T >= e.t) { e.done = true; try { e.f(); } catch (er) { console.warn('arcoiris_extra:', er); } } });
        // avisos → segadores
        for (let i = A.warns.length - 1; i >= 0; i--) {
            const w = A.warns[i]; w.t++;
            if (w.t > 0 && w.t % 10 === 1) { const k = w.t / CFG.WARN; beep((w.t % 20 === 1) ? 1760 + k * 500 : 2349 + k * 500, (w.t % 20 === 1) ? 2093 + k * 500 : 1760, 0.07, 'square', 0.035); }
            if (w.t >= CFG.WARN) { spawnReaper(w); A.warns.splice(i, 1); beep(300, 60, 0.35, 'sawtooth', 0.05); screenShake = Math.max(screenShake, 5); }
        }
        // segadores
        const px = pcx(), py = pcy();
        for (let i = A.reapers.length - 1; i >= 0; i--) {
            const r = A.reapers[i]; r.t++; r.spin += 0.16;
            r.trail.unshift({ x: r.x, y: r.y }); if (r.trail.length > 5) r.trail.pop();
            if (r.hold > 0) { r.hold--; if (r.hold === 0) r.phase = 2; }
            else if (r.phase === 0) {                                           // primer pase: baja (o sube) acelerando
                const dir = r.up ? -1 : 1, v = Math.min(CFG.KILL_FALL, 5 + r.t * 0.35);
                r.y += dir * v;
                if (!r.up && r.y >= H - r.sz * 0.15) { r.y = H - r.sz * 0.15; r.hold = 14; r.phase = 1; screenShake = Math.max(screenShake, 9); beep(110, 50, 0.2, 'square', 0.05); }
                if (r.up && r.y <= r.sz * 0.15) { r.y = r.sz * 0.15; r.hold = 14; r.phase = 1; screenShake = Math.max(screenShake, 9); beep(110, 50, 0.2, 'square', 0.05); }
            } else if (r.phase === 2) {                                         // vuelve en sentido contrario, más despacio
                const dir = r.up ? 1 : -1;
                r.y += dir * CFG.KILL_RISE;
                if (r.y < -r.sz * 1.2 || r.y > H + r.sz * 1.2) { A.reapers.splice(i, 1); continue; }
            }
            r.x += S(r.t * 0.12) * 0.35;                                        // leve vaivén dentro del carril
            if (Math.hypot(px - r.x, py - r.y) < r.sz * CFG.KILL_HIT + 3) killPlayer(r);
        }
        // jugador/bombas contra enemigos de la horda
        const bomb = (typeof bombEffect !== 'undefined' && bombEffect && bombEffect.active && typeof bombEffect.radius === 'number') ? bombEffect : null;
        for (let i = A.horde.length - 1; i >= 0; i--) {
            const e = A.horde[i]; e.t++; e.y += e.vy; e.vx = S(e.t * 0.09 + e.ph) * (e.gold ? 1.3 : 0.5); e.x += e.vx; if (e.flash > 0) e.flash--;
            e.trail.unshift({ x: e.x, y: e.y }); if (e.trail.length > 4) e.trail.pop();
            let dmg = 0;
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j]; if (b.isEnemy) continue;
                if (b.pierce && b.hitList && b.hitList.includes(e)) continue;
                const h = e.sz / 2 + 2;
                if (b.x < e.x + h && b.x + b.width > e.x - h && b.y < e.y + h && b.y + b.height > e.y - h) {
                    if (b.pierce) { if (!b.hitList) b.hitList = []; b.hitList.push(e); } else bullets.splice(j, 1);
                    dmg += bulletDamage(b); if (!b.pierce) break;
                }
            }
            if (bomb && Math.hypot(e.x - bomb.x, e.y - bomb.y) < bomb.radius) dmg += 99;
            if (dmg > 0) { e.hp -= dmg; e.flash = 4; }
            if (e.hp <= 0) {
                createExplosion(e.x, e.y, e.gold ? '#ffd23a' : hue(e.hue), e.gold ? 60 : 32);
                score += CFG.HORDE_SCORE * (e.gold ? CFG.GOLD_MULT : 1); levelEnemiesDefeated++;
                giveGems(CFG.HORDE_GEMS * (e.gold ? CFG.GOLD_MULT : 1), e.x, e.y, e.gold);
                Extras.onKill();
                A.horde.splice(i, 1); continue;
            }
            if (Math.hypot(px - e.x, py - e.y) < e.sz * 0.5 + 4) { if (hurtByShip()) { createExplosion(e.x, e.y, '#fff', 30); A.horde.splice(i, 1); continue; } }
            if (e.y > H + 50) A.horde.splice(i, 1);
        }
        // los segadores bloquean los disparos del jugador (no se destruyen)
        if (A.reapers.length) for (let j = bullets.length - 1; j >= 0; j--) {
            const b = bullets[j]; if (b.isEnemy || b.pierce) continue;
            for (const r of A.reapers) if (Math.hypot(b.x - r.x, b.y - r.y) < r.sz * 0.46) { createExplosion(b.x, b.y, '#fff', 4, true); bullets.splice(j, 1); break; }
        }
    }

    // ---------------------------------------------------------------- dibujo
    function drawWarn(w) {
        if (w.t <= 0) return;
        const W = w.w, x0 = w.x - W / 2, H = PH(), fl = (Math.floor(w.t / 5) & 1), k = w.t / CFG.WARN;
        ctx.save();
        ctx.globalAlpha = 0.16 + 0.26 * fl + 0.12 * k; ctx.fillStyle = fl ? '#ffffff' : '#ffe14a'; ctx.fillRect(x0, 0, W, H);
        ctx.beginPath(); ctx.rect(x0, 0, W, H); ctx.clip();                                    // franjas de peligro que corren
        ctx.globalAlpha = 0.42; ctx.fillStyle = '#ff2a4a'; const off = (w.t * (w.up ? -5 : 5)) % 56;
        for (let y = -60 + off; y < H + 60; y += 56) { ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x0 + W, y - 26); ctx.lineTo(x0 + W, y + 2); ctx.lineTo(x0, y + 28); ctx.closePath(); ctx.fill(); }
        ctx.restore(); ctx.save();
        ctx.globalAlpha = 0.95; ctx.fillStyle = fl ? '#ffffff' : '#ff3355'; ctx.fillRect(x0 - 2, 0, 4, H); ctx.fillRect(x0 + W - 2, 0, 4, H);
        // triángulo "!" en el extremo por donde va a aparecer + flechas del sentido
        const ty = w.up ? H - 40 : 40, bob = S(w.t * 0.5) * 3, sc = 1 + 0.12 * S(w.t * 0.6);
        ctx.translate(w.x, ty + bob); ctx.scale(sc, sc); ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(24, 18); ctx.lineTo(-24, 18); ctx.closePath();
        ctx.fillStyle = fl ? '#ffffff' : '#ffe14a'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#2a0010'; ctx.stroke();
        ctx.fillStyle = '#2a0010'; ctx.textAlign = 'center'; ctx.font = '18px ' + FONT; ctx.fillText('!', 0, 13);
        ctx.restore(); ctx.save();
        ctx.globalAlpha = 0.85; ctx.fillStyle = fl ? '#ff3355' : '#ffffff';
        for (let n = 0; n < 3; n++) {                                                         // flechas que indican hacia dónde viene
            const yy = (w.up ? H - 110 - n * 34 : 110 + n * 34), d = w.up ? -1 : 1;
            ctx.beginPath(); ctx.moveTo(w.x - 12, yy - 7 * d); ctx.lineTo(w.x, yy + 7 * d); ctx.lineTo(w.x + 12, yy - 7 * d); ctx.lineTo(w.x + 12, yy - 1 * d); ctx.lineTo(w.x, yy + 13 * d); ctx.lineTo(w.x - 12, yy - 1 * d); ctx.closePath(); ctx.fill();
        }
        ctx.restore();
    }
    function drawReaper(r) {
        const sz = r.sz, spr = sawSprite(), t = r.t;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        // estela (imágenes que se desvanecen detrás)
        for (let i = r.trail.length - 1; i >= 1; i--) { const q = r.trail[i]; ctx.globalAlpha = 0.07 * (r.trail.length - i); ctx.fillStyle = '#ff2a3d'; ctx.beginPath(); ctx.arc(q.x, q.y, sz * 0.42, 0, TAU); ctx.fill(); }
        // aura que late
        const p = 0.5 + 0.5 * S(t * 0.25);
        ctx.globalAlpha = 0.18 + 0.12 * p; ctx.fillStyle = '#ff2a3d'; ctx.beginPath(); ctx.arc(r.x, r.y, sz * (0.72 + 0.08 * p), 0, TAU); ctx.fill();
        ctx.globalAlpha = 0.25; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(r.x, r.y, sz * 0.55, 0, TAU); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.translate(Math.round(r.x), Math.round(r.y)); ctx.rotate(r.spin * (r.up ? -1 : 1));
        ctx.drawImage(spr, -sz / 2, -sz / 2, sz, sz);
        ctx.rotate(-r.spin * (r.up ? -1 : 1));
        // ojo que mira al jugador
        const ang = Math.atan2(pcy() - r.y, pcx() - r.x), ex = K(ang) * 3, ey = S(ang) * 3;
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, 0, sz * 0.2, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff2a3d'; ctx.beginPath(); ctx.arc(ex, ey, sz * 0.12, 0, TAU); ctx.fill();
        ctx.fillStyle = '#14001e'; ctx.beginPath(); ctx.arc(ex * 1.2, ey * 1.2, sz * 0.06, 0, TAU); ctx.fill();
        ctx.restore();
    }
    function drawShip(e) {
        const s = shipSprite(((e.t >> 2) & 1) ? 'a' : 'b', e.hue, e.gold), sc = e.gold ? 4 : 3, w = s.width * sc, h = s.height * sc;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        // estela de velocidad
        if (!low()) for (let i = e.trail.length - 1; i >= 1; i--) { const q = e.trail[i]; ctx.globalAlpha = 0.06 * (e.trail.length - i) * (e.gold ? 1.6 : 1); ctx.fillStyle = e.gold ? '#ffd23a' : hue(e.hue); ctx.fillRect(Math.round(q.x - w * 0.22), Math.round(q.y - h / 2), Math.round(w * 0.44), h); }
        if (e.gold) {                                                                             // halo dorado que respira
            const p = 0.5 + 0.5 * S(e.t * 0.12);
            ctx.globalAlpha = 0.16 + 0.12 * p; ctx.fillStyle = '#ffd23a'; ctx.beginPath(); ctx.arc(e.x, e.y, 30 + 4 * p, 0, TAU); ctx.fill();
            ctx.globalAlpha = 0.18; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(e.x, e.y, 20, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.translate(Math.round(e.x), Math.round(e.y)); ctx.rotate(e.vx * 0.06);                  // leve inclinación según el vaivén
        ctx.drawImage(s, -Math.round(w / 2), -Math.round(h / 2), w, h);
        if (e.flash > 0) { ctx.globalAlpha = 0.6; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(s, -Math.round(w / 2), -Math.round(h / 2), w, h); ctx.globalCompositeOperation = 'source-over'; }
        ctx.restore();
        if (e.gold) {                                                                             // destellos que orbitan + etiqueta x2
            ctx.save(); ctx.fillStyle = '#ffffff';
            for (let i = 0; i < 3; i++) { const a = e.t * 0.08 + i * TAU / 3, rx = e.x + K(a) * 26, ry = e.y + S(a) * 20, s2 = 2 + (i + (e.t >> 3)) % 2; ctx.globalAlpha = 0.9; ctx.fillRect(Math.round(rx) - s2, Math.round(ry), s2 * 2 + 1, 1); ctx.fillRect(Math.round(rx), Math.round(ry) - s2, 1, s2 * 2 + 1); }
            ctx.globalAlpha = 1; ctx.textAlign = 'center'; ctx.font = '9px ' + FONT; ctx.lineWidth = 4; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a2000'; ctx.strokeText('x2', e.x, e.y - 30); ctx.fillStyle = '#ffe566'; ctx.fillText('x2', e.x, e.y - 30);
            ctx.restore();
        }
    }
    function gemIcon(x, y, s, col) {
        ctx.fillStyle = '#12002a'; ctx.beginPath(); ctx.moveTo(x, y - s - 1.5); ctx.lineTo(x + s + 1.5, y); ctx.lineTo(x, y + s + 1.5); ctx.lineTo(x - s - 1.5, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = col || '#7cfcfc'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x, y - s); ctx.lineTo(x - s * 0.5, y - s * 0.1); ctx.lineTo(x, y - s * 0.3); ctx.closePath(); ctx.fill();
    }
    function drawFloats() {
        for (let i = A.floats.length - 1; i >= 0; i--) {
            const f = A.floats[i]; f.t++; if (f.t > 46) { A.floats.splice(i, 1); continue; }
            const y = f.y - f.t * 0.9, a = f.t > 32 ? (46 - f.t) / 14 : 1;
            ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'left'; ctx.font = (f.big ? 12 : 9) + 'px ' + FONT; ctx.lineWidth = 4; ctx.lineJoin = 'round';
            gemIcon(f.x - 14, y - 4, f.big ? 6 : 4.5, f.big ? '#ffd23a' : '#7cfcfc');
            ctx.strokeStyle = '#12002a'; ctx.strokeText(f.txt, f.x - 6, y); ctx.fillStyle = f.big ? '#ffe566' : '#cffcff'; ctx.fillText(f.txt, f.x - 6, y);
            ctx.restore();
        }
    }
    function drawHudBits() {
        const W = PW(), t = A.T;
        // cartel central corto (¡PELIGRO! / ¡HORDA!)
        if (A.banner > 0) {
            A.banner--; const a = Math.min(1, A.banner / 14), k = 1 - A.banner / 70, sc = 1 + Math.max(0, 0.3 - k * 1.4) * 2;
            ctx.save(); ctx.globalAlpha = a; ctx.translate(W / 2, 112); ctx.scale(sc, sc); ctx.textAlign = 'center'; ctx.lineJoin = 'round';
            ctx.font = 'italic 900 28px "Noto Serif JP","Cinzel",Impact,serif'; ctx.lineWidth = 7; ctx.strokeStyle = '#12000a';
            const flash = (Math.floor(t / 4) & 1); ctx.strokeText(A.bannerTxt, 0, 0); ctx.fillStyle = (A.bannerCol === '#ff3355' && flash) ? '#ffe14a' : A.bannerCol; ctx.fillText(A.bannerTxt, 0, 0);
            ctx.restore();
        }
        // contador de gemas de este Modo Arcoíris (debajo de la barra de tiempo)
        if (A.gems > 0) {
            ctx.save(); ctx.textAlign = 'center'; ctx.font = '8px ' + FONT; ctx.lineWidth = 4; ctx.lineJoin = 'round';
            gemIcon(W / 2 - 34, 61, 4.5, '#7cfcfc'); ctx.strokeStyle = '#12002a'; ctx.strokeText('+' + A.gems + ' GEMAS', W / 2 + 6, 64); ctx.fillStyle = '#cffcff'; ctx.fillText('+' + A.gems + ' GEMAS', W / 2 + 6, 64);
            ctx.restore();
        }
    }

    // ---------------------------------------------------------------- ciclo de vida
    function clearAll(boom) {
        if (boom) { A.reapers.forEach(r => { try { createExplosion(r.x, r.y, '#ff2a3d', 30); } catch (e) {} }); A.horde.forEach(e => { try { createExplosion(e.x, e.y, '#fff', 14); } catch (er) {} }); }
        A.warns.length = 0; A.reapers.length = 0; A.horde.length = 0; A.floats.length = 0; A.sched.length = 0;
    }
    function start() {
        clearAll(false);
        A.on = true; A.T = 0; A.gems = 0; A.banner = 0; A.total = (Combo.RAINBOW_FRAMES || 1200);
        buildSchedule();
        try { Extras.bump('rainbow', 1); } catch (e) {}
    }
    function finish() {
        if (!A.on) return;
        A.on = false;
        const g = A.gems; clearAll(true);
        if (g > 0) { try { Extras.toast('MODO ARCOIRIS TERMINADO', '+' + g + ' gemas para la tienda', '', '#7cfcfc'); } catch (e) {} }
    }
    function frame() {
        const r = Combo.state.rainbow;
        if (r > 0 && !A.on) start();                                  // por si el arcoíris se activó sin pasar por start()
        if (r <= 0) { if (A.on) finish(); return; }
        step();
        A.warns.forEach(drawWarn);
        A.horde.forEach(drawShip);
        A.reapers.forEach(drawReaper);
        drawFloats(); drawHudBits();
    }
    // al terminar la partida se vacía todo sin premio
    setInterval(() => { if (typeof isPlaying !== 'undefined' && !isPlaying && (A.on || A.horde.length || A.reapers.length)) { A.on = false; clearAll(false); } }, 400);

    window.ArcoirisExtra = {
        start, frame, cfg: CFG, state: A,
        test() { try { Combo.startRainbow(); } catch (e) { console.warn(e); } }
    };
})();
