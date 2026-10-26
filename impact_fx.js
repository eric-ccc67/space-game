// ============================================================================
//  impact_fx.js — v60 · IMPACT FRAME al morir un jefe + chispas de graze + tarjeta de resultados con RANGO
// ----------------------------------------------------------------------------
//  1) IMPACT FRAME (estilo Dragon Ball) cuando un jefe MUERE de verdad (no en el choque de poderes, que no lo mata):
//       · el juego se congela ~0.9 s; el cuadro pasa (fundido suave, SIN parpadeos) a una imagen "negativa" oscura:
//         fondo negro-carmesí, la silueta del jefe en tonos invertidos con contorno rojo, líneas de velocidad, grietas
//         que se dibujan, un zoom lento y barras de cine. Luego vuelve el juego y arranca la explosión.
//       · SIN EPILEPSIA: un solo fundido de entrada (110 ms) y uno de salida (280 ms) = ~2 cambios por segundo, el cuadro
//         es OSCURO (nada de blancos a pantalla completa), movimiento suave (senos, nada aleatorio por cuadro) y se respeta
//         "reducir movimiento" del sistema. Además deathfx.js ya no hace el destello blanco enorme al morir un jefe.
//       · Se calcula UNA vez la silueta (getImageData de la caja del jefe); durante el efecto solo se dibujan imágenes.
//  2) CHISPAS DE GRAZE: 2-3 destellos de píxel salen de la nave cuando rozas una bala (con tope de partículas).
//  3) TARJETA DE RESULTADOS al vencer al jefe: rango S/A/B/C/D (según golpes recibidos, combo y graze), puntos, enemigos,
//     golpes, mejor combo y medallas. Aparece unos segundos y se desvanece sola.
//  Ajustes: ImpactFX.cfg.impact / .sparks / .card = false.  Guardar apagado: localStorage.ifx_off = '1'.
//  Prueba desde consola: ImpactFX.test()  (usa el jefe activo o uno de mentira).   Se carga al FINAL (después de choque.js).
// ============================================================================
(function () {
    'use strict';
    if (typeof defeatBoss !== 'function' || typeof Extras === 'undefined' || typeof canvas === 'undefined') return;

    const TAU = Math.PI * 2, C = Math.cos, S = Math.sin, rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const eOut = t => 1 - Math.pow(1 - t, 3);
    const eBack = t => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
    const low = () => { try { return !!performanceMode; } catch (e) { return false; } };
    const reduced = () => { try { return !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
    const hudSafe = () => { try { return (window.HudPhone && HudPhone.active()) ? HudPhone.safeTop() : 0; } catch (e) { return 0; } };

    const CFG = { impact: true, sparks: true, card: true };
    try { if (localStorage.getItem('ifx_off') === '1') CFG.impact = CFG.sparks = CFG.card = false; } catch (e) {}

    // tiempos del impact frame (ms, tiempo real: no depende de los FPS)
    const IN = 110, HOLD = 640, TOTAL = 920;

    let frameN = 0, IMP = null, CARD = null;
    const ST = { wave: -1, hits: 0, graze: 0, maxCombo: 0, lives: 0, carded: false };

    // ------------------------------------------------------------------ copia del último cuadro (solo cuando el jefe está por morir)
    let snapC = null, snapX = null, snapF = -99;
    function snapNow() {
        if (!snapC || snapC.width !== canvas.width || snapC.height !== canvas.height) { snapC = mk(canvas.width, canvas.height); snapX = snapC.getContext('2d'); }
        snapX.setTransform(1, 0, 0, 1, 0, 0); snapX.globalAlpha = 1; snapX.globalCompositeOperation = 'source-over';
        snapX.drawImage(canvas, 0, 0); snapF = frameN;
    }

    // ------------------------------------------------------------------ silueta "negativa" del jefe (se calcula una sola vez)
    function buildSilhouette(I, bx, by, bw, bh) {
        const pad = Math.round(Math.max(bw, bh) * 0.15) + 8;
        const rx = Math.max(0, Math.floor(bx - pad)), ry = Math.max(0, Math.floor(by - pad));
        const rw = Math.min(canvas.width, Math.ceil(bx + bw + pad)) - rx, rh = Math.min(canvas.height, Math.ceil(by + bh + pad)) - ry;
        if (rw < 12 || rh < 12) return;
        const img = snapX.getImageData(rx, ry, rw, rh), d = img.data;
        // color del fondo = promedio del borde de la caja (queda fuera del jefe gracias al margen)
        let sr = 0, sg = 0, sb = 0, n = 0;
        const acc = (x, y) => { const i = (y * rw + x) * 4; sr += d[i]; sg += d[i + 1]; sb += d[i + 2]; n++; };
        for (let x = 0; x < rw; x++) { acc(x, 0); acc(x, rh - 1); }
        for (let y = 1; y < rh - 1; y++) { acc(0, y); acc(rw - 1, y); }
        const br = sr / n, bgc = sg / n, bb = sb / n;
        let solid = 0;
        for (let i = 0; i < d.length; i += 4) {
            const r = d[i], g = d[i + 1], b = d[i + 2], df = Math.abs(r - br) + Math.abs(g - bgc) + Math.abs(b - bb), a = clamp((df - 55) * 5, 0, 255);
            if (a <= 0) { d[i + 3] = 0; continue; }
            solid++;
            const lum = 0.3 * r + 0.59 * g + 0.11 * b, v = clamp(((255 - lum) - 128) * 1.7 + 170, 40, 255) / 255;   // negativo con contraste
            d[i] = 60 + 195 * v; d[i + 1] = 248 * v * v; d[i + 2] = 20 + 220 * v; d[i + 3] = a;                     // carmesí oscuro → blanco cálido
        }
        if (solid < 40) return;                                                                                       // no se vio al jefe: sin silueta
        const m = mk(rw, rh), mx = m.getContext('2d'); mx.putImageData(img, 0, 0);
        const tint = mk(rw, rh), tx = tint.getContext('2d'); tx.drawImage(m, 0, 0); tx.globalCompositeOperation = 'source-in'; tx.fillStyle = '#ff2a3c'; tx.fillRect(0, 0, rw, rh);
        const P = 6, out = mk(rw + P * 2, rh + P * 2), ox = out.getContext('2d');
        for (let k = 0; k < 8; k++) ox.drawImage(tint, P + C(k * TAU / 8) * 3, P + S(k * TAU / 8) * 3);                 // contorno rojo
        ox.drawImage(m, P, P);
        I.sil = out; I.sx = rx - P; I.sy = ry - P;
    }

    // ------------------------------------------------------------------ arranque del impact frame
    function startImpact(boss) {
        const W = playAreaW, H = playAreaH;
        let bx = boss.x, by = boss.y, bw = boss.width, bh = boss.height;
        if (!(bw > 0 && bh > 0)) { bx = W / 2 - 50; by = H * 0.2; bw = 100; bh = 100; }
        const cx = bx + bw / 2, cy = by + bh / 2, R = Math.max(40, Math.max(bw, bh) * 0.5), far = Math.max(W, H) * 1.1;
        if (!snapC || frameN - snapF > 4) snapNow();
        const I = { on: true, t: 0, last: performance.now(), start: performance.now(), snap: snapC, cx, cy, R, sil: null, sx: 0, sy: 0, lines: [], cracks: [], bg: null };
        try { buildSilhouette(I, bx, by, bw, bh); } catch (e) { I.sil = null; }                                          // sin permiso de lectura: se ve el cuadro oscurecido
        const gr = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, far * 0.75); gr.addColorStop(0, '#32000f'); gr.addColorStop(0.55, '#10000a'); gr.addColorStop(1, '#000'); I.bg = gr;
        const N = low() ? 26 : 42;
        for (let i = 0; i < N; i++) I.lines.push({ a: (i + rnd(-0.35, 0.35)) / N * TAU, w: rnd(0.012, 0.03), L: far * rnd(0.55, 1), al: rnd(0.16, 0.5) });
        for (let i = 0; i < 6; i++) {                                                                                       // grietas que salen del centro
            const a = (i + rnd(-0.3, 0.3)) / 6 * TAU, len = far * rnd(0.45, 0.85), pts = [[cx, cy]];
            for (let s = 1; s <= 7; s++) { const k = s / 7, jx = rnd(-14, 14), jy = rnd(-14, 14); pts.push([cx + C(a) * len * k + jx, cy + S(a) * len * k + jy]); }
            I.cracks.push(pts);
        }
        IMP = I;
    }

    // ------------------------------------------------------------------ dibujo (se llama desde Extras.takeover: el juego queda congelado)
    function drawImpact() {
        const I = IMP, now = performance.now(), dt = clamp(now - I.last, 0, 40); I.last = now; I.t += dt;
        const t = I.t, W = playAreaW, H = playAreaH, cx = I.cx, cy = I.cy, rm = reduced();
        const a = t < IN ? eOut(t / IN) : (t < HOLD ? 1 : 1 - eOut(clamp((t - HOLD) / (TOTAL - HOLD), 0, 1)));
        const hold = clamp((t - IN) / (TOTAL - IN), 0, 1);
        const sx = rm ? 0 : S(t * 0.11) * 2.6 * (1 - hold) * a, sy = rm ? 0 : C(t * 0.13) * 2.0 * (1 - hold) * a;       // temblor suave (senos, sin azar)
        const z = 1 + (rm ? 0.015 : 0.07) * eOut(clamp((t - IN) / 560, 0, 1));

        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.shadowBlur = 0;
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
        ctx.drawImage(I.snap, 0, 0, W, H, 0, 0, W, H);                                                                  // cuadro congelado
        ctx.globalAlpha = a * (I.sil ? 0.97 : 0.72); ctx.fillStyle = I.bg; ctx.fillRect(0, 0, W, H);                  // fondo oscuro (nunca blanco)

        ctx.save(); ctx.translate(sx, sy); ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
        // líneas de velocidad: triángulos que apuntan al jefe
        const r0 = I.R * 1.05 + hold * 18, rot = t * 0.00005;
        ctx.fillStyle = '#fff';
        for (let i = 0; i < I.lines.length; i++) {
            const l = I.lines[i], an = l.a + rot;
            ctx.globalAlpha = a * l.al; ctx.beginPath();
            ctx.moveTo(cx + C(an) * r0, cy + S(an) * r0); ctx.lineTo(cx + C(an - l.w) * l.L, cy + S(an - l.w) * l.L); ctx.lineTo(cx + C(an + l.w) * l.L, cy + S(an + l.w) * l.L);
            ctx.closePath(); ctx.fill();
        }
        // silueta negativa del jefe
        if (I.sil) { ctx.globalAlpha = a; const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false; ctx.drawImage(I.sil, I.sx, I.sy); ctx.imageSmoothingEnabled = sm; }
        // grietas que se dibujan una tras otra
        const cp = clamp((t - IN) / 240, 0, 1);
        if (cp > 0) {
            ctx.lineJoin = 'round'; ctx.lineCap = 'round';
            for (let pass = 0; pass < 2; pass++) {
                ctx.strokeStyle = pass ? '#fff' : '#12000a'; ctx.lineWidth = pass ? 2 : 5; ctx.globalAlpha = a * (pass ? 0.9 : 0.7);
                for (let i = 0; i < I.cracks.length; i++) {
                    const pts = I.cracks[i], upto = cp * (pts.length - 1), full = Math.floor(upto);
                    ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
                    for (let s = 1; s <= full; s++) ctx.lineTo(pts[s][0], pts[s][1]);
                    if (full < pts.length - 1) { const f = upto - full, p0 = pts[full], p1 = pts[full + 1]; ctx.lineTo(p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f); }
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
        // barras de cine
        const bh = Math.round(H * 0.085 * a); ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, bh); ctx.fillRect(0, H - bh, W, bh);
        ctx.restore(); ctx.globalAlpha = 1;
    }

    // ------------------------------------------------------------------ engancho: defeatBoss (solo cuando el jefe MUERE de verdad)
    const _db = window.defeatBoss;
    window.defeatBoss = function (boss) {
        if (!boss || boss.state === 'dead' || !CFG.impact) return _db.apply(this, arguments);
        // defeatBoss programa el fin de nivel a los 1800 ms: se retrasa lo que dura el impact frame para que la explosión se vea completa
        const _st = window.setTimeout;
        window.setTimeout = function (fn, ms) { if (ms === 1800 && typeof fn === 'function') { const a = Array.prototype.slice.call(arguments); a[1] = ms + TOTAL; return _st.apply(window, a); } return _st.apply(window, arguments); };
        let r; try { r = _db.apply(this, arguments); } finally { window.setTimeout = _st; }
        if (boss.state === 'dead') { try { startImpact(boss); } catch (e) { IMP = null; console.warn('ImpactFX:', e); } }   // si el choque lo interceptó, no hay impact frame
        return r;
    };
    const _take = Extras.takeover;
    Extras.takeover = function () {
        if (IMP && IMP.on) {
            if (performance.now() - IMP.start > TOTAL + 1500) IMP = null;                                                // seguro: efecto "atascado" de otra partida
            else if (IMP.t >= TOTAL) IMP = null;
            else { try { drawImpact(); return true; } catch (e) { IMP = null; console.warn('ImpactFX:', e); } }
        }
        return _take.apply(this, arguments);
    };
    const _run = Extras.onRunStart;
    Extras.onRunStart = function () { IMP = null; CARD = null; ST.wave = -1; ST.carded = false; return _run.apply(this, arguments); };

    // ------------------------------------------------------------------ chispas de graze
    const SP = []; let lastSp = -9;
    function sparkBurst(n) {
        if (frameN - lastSp < 2 || SP.length > 44 || typeof player === 'undefined' || !player) return; lastSp = frameN;
        const px = player.x + player.width / 2, py = player.y + player.height / 2;
        for (let k = 0; k < n; k++) { const an = rnd(0, TAU), r = rnd(9, 15), v = rnd(0.8, 2.4); SP.push({ x: px + C(an) * r, y: py + S(an) * r, vx: C(an) * v, vy: S(an) * v - 0.3, life: Math.round(rnd(14, 24)), s: Math.random() < 0.3 ? 3 : 2, c: k % 2 ? '#ffffff' : '#7ff3ff' }); }
    }
    function drawSparks() {
        if (!SP.length) return; ctx.save();
        for (let i = SP.length - 1; i >= 0; i--) {
            const p = SP[i]; p.x += p.vx; p.y += p.vy; p.vx *= 0.93; p.vy *= 0.93; p.life--;
            if (p.life <= 0) { SP.splice(i, 1); continue; }
            ctx.globalAlpha = Math.min(1, p.life / 10) * 0.9; ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x - p.s / 2), Math.round(p.y - p.s / 2), p.s, p.s);
        }
        ctx.restore();
    }
    if (typeof addGraze === 'function') {
        const _ag = window.addGraze;
        window.addGraze = function (n) {
            const r = _ag.apply(this, arguments);
            try { ST.graze++; if (CFG.sparks) sparkBurst(n >= 5 ? 5 : (low() ? 2 : 3)); } catch (e) {}
            return r;
        };
    }

    // ------------------------------------------------------------------ tarjeta de resultados con rango
    const RANK_COL = { S: '#ffd23a', A: '#5aff8a', B: '#4ad0ff', C: '#c9a8ff', D: '#9aa6b8' };
    function makeCard() {
        const d = levelCompleteData || {}, hits = ST.hits, sc = 100 - 22 * hits + Math.min(10, ST.maxCombo / 5) + Math.min(5, ST.graze / 10);
        const rank = sc >= 98 ? 'S' : sc >= 75 ? 'A' : sc >= 52 ? 'B' : sc >= 30 ? 'C' : 'D', medals = [];
        if (hits === 0) medals.push(['SIN GOLPES', '#ffd23a']);
        if (ST.maxCombo >= 30) medals.push(['COMBO x' + ST.maxCombo, '#ff8a2a']);
        if (ST.graze >= 80) medals.push(['RASANTE', '#4ad0ff']);
        return { start: performance.now(), rank, col: RANK_COL[rank], num: d.levelNum || 1, score: Math.max(0, d.scoreGained | 0), kills: d.enemiesDefeated | 0, hits, combo: ST.maxCombo, medals };
    }
    function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
    function drawCard() {
        const K = CARD, t = performance.now() - K.start, LIFE = 5200;
        if (t > LIFE) { CARD = null; return; }
        const W = playAreaW, H = playAreaH, inK = eOut(clamp(t / 380, 0, 1)), al = Math.min(inK, clamp((LIFE - t) / 420, 0, 1)) * 0.92;
        const cw = clamp(W * 0.8, 220, 330), ch = Math.min(132, Math.max(96, H * 0.34)), x = (W - cw) / 2, y = Math.max(hudSafe() + 8, H * 0.34) - (1 - inK) * 14;
        ctx.save(); ctx.globalAlpha = al; ctx.textBaseline = 'alphabetic';
        rrect(x, y, cw, ch, 10); ctx.fillStyle = 'rgba(8,6,20,0.88)'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = K.col; ctx.stroke();
        ctx.textAlign = 'center'; ctx.font = '8px "Press Start 2P", monospace'; ctx.fillStyle = '#fff'; ctx.fillText('NIVEL ' + K.num + ' COMPLETADO', x + cw / 2, y + 18);
        // rango con rebote de entrada
        const rk = clamp((t - 260) / 420, 0, 1), sc = rk > 0 ? eBack(rk) : 0, rx = x + cw * 0.2, ry = y + ch * 0.6;
        if (sc > 0) { ctx.save(); ctx.translate(rx, ry); ctx.scale(sc, sc); ctx.font = '40px "Press Start 2P", monospace'; ctx.fillStyle = '#12000a'; ctx.fillText(K.rank, 3, 3); ctx.fillStyle = K.col; ctx.fillText(K.rank, 0, 0); ctx.restore(); }
        // datos (el puntaje sube contando)
        const cnt = eOut(clamp((t - 200) / 900, 0, 1)), rows = [['PUNTOS', '+' + Math.round(K.score * cnt)], ['ENEMIGOS', String(Math.round(K.kills * cnt))], ['GOLPES', String(K.hits)], ['COMBO', 'x' + K.combo]];
        ctx.font = '8px "Press Start 2P", monospace'; const lx = x + cw * 0.38, rx2 = x + cw - 12;
        rows.forEach((r, i) => { const yy = y + 38 + i * 15; ctx.textAlign = 'left'; ctx.fillStyle = '#9ab'; ctx.fillText(r[0], lx, yy); ctx.textAlign = 'right'; ctx.fillStyle = (i === 2 && K.hits === 0) ? '#5aff8a' : '#fff'; ctx.fillText(r[1], rx2, yy); });
        // medallas
        if (ch >= 110 && K.medals.length) {
            ctx.font = '6px "Press Start 2P", monospace'; let mx = x + 12; const my = y + ch - 12;
            K.medals.forEach((m, i) => {
                const pop = clamp((t - 700 - i * 160) / 260, 0, 1); if (pop <= 0) return; const w = ctx.measureText(m[0]).width + 12;
                ctx.globalAlpha = al * pop; rrect(mx, my - 9, w, 14, 6); ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = m[1]; ctx.stroke();
                ctx.textAlign = 'left'; ctx.fillStyle = m[1]; ctx.fillText(m[0], mx + 6, my + 1); mx += w + 6;
            });
        }
        ctx.restore(); ctx.textAlign = 'left';
    }

    // ------------------------------------------------------------------ gancho por cuadro (al final de cada cuadro de juego)
    const _hud = window.drawHud;
    window.drawHud = function () {
        const r = _hud.apply(this, arguments);
        try {
            frameN++;
            if (isPlaying && currentMode !== 'clasico') {
                if (currentWave !== ST.wave) { ST.wave = currentWave; ST.hits = 0; ST.graze = 0; ST.maxCombo = 0; ST.lives = lives; }
                if (lives < ST.lives) ST.hits += ST.lives - lives; ST.lives = lives;
                try { const n = window.Combo ? (Combo.state.n | 0) : 0; if (n > ST.maxCombo) ST.maxCombo = n; } catch (e) {}
                // copia del cuadro mientras el jefe está en su último tramo de vida (el impact frame parte de ahí)
                if (CFG.impact && activeBoss && activeBoss.state === 'active' && activeBoss.maxHp && activeBoss.hp <= activeBoss.maxHp * 0.12) snapNow();
                if (CFG.sparks) drawSparks();
                if (CFG.card) {
                    if (levelCompleteActive && levelCompleteData) { if (!ST.carded) { ST.carded = true; CARD = makeCard(); } } else ST.carded = false;
                    if (CARD) drawCard();
                }
            }
        } catch (e) { console.warn('ImpactFX hud:', e); }
        return r;
    };

    window.ImpactFX = {
        cfg: CFG,
        test() { const b = (typeof activeBoss !== 'undefined' && activeBoss) || { x: playAreaW / 2 - 60, y: playAreaH * 0.2, width: 120, height: 120 }; startImpact(b); },
        rank() { return makeCard(); }
    };
})();
