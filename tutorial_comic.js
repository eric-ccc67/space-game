// ============================================================================
//  tutorial_comic.js — v54 · TUTORIAL JUGABLE "ESTRELLITA" (estilo Flowey de Undertale + cómic con humor Deadpool)
// ----------------------------------------------------------------------------
//  Ya NO son pantallas con texto: el tutorial es una escena JUGABLE dentro del propio juego.
//   · ESTRELLITA (un sprite pixelado) te va hablando con globos de cómic y cajas de narrador amarillas,
//     rompiendo la cuarta pared, mientras TÚ juegas con tu nave de verdad:
//       1) MOVERTE   (pasa por los círculos)          2) DISPARAR (destruye 3 blancos de práctica)
//       3) PREMIOS   (P rojo, G verde, A naranja y tarjeta de escudo)
//       4) HITBOX + GRAZE (el puntito verde, rozar balas)  y ESQUIVAR un anillo de balas
//       5) BOMBA     (te regala una: úsala para limpiar la pantalla)
//       6) ENEMIGO GRANDE con barra de vida (así son los mini jefes y jefes)
//       7) "balitas de AMISTAD"... que en realidad son balas  →  Estrellita se convierte en un
//          monstruo estilo Flowey y hay que DERROTARLO (3 fases) para terminar el tutorial.
//  · Sale solo la PRIMERA vez que empiezas una partida (modo Moderno), después de la llegada de la nave.
//  · Se puede SALTAR con el botón de arriba a la derecha (toca 2 veces). Enter / tocar el lienzo = avanzar el diálogo.
//  · Para verlo de nuevo: botón "VER TUTORIAL" del menú de pausa (entre jefes), o Tutorial.show() / Tutorial.reset() en consola.
//    Consola de pruebas: Tutorial.dev.go('shoot'|'items'|'hitbox'|'bomb'|'big'|'pellets'|'boss'|'end') · Tutorial.dev.hp(n)
//  No toca el resto del juego: usa su propia lista de enemigos de práctica y su propio jefe; el estado de la partida
//  (vidas, puntos, bombas, enemigos...) se guarda al empezar y se devuelve intacto al terminar. Se carga DESPUÉS de historia_compartir.js.
// ============================================================================
(function () {
    'use strict';
    if (typeof isPlaying === 'undefined') return;
    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
    const $ = id => document.getElementById(id);
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    const phone = () => { try { return optMobile.checked; } catch (e) { return false; } };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const rnd = (a, b) => a + Math.random() * (b - a);
    const PW = () => playAreaW, PH = () => playAreaH;
    const FT = s => '700 ' + Math.round(s) + 'px "Comic Neue","Comic Sans MS","Chalkboard SE","Trebuchet MS",sans-serif';
    const FS = s => Math.round(s) + 'px Bangers,Impact,"Arial Black",sans-serif';

    // ------------------------------------------------------------------ estado
    let seen = ls.get('sg_tut_seen') === '1';
    const T = {
        on: false, pending: false, t: 0, replay: false, gen: null, snap: null, music: 'menu',
        lives: 5, restoreLives: true, lastInv: 0, hits: 0, hitFlag: false, grazes: 0, lastGraze: 0, adv: false, downs: 0,
        marks: [], dum: [], callout: 0, fade: 0, dark: 0, flash: 0, glitch: 0, hpBar: null, skipBtn: null, skipT: 0, bgS: [], saved: null, lastAdv: -99, lastSpace: false
    };
    const star = { x: 0, y: 0, tx: 0, ty: 0, r: 40, mood: 'happy', vis: false, pop: 0, shake: 0, sx: 1, rot: 0, init: false };
    let D = null, CAP = null, B = null; const SFX = [];

    // ------------------------------------------------------------------ sonido (pitidos de voz tipo Undertale)
    function blip(evil) {
        try {
            if (!audioCtx || audioCtx.state === 'closed') return; if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), n = audioCtx.currentTime;
            o.type = evil ? 'sawtooth' : 'square'; o.frequency.value = evil ? rnd(70, 110) : rnd(520, 760);
            g.gain.setValueAtTime(evil ? 0.05 : 0.035, n); g.gain.exponentialRampToValueAtTime(0.0001, n + 0.07);
            o.connect(g); g.connect(audioCtx.destination); o.start(n); o.stop(n + 0.08);
        } catch (e) {}
    }
    function tone(f1, f2, dur, type, vol) {
        try {
            if (!audioCtx || audioCtx.state === 'closed') return; if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), n = audioCtx.currentTime;
            o.type = type || 'square'; o.frequency.setValueAtTime(f1, n); o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), n + dur);
            g.gain.setValueAtTime(vol || 0.06, n); g.gain.exponentialRampToValueAtTime(0.0001, n + dur);
            o.connect(g); g.connect(audioCtx.destination); o.start(n); o.stop(n + dur + 0.02);
        } catch (e) {}
    }
    const sDing = () => { tone(660, 990, 0.18, 'square', 0.05); setTimeout(() => tone(990, 1320, 0.16, 'square', 0.045), 90); };
    const sPop = () => tone(900, 120, 0.22, 'triangle', 0.08);
    const sRumble = () => { tone(90, 30, 0.9, 'sawtooth', 0.09); tone(140, 50, 0.7, 'square', 0.04); };
    const sLaugh = () => { for (let i = 0; i < 6; i++) setTimeout(() => tone(i % 2 ? 150 : 210, 90, 0.12, 'sawtooth', 0.06), i * 120); };
    const sBad = () => { tone(300, 70, 0.35, 'sawtooth', 0.07); };

    // ------------------------------------------------------------------ SPRITES pixelados (se dibujan en un lienzo pequeño y se amplían sin suavizar)
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const SPR_STAR = mk(72, 72), SPR_EVIL = mk(260, 260), gS = SPR_STAR.getContext('2d'), gE = SPR_EVIL.getContext('2d');
    const LO_STAR = mk(36, 36), LO_EVIL = mk(130, 130), lS = LO_STAR.getContext('2d'), lE = LO_EVIL.getContext('2d');   // versión pequeña (se amplía sin suavizar = look pixelado)
    const down = (src, dst, g, n) => { g.clearRect(0, 0, n, n); g.imageSmoothingEnabled = true; g.drawImage(src, 0, 0, n, n); return dst; };
    function starPath(g, r, inner, n, rot, wob, t) {
        g.beginPath();
        for (let i = 0; i < n * 2; i++) {
            const a = rot - Math.PI / 2 + i * Math.PI / n, w = wob ? 1 + wob * S(t * 0.01 + i * 2.1) : 1, rr = (i % 2 ? r * inner : r) * w;
            const px = C(a) * rr, py = S(a) * rr; if (i) g.lineTo(px, py); else g.moveTo(px, py);
        }
        g.closePath();
    }
    const px = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(Math.round(x), Math.round(y), w, h); };
    // Estrellita: estrella amarilla con cara; "mood" cambia ojos y boca
    function renderStar(mood, t, rot) {
        const g = gS; g.clearRect(0, 0, 72, 72); g.save(); g.translate(36, 37); g.rotate(rot || 0); g.lineJoin = 'miter';
        starPath(g, 31, 0.5, 5, 0); g.fillStyle = '#000'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#000'; g.stroke();
        starPath(g, 28, 0.5, 5, 0); g.fillStyle = mood === 'creep' ? '#ffd83a' : '#ffe94a'; g.fill();
        g.save(); starPath(g, 28, 0.5, 5, 0); g.clip(); g.fillStyle = 'rgba(214,150,10,.55)'; g.fillRect(-40, 4, 80, 40); g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(-14, -24, 6, 4); g.restore();
        g.restore();
        const cx = 36, cy = 36, bl = (Math.floor(t / 90) % 14 === 0) ? 1 : 0;
        if (mood !== 'cry' && mood !== 'shock') { px(g, cx - 13, cy + 3, 5, 3, 'rgba(255,90,120,.55)'); px(g, cx + 8, cy + 3, 5, 3, 'rgba(255,90,120,.55)'); }
        if (mood === 'happy' || mood === 'wink') {
            px(g, cx - 9, cy - 6, 4, bl ? 1 : 7, '#111'); px(g, cx - 8, cy - 5, 1, bl ? 0 : 2, '#fff');
            if (mood === 'wink') { px(g, cx + 5, cy - 3, 5, 1, '#111'); px(g, cx + 4, cy - 4, 1, 1, '#111'); px(g, cx + 10, cy - 4, 1, 1, '#111'); } else { px(g, cx + 5, cy - 6, 4, bl ? 1 : 7, '#111'); px(g, cx + 6, cy - 5, 1, bl ? 0 : 2, '#fff'); }
            px(g, cx - 5, cy + 5, 1, 1, '#111'); px(g, cx - 4, cy + 6, 1, 1, '#111'); px(g, cx - 3, cy + 7, 7, 1, '#111'); px(g, cx + 4, cy + 6, 1, 1, '#111'); px(g, cx + 5, cy + 5, 1, 1, '#111');
        } else if (mood === 'sassy') {
            px(g, cx - 10, cy - 5, 6, 6, '#111'); px(g, cx + 4, cy - 5, 6, 6, '#111'); px(g, cx - 10, cy - 6, 6, 3, '#e0b21a'); px(g, cx + 4, cy - 6, 6, 3, '#e0b21a');
            px(g, cx - 6, cy - 3, 2, 2, '#fff'); px(g, cx + 6, cy - 3, 2, 2, '#fff');
            px(g, cx - 5, cy + 7, 8, 1, '#111'); px(g, cx + 3, cy + 6, 3, 1, '#111'); px(g, cx + 6, cy + 5, 1, 1, '#111');
        } else if (mood === 'shock') {
            px(g, cx - 10, cy - 8, 7, 8, '#fff'); px(g, cx + 3, cy - 8, 7, 8, '#fff'); px(g, cx - 7, cy - 5, 2, 3, '#111'); px(g, cx + 6, cy - 5, 2, 3, '#111');
            px(g, cx - 3, cy + 5, 6, 6, '#111');
        } else if (mood === 'creep') {
            const j = (Math.floor(t / 4) % 3) - 1;
            px(g, cx - 11, cy - 8, 8, 10, '#050505'); px(g, cx + 3, cy - 8, 8, 10, '#050505'); px(g, cx - 8 + j, cy - 4, 2, 2, '#fff'); px(g, cx + 6 - j, cy - 4, 2, 2, '#fff');
            px(g, cx - 12, cy + 4, 24, 8, '#111'); for (let i = 0; i < 6; i++) { px(g, cx - 12 + i * 4, cy + 4, 2, 3, '#fff'); px(g, cx - 10 + i * 4, cy + 9, 2, 3, '#fff'); }
        } else if (mood === 'cry') {
            px(g, cx - 10, cy - 4, 5, 1, '#111'); px(g, cx + 5, cy - 4, 5, 1, '#111'); px(g, cx - 9, cy - 3, 3, 4, '#111'); px(g, cx + 6, cy - 3, 3, 4, '#111');
            const w = (t / 6) % 14; px(g, cx - 9, cy + 1 + w, 2, 3, '#5ad0ff'); px(g, cx + 7, cy + 1 + ((w + 6) % 14), 2, 3, '#5ad0ff');
            px(g, cx - 4, cy + 8, 8, 1, '#111'); px(g, cx - 5, cy + 9, 1, 1, '#111'); px(g, cx + 4, cy + 9, 1, 1, '#111');
        }
        return down(SPR_STAR, LO_STAR, lS, 36);
    }
    // Jefe malvado: versión retorcida de la estrella, con lianas con espinas, ojos rojos y una sonrisa enorme (fases 1-3)
    const quad = (u, a, b, c) => (1 - u) * (1 - u) * a + 2 * (1 - u) * u * b + u * u * c;
    function renderEvil(Bo, t, tx, ty) {
        const g = gE, ph = Bo.phase, K = 36, CX = 130, CY = 132, vk = Bo.vine;
        g.clearRect(0, 0, 260, 260); g.save(); g.translate(CX, CY); g.lineJoin = 'miter'; g.lineCap = 'butt';
        // lianas
        const N = 8 + ph * 2;
        for (let i = 0; i < N; i++) {
            const a0 = i / N * TAU + t * 0.0007 * (i % 2 ? 1 : -1) + 0.3, len = K * (2.1 + 0.4 * S(t * 0.004 + i * 1.7) + ph * 0.1) * vk, bend = S(t * 0.006 + i) * 0.9;
            const ex = C(a0) * len, ey = S(a0) * len, c1x = C(a0 + bend) * len * 0.55, c1y = S(a0 + bend) * len * 0.55;
            g.strokeStyle = '#000'; g.lineWidth = 9; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(c1x, c1y, ex, ey); g.stroke();
            g.strokeStyle = ph >= 3 ? '#e0304e' : (ph === 2 ? '#b0388a' : '#58b83a'); g.lineWidth = 5; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(c1x, c1y, ex, ey); g.stroke();
            [0.42, 0.62, 0.8].forEach((u, k) => {
                const pxx = quad(u, 0, c1x, ex), pyy = quad(u, 0, c1y, ey), tx2 = 2 * (1 - u) * c1x + 2 * u * (ex - c1x), ty2 = 2 * (1 - u) * c1y + 2 * u * (ey - c1y), tl = Math.hypot(tx2, ty2) || 1;
                const nx = -ty2 / tl * (k % 2 ? 1 : -1), ny = tx2 / tl * (k % 2 ? 1 : -1);
                g.fillStyle = '#000'; g.beginPath(); g.moveTo(pxx - tx2 / tl * 3, pyy - ty2 / tl * 3); g.lineTo(pxx + nx * 9, pyy + ny * 9); g.lineTo(pxx + tx2 / tl * 3, pyy + ty2 / tl * 3); g.fill();
                g.fillStyle = '#d4142c'; g.beginPath(); g.moveTo(pxx - tx2 / tl * 1.5, pyy - ty2 / tl * 1.5); g.lineTo(pxx + nx * 6, pyy + ny * 6); g.lineTo(pxx + tx2 / tl * 1.5, pyy + ty2 / tl * 1.5); g.fill();
            });
            g.save(); g.translate(ex, ey); g.rotate(t * 0.004 + i); starPath(g, 6, 0.5, 4, 0); g.fillStyle = '#000'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke(); starPath(g, 4.5, 0.45, 4, 0); g.fillStyle = ph >= 2 ? '#ff2a3a' : '#ffe94a'; g.fill(); g.restore();
        }
        // cuerpo: estrella de 10 puntas con picos irregulares
        const base = ph === 1 ? ['#ffc42e', '#c4501a'] : (ph === 2 ? ['#f0532a', '#a01a28'] : ['#d0243e', '#6a0a22']);
        starPath(g, K + 3, 0.6, 10, 0.12, 0.06, t); g.fillStyle = '#000'; g.fill(); g.lineWidth = 5; g.strokeStyle = '#000'; g.stroke();
        starPath(g, K, 0.6, 10, 0.12, 0.06, t); g.fillStyle = base[0]; g.fill();
        g.save(); starPath(g, K, 0.6, 10, 0.12, 0.06, t); g.clip(); g.fillStyle = base[1]; g.fillRect(-60, 6, 120, 60); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(-60, -60, 28, 120); g.restore();
        // ojos: rendijas furiosas con pupilas rojas que siguen a tu nave
        const lookx = clamp(tx, -1, 1) * 3, looky = clamp(ty, -1, 1) * 2;
        const eye = (ex, ey, sc, flip) => {
            g.save(); g.translate(ex, ey); g.scale(flip, 1);
            g.fillStyle = '#000'; g.beginPath(); g.moveTo(-9 * sc, -4 * sc); g.lineTo(9 * sc, 3 * sc); g.lineTo(7 * sc, 9 * sc); g.lineTo(-8 * sc, 7 * sc); g.closePath(); g.fill();
            g.fillStyle = '#ff1c28'; g.fillRect(Math.round((-3 + lookx * 0.6 * flip) * sc), Math.round((1 + looky * 0.4) * sc), Math.round(5 * sc), Math.round(5 * sc));
            g.fillStyle = '#fff'; g.fillRect(Math.round((-2 + lookx * 0.6 * flip) * sc), Math.round((1 + looky * 0.4) * sc), Math.max(1, Math.round(2 * sc)), Math.max(1, Math.round(2 * sc)));
            g.restore();
        };
        eye(-14, -10, 1, 1); eye(14, -10, 1, -1);
        if (ph >= 2) { eye(-6, -22, 0.6, 1); eye(6, -22, 0.6, -1); }
        if (ph >= 3) { eye(-24, 3, 0.55, 1); eye(24, 3, 0.55, -1); eye(0, -26, 0.5, 1); }
        // cejas
        g.fillStyle = '#000'; g.beginPath(); g.moveTo(-26, -17); g.lineTo(-4, -8); g.lineTo(-4, -12); g.lineTo(-24, -22); g.fill(); g.beginPath(); g.moveTo(26, -17); g.lineTo(4, -8); g.lineTo(4, -12); g.lineTo(24, -22); g.fill();
        // sonrisa enorme con dientes
        const m = Bo.mouth, mh = 5 + m * 15, ml = -24, mr = 24, my = 12;
        g.fillStyle = '#0a0004'; g.beginPath(); g.moveTo(ml, my); g.quadraticCurveTo(0, my - 4 - m * 3, mr, my); g.quadraticCurveTo(0, my + mh * 2 + 6, ml, my); g.closePath(); g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke();
        const nT = 9;
        for (let i = 0; i < nT; i++) {
            const u = (i + 0.5) / nT, qx = quad(u, ml, 0, mr), qy = quad(u, my, my - 4 - m * 3, my), bx2 = quad(u, ml, 0, mr), by2 = quad(u, my, my + mh * 2 + 6, my);
            g.fillStyle = '#fff'; g.beginPath(); g.moveTo(qx - 2.6, qy); g.lineTo(qx + 2.6, qy); g.lineTo(qx, qy + 4 + m * 3 + (i % 2) * 2); g.closePath(); g.fill();
            if (m > 0.1) { g.beginPath(); g.moveTo(bx2 - 2.4, by2 - 0.6); g.lineTo(bx2 + 2.4, by2 - 0.6); g.lineTo(bx2, by2 - 4 - m * 3 - (i % 2) * 2); g.closePath(); g.fill(); }
        }
        g.restore();
        return down(SPR_EVIL, LO_EVIL, lE, 130);
    }
    function blit(spr, x, y, size, flipAlpha) {
        const sm = ctx.imageSmoothingEnabled; ctx.imageSmoothingEnabled = false;
        if (flipAlpha != null) ctx.globalAlpha = flipAlpha;
        ctx.drawImage(spr, x - size / 2, y - size / 2, size, size); ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = sm;
    }

    // ------------------------------------------------------------------ TEXTO de cómic (con *énfasis* en rojo) y globos
    function runs(text) { const out = []; text.split('*').forEach((seg, i) => { seg.split(/(\s+)/).forEach(w => { if (w !== '') out.push({ w, em: i % 2 === 1, sp: /^\s+$/.test(w) }); }); }); return out; }
    function layout(g, text, maxW, fs) {
        const L = [[]]; let wd = 0;
        runs(text).forEach(k => {
            g.font = FT(fs); const w = g.measureText(k.w).width;
            if (!k.sp && wd + w > maxW && L[L.length - 1].length) { L.push([]); wd = 0; }
            if (k.sp && wd === 0) return;
            L[L.length - 1].push({ w: k.w, em: k.em, x: wd, wi: w }); wd += w;
        });
        let mw = 0; L.forEach(l => { const e = l[l.length - 1]; if (e) mw = Math.max(mw, e.x + e.wi); });
        return { L, mw };
    }
    function drawRuns(g, lay, x, y, lh, n, col, emCol) {
        let used = 0; g.textBaseline = 'alphabetic'; g.textAlign = 'left';
        for (let li = 0; li < lay.L.length; li++) for (const k of lay.L[li]) {
            const take = Math.min(k.w.length, Math.max(0, Math.floor(n) - used)); used += k.w.length; if (take <= 0) continue;
            g.fillStyle = k.em ? emCol : col; g.fillText(k.w.slice(0, take), x + k.x, y + li * lh);
        }
    }
    function rrect(g, x, y, w, h, r) { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); }
    function halftone(g, x, y, w, h, col) {
        g.save(); rrect(g, x, y, w, h, 12); g.clip(); g.fillStyle = col;
        for (let j = 0; j < h; j += 7) for (let i = (j / 7 % 2) * 3.5; i < w; i += 7) { const k = clamp((i / w + j / h - 1.05) * 1.6, 0, 1); if (k > 0.05) { g.beginPath(); g.arc(x + i, y + j, 0.4 + 1.5 * k, 0, TAU); g.fill(); } }
        g.restore();
    }
    // posición del que habla (la estrella, el jefe o el centro)
    function speaker() { if (B && B.state !== 'gone') return { x: B.x, y: B.y, r: B.r * 0.9 }; return { x: star.x, y: star.y, r: star.r }; }
    function drawBubble() {
        if (!D) return; const g = ctx, W = PW(), H = PH(), sp = speaker(), evil = D.style === 'evil';
        const fs = clamp(W * 0.027, 12, 17), lh = fs * 1.28, maxW = clamp(W * 0.52, 150, 380), pad = fs * 0.8;
        const lay = layout(g, D.text, maxW, fs), extra = D.block ? fs * 1.05 : 0, bw = Math.max(lay.mw, D.block ? fs * 5.2 : 0) + pad * 2, bh = lay.L.length * lh + pad * 1.5 + extra;
        const capH = CAP ? CAP.h + 14 : 0, onRight = sp.x < W * 0.5;
        let bx = onRight ? sp.x + sp.r + 18 : sp.x - sp.r - 18 - bw; bx = clamp(bx, 6, W - bw - 6);
        let by = clamp(sp.y - bh / 2, 8 + capH, Math.max(8 + capH, H * 0.46 - bh)); if (B && B.state !== 'gone') by = (B.state === 'active' || B.state === 'dying' ? 60 : 8) + capH;
        const pop = clamp((T.t - D.born) / 6, 0.5, 1) , sc = pop < 1 ? 0.88 + 0.12 * pop : 1;
        g.save(); g.translate(bx + bw / 2, by + bh / 2); g.scale(sc, sc); g.translate(-(bx + bw / 2), -(by + bh / 2));
        const jag = (x, y, w, h) => { const n = Math.max(10, Math.round((w + h) / 14)); g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU, k = i % 2 ? 0.9 : 1.08; g.lineTo(x + w / 2 + C(a) * w / 2 * k * 1.06, y + h / 2 + S(a) * h / 2 * k * 1.12); } g.closePath(); };
        // cola del globo hacia quien habla
        const tx = clamp(sp.x, bx + 10, bx + bw - 10) === sp.x ? sp.x : (onRight ? bx : bx + bw), ty = clamp(sp.y, by + 8, by + bh - 8);
        const tip = { x: onRight ? sp.x + sp.r * 0.75 : sp.x - sp.r * 0.75, y: sp.y }, base = onRight ? bx + 2 : bx + bw - 2;
        g.lineJoin = 'round'; g.lineWidth = 3.5; g.strokeStyle = evil ? '#d4142c' : '#000'; g.fillStyle = evil ? '#07000a' : '#fff';
        if (evil) { jag(bx - 4, by - 4, bw + 8, bh + 8); g.fill(); g.stroke(); } else { rrect(g, bx, by, bw, bh, 14); g.fill(); g.stroke(); }
        g.beginPath(); g.moveTo(base, clamp(ty - 9, by + 6, by + bh - 6)); g.lineTo(tip.x, tip.y); g.lineTo(base, clamp(ty + 9, by + 6, by + bh - 6)); g.closePath(); g.fillStyle = evil ? '#07000a' : '#fff'; g.fill(); g.stroke();
        g.beginPath(); g.moveTo(base, clamp(ty - 8, by + 6, by + bh - 6)); g.lineTo(base + (onRight ? 5 : -5), ty); g.lineTo(base, clamp(ty + 8, by + 6, by + bh - 6)); g.fillStyle = evil ? '#07000a' : '#fff'; g.fill();
        if (!evil) halftone(g, bx, by, bw, bh, 'rgba(0,0,0,.09)');
        g.font = FT(fs); drawRuns(g, lay, bx + pad, by + pad + fs * 0.85, lh, D.n, evil ? '#fff' : '#111', evil ? '#ff3b4a' : '#d4142c');
        if (D.block && D.wait && T.t % 50 < 32) { g.font = FS(fs * 0.95); g.textAlign = 'right'; g.fillStyle = evil ? '#ff3b4a' : '#d4142c'; g.fillText((phone() ? 'TOCA  A' : 'ESPACIO') + '  ▶', bx + bw - pad * 0.8, by + bh - pad * 0.45); g.textAlign = 'left'; }
        g.restore();
    }
    function drawCaption() {
        if (!CAP) return; const g = ctx, W = PW(), fs = clamp(W * 0.024, 11, 15), maxW = clamp(W * 0.5, 150, 340), lay = layout(g, CAP.text, maxW, fs), lh = fs * 1.25;
        const a = clamp(CAP.t / 8, 0, 1) * clamp((CAP.life - CAP.t) / 12, 0, 1), w = lay.mw + 18; CAP.h = lay.L.length * lh + 14;
        g.save(); g.globalAlpha = a; g.translate(0, (1 - a) * -8);
        g.fillStyle = '#000'; g.fillRect(11, 11, w, CAP.h); g.fillStyle = CAP.kind === 'white' ? '#fff' : '#ffe94a'; g.fillRect(8, 8, w, CAP.h); g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeRect(8, 8, w, CAP.h);
        g.font = FT(fs); drawRuns(g, lay, 17, 8 + 7 + fs * 0.85, lh, 9999, '#111', '#d4142c'); g.restore();
    }
    function sfxAt(txt, x, y, col, size, life) { SFX.push({ txt, x, y, t: 0, life: life || 55, col: col || '#ff2a3c', size: size || 26, rot: rnd(-0.22, 0.22) }); }
    function drawSfx() {
        for (let i = SFX.length - 1; i >= 0; i--) {
            const s = SFX[i]; s.t++; if (s.t > s.life) { SFX.splice(i, 1); continue; }
            const k = s.t / s.life, sc = s.t < 8 ? 0.4 + s.t / 8 * 0.8 : 1.2 - 0.2 * Math.min(1, (s.t - 8) / 10), a = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
            ctx.save(); ctx.globalAlpha = a; ctx.translate(s.x, s.y - k * 18); ctx.rotate(s.rot); ctx.scale(sc, sc); ctx.font = FS(s.size); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
            ctx.lineWidth = 7; ctx.strokeStyle = '#000'; ctx.strokeText(s.txt, 3, 3); ctx.strokeText(s.txt, 0, 0); ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.strokeText(s.txt, 0, 0); ctx.fillStyle = s.col; ctx.fillText(s.txt, 0, 0); ctx.restore();
        }
    }
    function drawCallout() {
        if (T.callout <= 0 || !player) return; const g = ctx, cx = player.x + player.width / 2, cy = player.y + player.height / 2, p = 1 + 0.2 * S(T.t * 0.2), a = clamp(T.callout / 20, 0, 1);
        g.save(); g.globalAlpha = a; g.lineWidth = 3; g.strokeStyle = '#ffe94a'; g.beginPath(); g.arc(cx, cy, 15 * p, 0, TAU); g.stroke(); g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, 18 * p, 0, TAU); g.stroke();
        const lx = clamp(cx - 70, 70, PW() - 70), ly = Math.max(cy - 70, 150);
        g.strokeStyle = '#ffe94a'; g.lineWidth = 3; g.beginPath(); g.moveTo(lx + 30, ly + 8); g.lineTo(cx - 9, cy - 11); g.stroke();
        g.font = FS(24); g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round'; g.lineWidth = 6; g.strokeStyle = '#000'; g.strokeText('¡TU HITBOX!', lx, ly); g.fillStyle = '#4cff6a'; g.fillText('¡TU HITBOX!', lx, ly); g.restore();
    }
    function drawMarks() {
        T.marks.forEach(m => {
            const g = ctx, p = 1 + 0.12 * S(T.t * 0.12 + m.ph); g.save(); g.translate(m.x, m.y);
            g.globalAlpha = 0.9; g.lineWidth = 3; g.strokeStyle = '#4fd8ff'; g.setLineDash([8, 6]); g.lineDashOffset = -T.t * 0.6; g.beginPath(); g.arc(0, 0, m.r * p, 0, TAU); g.stroke(); g.setLineDash([]);
            g.fillStyle = 'rgba(79,216,255,.14)'; g.beginPath(); g.arc(0, 0, m.r * p, 0, TAU); g.fill();
            g.rotate(T.t * 0.03); starPath(g, 9, 0.5, 5, 0); g.fillStyle = '#ffe94a'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#000'; g.stroke(); g.restore();
        });
    }
    function drawBossBar() {
        if (!B || !T.hpBar || B.state === 'rise') return; const g = ctx, W = PW(), bw = clamp(W * 0.62, 180, 440), x = (W - bw) / 2, y = 34, f = clamp(B.hp / B.max, 0, 1), shown = T.hpBar.v += (f - T.hpBar.v) * 0.12;
        g.save(); g.font = FS(clamp(W * 0.032, 14, 20)); g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = 5; g.strokeStyle = '#000';
        const nm = B.phase === 3 ? 'E̷S̷T̷R̷E̷L̷L̷I̷T̷A̷.EXE' : 'ESTRELLITA.EXE'; g.strokeText(nm, W / 2, y - 3); g.fillStyle = '#ff3b4a'; g.fillText(nm, W / 2, y - 3);
        g.fillStyle = '#000'; g.fillRect(x - 3, y, bw + 6, 16); g.fillStyle = '#3a0010'; g.fillRect(x, y + 3, bw, 10); g.fillStyle = '#ffb02e'; g.fillRect(x, y + 3, bw * shown, 10); g.fillStyle = '#ff2a3c'; g.fillRect(x, y + 3, bw * f, 10);
        g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(x, y + 3, bw * f, 3); g.fillStyle = '#000'; g.fillRect(x + bw * 0.333 - 1, y, 2, 16); g.fillRect(x + bw * 0.666 - 1, y, 2, 16);
        g.lineWidth = 2; g.strokeStyle = '#fff'; g.strokeRect(x - 3, y, bw + 6, 16); g.restore();
    }
    function drawDumBars() {
        T.dum.forEach(d => { if (!d.bar) return; const e = d.e, w = e.width, g = ctx, f = clamp(d.hp / d.max, 0, 1); g.fillStyle = '#000'; g.fillRect(e.x - 1, e.y - 11, w + 2, 8); g.fillStyle = '#3a0010'; g.fillRect(e.x, e.y - 10, w, 6); g.fillStyle = f > 0.4 ? '#ffb02e' : '#ff2a3c'; g.fillRect(e.x, e.y - 10, w * f, 6); g.strokeStyle = '#fff'; g.lineWidth = 1; g.strokeRect(e.x - 1, e.y - 11, w + 2, 8); });
    }

    // ------------------------------------------------------------------ diálogo / corrutinas
    function tell(text, mood, style, ttl) {
        D = { text, n: 0, total: text.replace(/\*/g, '').length, style: style || (B && B.state !== 'gone' ? 'evil' : 'norm'), born: T.t, ttl: ttl == null ? null : ttl, ttlT: 0, bl: 0 };
        if (mood) star.mood = mood;
    }
    const typed = () => !D || D.n >= D.total;
    function cap(text, life, kind) { CAP = { text, life: life || 280, t: 0, kind: kind || 'yellow', h: 30 }; }
    function* wait(n) { for (let i = 0; i < n; i++) yield; }
    function* until(fn, maxF, hintAt, hintText) { let i = 0, hinted = false; while (!fn()) { i++; if (maxF && i >= maxF) return false; if (hintAt && !hinted && i >= hintAt) { hinted = true; tell(hintText, 'sassy'); } yield; } return true; }
    // Un diálogo NO se salta solo: espera a que pulses el botón de ataque (ESPACIO / botón A / tocar la pantalla / Enter)
    function* say(text, mood, hold, style) {
        tell(text, mood, style); D.block = true; T.adv = false; yield* until(typed);
        const myD = D; let w = 0; T.adv = false;
        while (D === myD) { w++; if (w < 14) T.adv = false; if (T.adv) { T.adv = false; break; } myD.wait = w >= 14; yield; }
        if (D === myD) myD.wait = false;
    }
    function advance() {
        if (!T.on || T.t - T.lastAdv < 8) return; T.lastAdv = T.t;
        if (D && !typed()) D.n = 1e9; else T.adv = true;
    }
    function stepDialog() {
        if (D) {
            if (D.n < D.total) { const before = Math.floor(D.n); D.n += (D.style === 'evil' ? 0.8 : 1.05); if (Math.floor(D.n) !== before && Math.floor(D.n) % 2 === 0) blip(D.style === 'evil'); }
            else if (D.ttl != null) { D.ttlT++; if (D.ttlT > D.ttl) D = null; }
        }
        if (CAP) { CAP.t++; if (CAP.t > CAP.life) CAP = null; }
        if (T.callout > 0) T.callout--;
    }

    // ------------------------------------------------------------------ utilidades de juego
    function fire(x, y, ang, sp, col, shape) {
        const b = new Bullet(x, y, true, false, C(ang) * sp, S(ang) * sp, 'player', shape || 'orb'); if (col) b.color = col;
        const p = bossFiring; bossFiring = true; try { pushEnemyBullet(b); } finally { bossFiring = p; } return b;
    }
    function ring(x, y, n, sp, a0, col, gapA, gapN) {
        for (let i = 0; i < n; i++) {
            const a = a0 + i * TAU / n; if (gapA != null) { let d = Math.abs(((a - gapA + Math.PI * 3) % TAU) - Math.PI); if (d < (gapN || 2) * TAU / n * 0.5 + 0.001) continue; }
            fire(x, y, a, sp, col);
        }
    }
    const pcx = () => player.x + player.width / 2, pcy = () => player.y + player.height / 2;
    function home() { const r = star.r; return { x: PW() - r - 16, y: r + 20 }; }
    function hurtPlayer() {
        if (Date.now() <= invulnerableUntil) return false;
        if (powerUps.shield > Date.now()) { createExplosion(pcx(), pcy(), '#0ff', 8, true); invulnerableUntil = Date.now() + 500; return false; }
        createExplosion(pcx(), pcy(), player.color, 30); lives -= shipHitDamage(); invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50); if (lives <= 0) gameOver(); return true;
    }
    function dmgOf(b) {
        let d = b.isSuper ? 3 : (b.source === 'partner' ? (0.3 + (window.Combo ? Combo.partnerBonus() : 0)) : (b.dmgMult || 1));
        try { d *= (1 + (powerLevel - 1) * 0.04) * playerDmgMul(b); } catch (e) {} return d;
    }
    // enemigos de práctica (propios del tutorial; no tocan la lista real de enemigos del juego)
    function spawnDummy(x, y, type, hp, bar, shoots) {
        const e = new Enemy(x, y, type, 0); e.vy = 0; e.entryPattern = 'straight'; e.sway = 14; e.vx = 0; e.spawnX = x; e.telegraphing = false;
        if (!shoots) e.maybeShoot = function () {};
        const d = { e, hp, max: hp, bar: !!bar, born: T.t }; T.dum.push(d); sfxAt('¡POOF!', x + e.width / 2, y, '#ffe94a', 20, 30); return d;
    }
    function killDummy(d, i) {
        const e = d.e, cx = e.x + e.width / 2, cy = e.y + e.height / 2; createExplosion(cx, cy, e.color, 70); screenShake = Math.max(screenShake, 4);
        const types = ['power', 'graze', 'attack', 'pixel']; for (let k = 0; k < 2; k++) pointItems.push(new PointItem(cx + rnd(-14, 14), cy + rnd(-10, 10), types[Math.floor(Math.random() * 3)]));
        sfxAt(['¡PUM!', '¡BAM!', '¡ZAS!'][Math.floor(Math.random() * 3)], cx, cy - 10, '#ffe94a', 26, 40); T.dum.splice(i, 1);
    }
    function stepDummies() {
        for (let i = T.dum.length - 1; i >= 0; i--) {
            const d = T.dum[i], e = d.e; e.update(); e.maybeShoot();
            for (let j = bullets.length - 1; j >= 0; j--) {
                const b = bullets[j]; if (!b || b.isEnemy) continue;
                if (!(b.pierce && b.hitList && b.hitList.includes(d)) && b.x < e.x + e.width && b.x + b.width > e.x && b.y < e.y + e.height && b.y + b.height > e.y) {
                    d.hp -= dmgOf(b); createExplosion(b.x, b.y, b.color, 3, true); if (b.pierce) { (b.hitList = b.hitList || []).push(d); } else bullets.splice(j, 1); d.flash = 4;
                    if (d.hp <= 0) { killDummy(d, i); break; }
                }
            }
        }
    }
    const dummyAlive = () => T.dum.length > 0;
    const watchPoint = it => !pointItems.includes(it);

    // ------------------------------------------------------------------ el JEFE: Estrellita malvada (3 fases)
    const BOSS_HP = 200, ATK = { 1: ['petals', 'rain', 'petals', 'rain'], 2: ['spiral', 'closing', 'rain', 'aimed'], 3: ['closing', 'vines', 'spiral', 'aimed', 'vines'] };
    const DUR = { petals: 290, rain: 270, spiral: 270, closing: 240, vines: 310, aimed: 250 };
    function newBoss() {
        const k = (PW() >= 640 && PH() >= 480) ? 4 : 3;
        return { x: star.x, y: star.y, k, r: 18 * k * 0.5, hp: BOSS_HP, max: BOSS_HP, phase: 1, vine: 0, mouth: 0, flash: 0, shake: 0, inv: 0, state: 'rise', t: 0, atk: null, atkT: 0, rest: 70, idx: 0, grow: 0.45, bombDealt: 0, tele: null, phaseHp: BOSS_HP, lastGift: 0, tx: PW() / 2, ty: PH() * 0.24, fireT: 0 };
    }
    const TAUNT = {
        hit: ['¿Eso es todo?', '¡Cosquillas!', '¡Más fuerte, piloto!', '¡Ja! ¡Ni lo sentí!'],
        p2: '¡AGH! ¿Sigues *vivo*? ¡Ahora mis *espinas* dolerán de verdad!',
        p3: '¡¡NO ME VAS A GANAR EN MI PROPIO *TUTORIAL*!!',
        down: ['¡Otra vez! Los tutoriales son para *repetirse*. ¡JA!', 'Qué pena... ¡te regalo vidas! Soy *generoso*.', '¡Game over! ...ah, no. Sigue, anda.'],
        gift: 'Toma otra *bomba*, que das lástima. ¡JEJE!'
    };
    function bossTaunt(txt, ttl) { tell(txt, null, 'evil', ttl || 150); sBadSoft(); }
    function sBadSoft() { tone(180, 90, 0.18, 'sawtooth', 0.05); }
    function bossBullets() {
        const b = B, W = PW(), H = PH(), t = b.atkT, ph = b.phase, spd = 1 + 0.1 * (ph - 1), mx = b.x, my = b.y + b.r * 0.25;
        b.mouth = clamp(b.mouth + 0.12, 0, 1);
        switch (b.atk) {
            case 'petals':
                if (t % 46 === 6) { ring(mx, my, 16, 1.9 * spd, t * 0.011, t % 92 === 6 ? '#ff6fd0' : '#ffffff'); sfxAt('¡PIU!', mx, my + b.r, '#ff4f86', 18, 26); }
                if (t % 92 === 30) { const a = Math.atan2(pcy() - my, pcx() - mx); fire(mx, my, a - 0.12, 2.8 * spd, '#ffe94a'); fire(mx, my, a + 0.12, 2.8 * spd, '#ffe94a'); }
                break;
            case 'rain':
                if (t % 10 === 0) { let x = rnd(24, W - 24); if (Math.abs(x - pcx()) < 30) x += (x < pcx() ? -1 : 1) * 56; fire(clamp(x, 12, W - 12), -8, Math.PI / 2, 2.9 * spd, '#7dffb0', 'spike'); }
                break;
            case 'spiral':
                if (t % 4 === 0) for (let j = 0; j < 3; j++) fire(mx, my, t * 0.19 + j * TAU / 3, 2.3 * spd, j === 1 ? '#ffe94a' : '#ff4f86');
                break;
            case 'closing':
                if (t === 2) b.tele = { x: clamp(pcx(), 120, W - 120), y: clamp(pcy(), 120, H - 120), t: 0 };
                if (b.tele) { b.tele.t++; }
                if (t === 50 || t === 125) {
                    const c = b.tele || { x: pcx(), y: pcy() }, n = 22, R = 165, a0 = rnd(0, TAU), gap = rnd(0, TAU), col = t === 50 ? '#ff6fd0' : '#4fd8ff';
                    for (let i = 0; i < n; i++) { const a = a0 + i * TAU / n; let d = Math.abs(((a - gap + Math.PI * 3) % TAU) - Math.PI); if (d < 0.36) continue; fire(c.x + C(a) * R, c.y + S(a) * R, a + Math.PI, 1.75 * spd, col); }
                    sfxAt('¡CERCO!', c.x, c.y - 30, '#ff2a3c', 24, 36);
                }
                if (t === 130) b.tele = null;
                break;
            case 'vines':
                if (t % 52 === 4) { const gx = clamp(pcx() + rnd(-110, 110), 80, W - 80); for (let x = 20; x < W - 10; x += 38) { if (Math.abs(x - gx) < 52) continue; fire(x, -10, Math.PI / 2, 2.4 * spd, '#ff7a3a', 'spike'); } sfxAt('¡ZAS!', gx, 50, '#7dffb0', 22, 28); }
                break;
            case 'aimed':
                if (t % 24 === 0) { const a = Math.atan2(pcy() - my, pcx() - mx), n = ph === 3 ? 5 : 3; for (let i = 0; i < n; i++) fire(mx, my, a + (i - (n - 1) / 2) * 0.24, 3.0 * spd, '#ffe94a'); }
                if (t % 96 === 60) ring(mx, my, 12, 2.1 * spd, rnd(0, 1), '#ffffff');
                break;
        }
    }
    function stepBoss() {
        if (!B) return; const b = B, W = PW(), H = PH(); b.t++; b.flash = Math.max(0, b.flash - 1); b.shake *= 0.9; b.mouth = Math.max(0, b.mouth - 0.04);
        if (b.state === 'rise') {
            const k = clamp(b.t / 100, 0, 1); b.grow = 0.45 + 0.55 * (1 - Math.pow(1 - k, 3)); b.vine = k; b.r = 18 * b.k * b.grow; b.x += (b.tx - b.x) * 0.04; b.y += (b.ty - b.y) * 0.04; b.shake = 5 * (1 - k);
            if (b.t >= 100) { b.state = 'talk'; b.grow = 1; b.vine = 1; }
            return;
        }
        b.r = 18 * b.k * b.grow;
        if (b.state === 'dying') { b.shake = 9; return; }
        // movimiento
        const tx = b.atk === 'closing' ? W / 2 : W / 2 + S(b.t * 0.011) * W * 0.27, ty = b.ty + S(b.t * 0.017) * 10; b.x += (tx - b.x) * 0.025; b.y += (ty - b.y) * 0.04;
        if (b.state !== 'active') return;
        if (b.inv > 0) { b.inv--; return; }
        // daño de las balas del jugador
        const hr = b.r * 0.82;
        for (let j = bullets.length - 1; j >= 0; j--) {
            const bl = bullets[j]; if (!bl || bl.isEnemy) continue; const cx = bl.x + bl.width / 2, cy = bl.y + bl.height / 2;
            if (Math.hypot(cx - b.x, cy - b.y) < hr + 5) {
                if (!(bl.pierce && bl.hitList && bl.hitList.includes(b))) {
                    b.hp -= dmgOf(bl); b.flash = 4; createExplosion(cx, cy, bl.color, 3, true); score += 10;
                    if (bl.pierce) (bl.hitList = bl.hitList || []).push(b); else bullets.splice(j, 1);
                    if (Math.random() < 0.06) bossTaunt(TAUNT.hit[Math.floor(Math.random() * TAUNT.hit.length)], 80);
                }
            }
        }
        // bomba
        try { if (window.BombFX && BombFX.active()) { if (b.bombDealt < 45) { b.hp -= 0.5; b.bombDealt += 0.5; b.flash = 2; } } else b.bombDealt = 0; } catch (e) {}
        // contacto con el cuerpo
        if (Math.hypot(pcx() - b.x, pcy() - b.y) < hr * 0.85) hurtPlayer();
        // regalo de bomba si no te quedan
        if (bombStock === 0 && T.t - b.lastGift > 1500 && !b.atk) { b.lastGift = T.t; setBombStock(1); bossTaunt(TAUNT.gift, 170); sfxAt('¡BOMBA!', pcx(), pcy() - 40, '#ffb02e', 22, 50); }
        else if (bombStock > 0) b.lastGift = Math.max(b.lastGift, T.t - 600);
        // fases
        const f = b.hp / b.max, np = f > 0.66 ? 1 : (f > 0.33 ? 2 : 3);
        if (b.hp <= 0) { return; }
        if (np > b.phase) {
            b.phase = np; b.inv = 130; b.atk = null; b.rest = 95; enemyBullets = []; b.phaseHp = np === 2 ? b.max * 0.66 : b.max * 0.33; b.hp = Math.min(b.hp, b.phaseHp);
            screenShake = 16; T.glitch = 40; T.flash = 0.7; sRumble(); sfxAt(np === 2 ? '¡KRAK!' : '¡¡KRAAAK!!', b.x, b.y - b.r - 10, '#ff2a3c', 34, 70); bossTaunt(np === 2 ? TAUNT.p2 : TAUNT.p3, 210); return;
        }
        // ataques
        if (!b.atk) { if (--b.rest <= 0) { b.atk = ATK[b.phase][b.idx++ % ATK[b.phase].length]; b.atkT = 0; } return; }
        b.atkT++; bossBullets();
        if (b.atkT >= DUR[b.atk]) { b.atk = null; b.rest = 55 + (4 - b.phase) * 10; b.tele = null; }
    }
    function drawBossWorld() {
        if (!B) return; const b = B, g = ctx;
        if (b.tele) { const k = b.tele.t / 50, a = clamp(1 - k, 0, 1) * 0.9; g.save(); g.globalAlpha = Math.max(0, a); g.strokeStyle = '#ff2a3c'; g.lineWidth = 3; g.setLineDash([6, 6]); g.beginPath(); g.arc(b.tele.x, b.tele.y, 165 * (0.3 + 0.7 * Math.min(1, k)), 0, TAU); g.stroke(); g.restore(); }
        { const gr = g.createRadialGradient(b.x, b.y, b.r * 0.4, b.x, b.y, b.r * 2.6), c = b.phase >= 3 ? '255,40,70' : (b.phase === 2 ? '220,60,160' : '255,190,40'); gr.addColorStop(0, 'rgba(' + c + ',.35)'); gr.addColorStop(1, 'rgba(' + c + ',0)'); g.fillStyle = gr; g.fillRect(b.x - b.r * 2.7, b.y - b.r * 2.7, b.r * 5.4, b.r * 5.4); }
        const spr = renderEvil(b, T.t, clamp((pcx() - b.x) / 200, -1, 1), clamp((pcy() - b.y) / 200, -1, 1)), size = 130 * b.k * b.grow;
        const sx = b.x + (Math.random() - 0.5) * b.shake, sy = b.y + (Math.random() - 0.5) * b.shake + S(T.t * 0.05) * 2;
        const blink = b.inv > 0 && Math.floor(T.t / 5) % 2 === 0;
        blit(spr, sx, sy, size, blink ? 0.45 : 1);
        if (b.flash > 0) { ctx.globalCompositeOperation = 'lighter'; blit(spr, sx, sy, size, 0.5); ctx.globalCompositeOperation = 'source-over'; }
    }

    // ------------------------------------------------------------------ el guion (cada lección es de verdad un poco de juego)
    function* sIntro() {
        star.vis = true; star.pop = 40; star.mood = 'happy'; const h = home(); star.x = star.tx = h.x; star.y = star.ty = h.y; sPop(); sfxAt('¡POOF!', star.x, star.y + star.r, '#ffe94a', 30, 50);
        yield* wait(45);
        cap('NARRADOR: Una estrella adorable aparece. Todo bien. Nada sospechoso.', 330);
        yield* say('¡Hola! ¡Soy *ESTRELLITA*! Te voy a enseñar a jugar.', 'happy');
        yield* say('Nada de pantallas aburridas: aquí se aprende *JUGANDO*. ¡Hasta rompo la cuarta pared por ti!', 'wink');
    }
    function* sMove() {
        yield* say(phone() ? 'Primero: *MUÉVETE*. Usa el *JOYSTICK* de la izquierda.' : 'Primero: *MUÉVETE*. Usa las *FLECHAS* del teclado.', 'happy', 25);
        const W = PW(), H = PH(), pts = [[W * 0.2, H * 0.62], [W * 0.8, H * 0.62], [W * 0.5, H * 0.5]];
        tell('Pasa por los *círculos* brillantes. ¡Es como caminar, pero con más estilo!', 'happy');
        for (let i = 0; i < pts.length; i++) {
            T.marks = [{ x: pts[i][0], y: pts[i][1], r: 28, ph: i }]; const m = T.marks[0];
            yield* until(() => Math.hypot(pcx() - m.x, pcy() - m.y) < m.r + 3, 0, 620, '¿Te dormiste? Lleva tu nave hasta el *círculo*.');
            sDing(); sfxAt('¡DING!', m.x, m.y - 24, '#4fd8ff', 24, 40); createExplosion(m.x, m.y, '#4fd8ff', 22, true);
        }
        T.marks = []; cap('NARRADOR: Casi parece un piloto de verdad.', 240);
        yield* say('¡Perfecto! Ya te mueves como un profesional.', 'happy', 45);
    }
    function* sShoot() {
        yield* say(phone() ? 'Ahora *DISPARA*: mantén el botón *A* (o activa *AUTO*).' : 'Ahora *DISPARA*: mantén pulsado *ESPACIO*.', 'happy', 25);
        const W = PW(), H = PH(); [0.25, 0.5, 0.75].forEach((f, i) => spawnDummy(W * f - 39, H * (i === 1 ? 0.4 : 0.47), 1, 3, false, false));
        tell('Destruye esos *blancos de práctica*. ¡No se defienden!', 'wink');
        yield* until(() => !dummyAlive(), 0, 900, 'Apunta con la punta de tu nave: ¡las balas salen hacia *arriba*!');
        yield* say('¡PUM! Así se hace. Los enemigos de verdad también *disparan*, pero estos eran de cortesía.', 'happy', 50);
    }
    function* collect(mkIt, hintTxt) {
        for (let n = 0; n < 3; n++) {
            star.tx = dropX(); star.ty = Math.max(home().y, 70); yield* wait(40);
            const it = mkIt(); const ok = yield* until(() => !pointItems.includes(it) && !items.includes(it), 720);
            if (ok && it.y < PH() + 20) { sfxAt('¡ÑAM!', pcx(), pcy() - 30, '#ffe94a', 22, 36); sDing(); return true; }
            if (n < 2) tell(hintTxt, 'sassy');
        }
        return false;
    }
    const dropX = () => clamp(pcx() + rnd(-140, 140), 40, PW() - 60), dropY = () => star.y + star.r * 0.9;
    function mkPoint(type) { return () => { const it = new PointItem(clamp(star.x - 8, 20, PW() - 40), dropY(), type); it.vy = 2.2; pointItems.push(it); sfxAt('¡TOMA!', star.x, star.y + star.r + 20, '#ffe94a', 18, 28); return it; }; }
    function* sItems() {
        yield* say('Al derrotar enemigos sueltan *premios*. ¡Recógelos tocándolos! Mira, te lanzo unos.', 'wink', 30);
        tell('El *P rojo* da *VIDA*: junta 5 y ganas una extra.', 'happy'); yield* collect(mkPoint('power'), '¡Se te cae! Tócalo con la nave.');
        tell('El *G verde* carga tu *BOMBA*.', 'happy'); yield* collect(mkPoint('graze'), '¡Que no se escape el verde!');
        tell('El *A naranja* sube tu *NIVEL DE ATAQUE*.', 'happy'); yield* collect(mkPoint('attack'), '¡Atrapa el naranja!');
        tell('Y las *tarjetas* dan poderes por unos segundos. ¡Esta es un *ESCUDO*!', 'wink');
        yield* collect(() => { const it = new Item(clamp(star.x - 8, 20, PW() - 40), dropY()); it.type = 0; items.push(it); sfxAt('¡TOMA!', star.x, star.y + star.r + 20, '#ffe94a', 18, 28); return it; }, 'La tarjeta cae lento... ¡tú puedes!');
        yield* say('¡Todo eso sin pagar impuestos! Sigamos.', 'sassy', 35);
    }
    function* sHitbox() {
        T.callout = 99999; yield* say('Ahora lo *IMPORTANTE*. ¿Ves ese *puntito verde* en medio de tu nave? Es tu *HITBOX*.', 'happy', 30);
        cap('NARRADOR: El resto de la nave es puro estilo.', 260);
        yield* say('Solo *ese puntito* recibe daño. ¡Las alas son decoración!', 'sassy', 40);
        T.callout = 30; tell('Quédate quieto y deja que las balas *rocen* tus alas...', 'wink'); T.grazes = 0; T.lastGraze = grazePoints;
        let n = 0; const t0 = T.t;
        yield* until(() => { if (n % 40 === 1 && T.t - t0 < 900) { const x = pcx(), y = Math.max(30, pcy() - 220); fire(x - 24, y, Math.PI / 2, 2.4, '#ff6fd0'); fire(x + 24, y, Math.PI / 2, 2.4, '#4fd8ff'); } n++; return T.grazes >= 4; }, 1100, 700, 'Solo quédate *quieto*: las balas pasan a los lados de tu nave.');
        yield* say('¡Eso es *GRAZE*! Rozar balas carga tu *BOMBA*. ¡Riesgo = recompensa!', 'happy', 45);
        yield* say(phone() ? 'Para esquivar con precisión mantén *SLOW*. Ahora... *esquiva* esto.' : 'Para esquivar con precisión mantén *SHIFT* (ir lento). Ahora... *esquiva* esto.', 'sassy', 30);
        T.hits = 0; T.hitFlag = false;
        for (let w = 0; w < 4; w++) { const a = Math.atan2(pcy() - star.y, pcx() - star.x) + rnd(-0.5, 0.5); ring(star.x, star.y, 22, 1.9, 0, '#ff6fd0', a, 3); sfxAt('¡PIU!', star.x, star.y + star.r + 22, '#ff4f86', 20, 28); yield* wait(110); }
        yield* wait(150);
        if (T.hits > 0) yield* say('¡Auch! Eso fue una vida menos... pero aquí son *infinitas*. Tutorial generoso.', 'wink', 50);
        else yield* say('¡Ni un rasguño! Me caes bien... *por ahora*.', 'sassy', 45);
    }
    function* sBomb() {
        yield* say('Rozar balas llena tu *BOMBA*, pero tarda. ¡Te *regalo* una!', 'happy', 25); setBombStock(1); sDing(); sfxAt('¡BOMBA!', pcx(), pcy() - 40, '#ffb02e', 24, 50);
        yield* say(phone() ? 'Cuando todo se ponga feo, toca el botón *B*.' : 'Cuando todo se ponga feo, pulsa la tecla *Z*.', 'happy', 20);
        tell('¡Uy! ¡Cuántas balas! ¡Usa la *BOMBA*!', 'shock'); let f = 0, used = false;
        while (!used && f < 1500) {
            f++; if (f % 50 === 1 && f < 160) ring(star.x, star.y, 24, 1.5, rnd(0, 1), '#ff6fd0'); if (f % 16 === 0 && f < 400) fire(rnd(20, PW() - 20), -8, Math.PI / 2, 2.6, null, 'spike');
            if (f === 420) tell('¡Es ahora! Usa la *BOMBA*, ¡rápido!', 'shock'); used = bombStock === 0 || !!(window.BombFX && BombFX.active()); yield;
        }
        if (!used) { enemyBullets = []; yield* say('No pasa nada, también se puede esquivar. Te dejo la bomba.', 'wink', 40); }
        else { yield* wait(80); yield* say('¡Todo limpio! La bomba borra balas y también *daña enemigos*.', 'happy', 50); }
    }
    function* sBig() {
        yield* say('Los enemigos *grandes* aguantan más. En el juego cada zona trae un *MINI JEFE* y un *JEFE* con barra de vida. ¡Prueba con este!', 'wink', 40);
        spawnDummy(PW() / 2 - 48, PH() * 0.3, 2, 14, true, true); tell('¡Dispárale sin parar y *esquiva* sus anillos!', 'happy');
        yield* until(() => !dummyAlive(), 0, 1000, 'Aguanta: su barra de vida baja con cada disparo.');
        yield* wait(40); yield* say('¡Cayó! Los jefes sueltan *monedas* y *gemas* para la tienda. Aquí solo hay orgullo.', 'happy', 55);
    }
    function* sPellets() {
        yield* say('Bueno... ya sabes lo básico. Como *regalo* final: unas *balitas de AMISTAD*. ¡Atrápalas todas!', 'happy', 20);
        T.hitFlag = false; const W = PW();
        for (let w = 0; w < 2; w++) {
            for (let i = 0; i < 7; i++) {
                const b = fire(W * (0.1 + 0.8 * i / 6) + (w ? 22 : 0), -10, Math.PI / 2, 1.5, '#ffffff'); let age = 0, up = Bullet.prototype.update;
                b.update = function () { age++; if (age < 170) { const dx = pcx() - this.x, dy = pcy() - this.y, d = Math.hypot(dx, dy) || 1; this.vx += (dx / d * 1.6 - this.vx) * 0.025; this.vy += (dy / d * 1.6 - this.vy) * 0.025; } up.call(this); };
            }
            yield* wait(90);
        }
        yield* until(() => T.hitFlag || enemyBullets.length === 0, 760);
        if (T.hitFlag) { yield* wait(8); T.lives = 1; lives = 1; sBad(); sfxAt('¡AUCH!', pcx(), pcy() - 40, '#ff2a3c', 30, 50); }
        else { yield* say('¿Esquivaste mis *regalos*? Qué grosero...', 'sassy', 30); }
    }
    function* sTransform() {
        T.music = 'none'; try { stopMusic(); } catch (e) {} enemyBullets = []; T.darkTarget = 0.4;
        star.tx = PW() / 2; star.ty = PH() * 0.27; cap('NARRADOR: Les dije que era sospechoso.', 300);
        yield* wait(70);
        yield* say('Qué *tonto* eres... ¿De verdad creíste que un tutorial sería *amable*?', 'creep', 45);
        yield* say('En este juego hay una sola regla: *DISPARAS*... o te *DISPARAN*.', 'creep', 45);
        yield* say('Y a mí me sobran... *BALAS*.', 'creep', 25);
        sRumble(); T.glitch = 160; screenShake = 14; star.shake = 12; sfxAt('¡CRRRAK!', star.x, star.y - star.r, '#ff2a3c', 38, 70); yield* wait(75);
        T.flash = 1; B = newBoss(); star.vis = false; D = null; sfxAt('¡¡KRAAAK!!', B.x, B.y - 60, '#ff2a3c', 44, 80); sLaugh();
        yield* until(() => B.state !== 'rise');
        yield* say('¡MUAJAJAJA! ¡BIENVENIDO A TU PRIMER *JEFE*!', null, 30, 'evil'); B.mouth = 1;
        yield* say('Toma una *bomba*... la vas a necesitar. ¡JEJEJE!', null, 30, 'evil'); setBombStock(1); sDing();
        lives = 3; T.lives = 3; T.restoreLives = false; invulnerableUntil = Date.now() + 2500; T.music = 'boss';
        B.state = 'active'; T.hpBar = { v: 1 }; B.rest = 50; tell('¡*DISPARA* si puedes, piloto!', null, 'evil', 140);
    }
    function* sBoss() { yield* until(() => B.hp <= 0); }
    function* sEnd() {
        const b = B; b.state = 'dying'; b.atk = null; enemyBullets = []; T.hpBar = null; T.music = 'none'; try { stopMusic(); } catch (e) {} T.darkTarget = 0; D = null; CAP = null;
        sfxAt('¡NOOOOO!', b.x, b.y - b.r - 10, '#ff2a3c', 40, 90); sBad(); T.glitch = 120;
        for (let i = 0; i < 110; i++) { if (i % 14 === 0) { createExplosion(b.x + rnd(-b.r, b.r), b.y + rnd(-b.r, b.r), '#ffb02e', 25); screenShake = 8; } b.mouth = 1; yield; }
        T.flash = 1; sPop(); createExplosion(b.x, b.y, '#ff2a3c', 90); const bx = b.x, by = b.y; B = null; star.vis = true; star.x = star.tx = bx; star.y = star.ty = by; star.mood = 'cry'; star.pop = 30; T.dark = 0;
        yield* wait(50);
        yield* say('N-no, espera... ¡era una *BROMA*! ¡Parte del tutorial!', 'cry', 40);
        yield* say('Mira, hasta te enseñé a jugar... ¿Amigos? ¿Sí?', 'cry', 50);
        cap('NARRADOR: Y nuestro héroe aprendió a jugar... y a no confiar en estrellas parlantes.', 400);
        star.tx = PW() * 0.5; star.ty = star.y - 30; yield* wait(40);
        sPop(); createExplosion(star.x, star.y, '#ffe94a', 70); sfxAt('¡POP!', star.x, star.y, '#ffe94a', 38, 70); star.vis = false; D = null; yield* wait(130);
        T.fadeTarget = 1; sfxAt('¡FIN DEL TUTORIAL!', PW() / 2, PH() * 0.45, '#ffe94a', 32, 120); yield* wait(130);
    }
    const SECTIONS = [['intro', sIntro], ['move', sMove], ['shoot', sShoot], ['items', sItems], ['hitbox', sHitbox], ['bomb', sBomb], ['big', sBig], ['pellets', sPellets], ['transform', sTransform], ['boss', sBoss], ['end', sEnd]];
    function* script(from) {
        let go = !from;
        for (const [name, fn] of SECTIONS) {
            if (!go && name === from) go = true; if (!go) continue;
            if (from && name === from) {      // arranque directo en una sección (pruebas: Tutorial.dev.go('boss'))
                const h = home(); star.x = star.tx = h.x; star.y = star.ty = h.y; star.vis = name !== 'boss' && name !== 'end'; star.pop = 20;
                if (name === 'boss' || name === 'end') {
                    B = newBoss(); B.state = 'active'; B.grow = 1; B.vine = 1; B.r = 18 * B.k; B.x = PW() / 2; B.y = PH() * 0.24; B.hp = name === 'end' ? 0 : BOSS_HP; T.hpBar = { v: 1 }; lives = 3; T.lives = 3; T.restoreLives = false; T.music = 'boss'; T.darkTarget = 0.4; setBombStock(1);
                }
            }
            if (name !== 'transform' && name !== 'boss' && name !== 'end') { const h2 = home(); star.tx = h2.x; star.ty = h2.y; }
            yield* fn();
        }
    }

    // ------------------------------------------------------------------ bucle de la escena
    function stepStar() {
        const k = PW() >= 640 ? 3 : 2; star.r = 15.5 * k; if (!star.init) { const h = home(); star.x = star.tx = h.x; star.y = star.ty = h.y; star.init = true; }
        star.x += (star.tx - star.x) * 0.07; star.y += (star.ty - star.y) * 0.07; if (star.pop > 0) star.pop--; star.shake *= 0.9;
    }
    function watch() {
        if (invulnerableUntil !== T.lastInv) {
            if (invulnerableUntil - Date.now() > 800) { T.hits++; T.hitFlag = true; sfxAt('¡AUCH!', pcx(), pcy() - 34, '#ff2a3c', 24, 40); screenShake = Math.max(screenShake, 8); }
            T.lastInv = invulnerableUntil;
        }
        if (grazePoints > T.lastGraze) { T.grazes++; sfxAt('¡GRAZE!', pcx() + rnd(-20, 20), pcy() - 34, '#4cff6a', 20, 30); }
        T.lastGraze = grazePoints;
    }
    function onDown() {
        T.downs++; T.clearB = true; invulnerableUntil = Date.now() + 3000;
        if (B && B.state === 'active') { lives = 3; B.hp = Math.min(B.phaseHp, B.hp + 30); B.atk = null; B.rest = 110; sBad(); screenShake = 14; sfxAt('¡KO!', pcx(), pcy() - 40, '#ff2a3c', 34, 60); bossTaunt(TAUNT.down[Math.floor(Math.random() * TAUNT.down.length)], 200); return; }
        lives = Math.max(T.lives, 2); sBad();
    }
    function step() {
        if (!isPlaying || !player) { finish(true); return; }
        T.t++; levelTransitionTimer = 9e5;     // mientras dura el tutorial no salen oleadas reales
        T.dark += ((T.darkTarget || 0) - T.dark) * 0.03; T.fade += ((T.fadeTarget || 0) - T.fade) * 0.05; if (T.glitch > 0) T.glitch--;
        if (T.clearB) { enemyBullets = []; T.clearB = false; }
        { const sp = !!(typeof keys !== 'undefined' && keys['Space']); if (sp && !T.lastSpace) advance(); T.lastSpace = sp; }
        stepStar(); stepDialog(); watch(); stepDummies(); stepBoss();
        if (T.restoreLives && lives < T.lives) lives = T.lives;
        if (T.gen) { let r; try { r = T.gen.next(); } catch (e) { console.warn('[Tutorial] guion', e); finish(true); return; } if (r.done) finish(false); }
    }
    function drawBg() {
        const g = ctx, W = PW(), H = PH(); g.fillStyle = '#03020c'; g.fillRect(0, 0, W, H);
        if (!T.bgS.length) for (let i = 0; i < 90; i++) T.bgS.push([Math.random(), Math.random(), 0.3 + Math.random() * 1.2, Math.random() * TAU]);
        g.fillStyle = (B && B.phase >= 2) ? '#ff7a8a' : '#fff';
        T.bgS.forEach(s => { s[1] = (s[1] + s[2] * 0.0006 * (B ? 2.2 : 1)) % 1; g.globalAlpha = 0.3 + 0.55 * Math.abs(S(T.t * 0.02 + s[3])); g.fillRect(s[0] * W, s[1] * H, s[2] + 0.6, s[2] + 0.6); });
        g.globalAlpha = 1; if (T.dark > 0.01) { g.fillStyle = 'rgba(40,0,12,' + (T.dark * 0.6).toFixed(3) + ')'; g.fillRect(0, 0, W, H); }
    }
    function drawStarWorld() {
        if (!star.vis) return; const k = PW() >= 640 ? 3 : 2, sp = renderStar(star.mood, T.t, star.rot + S(T.t * 0.003) * 0.08), sc = star.pop > 0 ? 1 - Math.pow(star.pop / 40, 2) : 1, size = 36 * k * Math.max(0.05, sc);
        const sx = star.x + (Math.random() - 0.5) * star.shake, sy = star.y + S(T.t * 0.05) * 3 + (Math.random() - 0.5) * star.shake;
        ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = '#ffe94a'; ctx.beginPath(); ctx.arc(sx, sy, star.r * 1.4 * sc, 0, TAU); ctx.fill(); ctx.restore(); blit(sp, sx, sy, size);
    }
    function world() {
        drawMarks();
        T.dum.forEach(d => { try { d.e.draw(currentEnemyFrame); } catch (e) {} }); drawDumBars();
        drawStarWorld(); drawBossWorld();
    }
    function ui() {
        const g = ctx, W = PW(), H = PH();
        drawCallout(); drawSfx(); drawBossBar(); drawCaption(); drawBubble();
        if (T.glitch > 0) { g.save(); for (let i = 0; i < 5; i++) { g.globalAlpha = 0.18; g.fillStyle = ['#ff2a3c', '#4fd8ff', '#fff'][i % 3]; g.fillRect(0, Math.random() * H, W, 2 + Math.random() * 10); } g.restore(); }
        if (T.flash > 0) { g.save(); g.fillStyle = 'rgba(255,255,255,' + clamp(T.flash, 0, 1).toFixed(3) + ')'; g.fillRect(0, 0, W, H); g.restore(); T.flash = Math.max(0, T.flash - 0.03); }
        if (T.fade > 0.01) { g.save(); g.fillStyle = 'rgba(0,0,0,' + clamp(T.fade, 0, 1).toFixed(3) + ')'; g.fillRect(0, 0, W, H); g.restore(); }
    }
    function musicStep() {
        try {
            if (T.music === 'none') { stopMusic(); return; }
            const tr = T.music === 'boss' ? pickTrack(['nivel7_jefe.mp3', 'por_defecto_jefe.mp3']) : (typeof bgmMenu !== 'undefined' ? bgmMenu : null);
            if (tr) playMusic(tr);
        } catch (e) {}
    }

    // ------------------------------------------------------------------ guardar / devolver el estado de la partida
    function snapshot() {
        return {
            lives, score, hiScore, enemies, bullets, enemyBullets, items, pointItems, particles, dopamineParticles, partners, powerUps, powerLevel, powerPoints, grazePoints, partnerPoints, bombStock,
            enemiesDefeatedForPower, levelPhase, waveTimer, activeBoss, activeMiniBoss, formationCooldown, miniBossMinionTimer, invulnerableUntil, levelTransitionTimer, levelEnemiesDefeated, levelScoreStart,
            bossIntroTimer, miniBossAnnounceTimer, bossBgPlanet, levelCompleteActive, px: player.x, py: player.y
        };
    }
    function restore(s) {
        lives = s.lives; score = s.score; hiScore = s.hiScore; enemies = s.enemies; bullets = s.bullets; enemyBullets = s.enemyBullets; items = s.items; pointItems = s.pointItems; particles = s.particles; dopamineParticles = s.dopamineParticles;
        partners = s.partners; powerUps = s.powerUps; powerLevel = s.powerLevel; powerPoints = s.powerPoints; grazePoints = s.grazePoints; partnerPoints = s.partnerPoints; setBombStock(s.bombStock); enemiesDefeatedForPower = s.enemiesDefeatedForPower;
        levelPhase = s.levelPhase; waveTimer = s.waveTimer; activeBoss = s.activeBoss; activeMiniBoss = s.activeMiniBoss; formationCooldown = s.formationCooldown; miniBossMinionTimer = s.miniBossMinionTimer;
        invulnerableUntil = s.invulnerableUntil; levelTransitionTimer = s.levelTransitionTimer; levelEnemiesDefeated = s.levelEnemiesDefeated; levelScoreStart = s.levelScoreStart; bossIntroTimer = s.bossIntroTimer;
        miniBossAnnounceTimer = s.miniBossAnnounceTimer; bossBgPlanet = s.bossBgPlanet; levelCompleteActive = s.levelCompleteActive; player.x = s.px; player.y = s.py;
    }
    function clearTutorialArrays() { enemies = []; bullets = []; enemyBullets = []; items = []; pointItems = []; particles = []; dopamineParticles = []; partners = []; activeBoss = null; activeMiniBoss = null; }
    function start(replay, from) {
        if (T.on || !isPlaying || typeof player === 'undefined' || !player) return false;
        T.snap = snapshot(); T.replay = !!replay;
        Object.assign(T, { t: 0, music: 'menu', lives: 5, restoreLives: true, hits: 0, hitFlag: false, grazes: 0, adv: false, downs: 0, marks: [], dum: [], callout: 0, fade: 0, fadeTarget: 0, dark: 0, darkTarget: 0, flash: 0, glitch: 0, hpBar: null, skipT: 0, clearB: false });
        star.vis = false; star.init = false; star.shake = 0; star.mood = 'happy'; star.pop = 0; D = null; CAP = null; B = null; SFX.length = 0;
        clearTutorialArrays(); levelCompleteActive = false; levelPhase = 'wave1'; waveTimer = 0; powerUps = { shield: 0, doubleFire: 0, paralyze: 0, superShot: 0 }; powerLevel = 1; powerPoints = 0; grazePoints = 0; partnerPoints = 0;
        setBombStock(0); enemiesDefeatedForPower = 0; lives = T.lives; score = 0; invulnerableUntil = 0; miniBossAnnounceTimer = 0; bossIntroTimer = 0; levelTransitionTimer = 9e5;
        try { isCharging = false; if (window.BombFX) BombFX.reset(); bombEffect.active = false; } catch (e) {}
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); } catch (e) {}
        player.resetPosition(); T.lastInv = invulnerableUntil; T.lastGraze = grazePoints;
        window.TutorialOpen = true; T.on = true; T.gen = script(from); buildSkip(); return true;
    }
    function finish(skipped) {
        if (!T.on) return; T.on = false; T.gen = null; const s = T.snap; T.snap = null;
        try { if (window.BombFX) BombFX.reset(); bombEffect.active = false; } catch (e) {}
        if (s && isPlaying && player) restore(s); else { clearTutorialArrays(); }
        if (!T.replay) {
            seen = true; ls.set('sg_tut_seen', '1');
            try { if (window.Combo) Combo.reset(); } catch (e) {}
            if (isPlaying && player) { levelTransitionTimer = LEVEL_TRANSITION_DURATION; player.resetPosition(); }
        }
        window.TutorialOpen = false; T.pending = false; D = null; CAP = null; B = null; star.vis = false; T.dum = []; T.marks = []; SFX.length = 0; removeSkip();
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); if (typeof stopShoot === 'function') stopShoot(); } catch (e) {}
        try { stopMusic(); } catch (e) {}
    }
    function tick() {      // primera partida (modo Moderno, no práctica): espera a que la nave termine de llegar y empieza la escena
        if (seen || T.on) return;
        if (!isPlaying || currentMode !== 'moderno' || (typeof practiceStage !== 'undefined' && practiceStage) || currentWave !== 1) return;
        if (!T.pending) { T.pending = true; window.TutorialOpen = true; }     // la historia espera a que acabe el tutorial
        if (gameStartTimer > 0 || levelTransitionTimer > 0 || window.StoryOpen || window.PerkOpen || window.PerfilOpen || deathAnim || reviveAnim || continueState) return;
        if (typeof Cine !== 'undefined' && ((Cine.arrivalActive && Cine.arrivalActive()) || (Cine.exitActive && Cine.exitActive()))) return;
        start(false);
    }
    const safe = () => isPlaying && !T.on && typeof player !== 'undefined' && player && currentMode === 'moderno' && !activeBoss && !activeMiniBoss && !levelCompleteActive && gameStartTimer <= 0 && !deathAnim && !reviveAnim && !continueState && !coinCine &&
        !(typeof Cine !== 'undefined' && ((Cine.arrivalActive && Cine.arrivalActive()) || (Cine.exitActive && Cine.exitActive())));

    // ------------------------------------------------------------------ interfaz (botón de saltar, botón en la pausa, teclas)
    function buildSkip() {
        if (!$('tcStyle2')) {
            const st = document.createElement('style'); st.id = 'tcStyle2';
            st.textContent = '#tcSkip2{position:fixed;bottom:8px;right:8px;z-index:9990;font:900 11px Impact,"Arial Black",sans-serif;letter-spacing:.5px;padding:8px 12px;border:3px solid #ffe94a;background:#111;color:#ffe94a;border-radius:6px;cursor:pointer;opacity:.85}#tcSkip2:active{background:#d4142c;color:#fff}';
            document.head.appendChild(st);
        }
        removeSkip(); const b = document.createElement('button'); b.id = 'tcSkip2'; b.type = 'button'; b.textContent = 'SALTAR TUTORIAL ✕'; if (phone()) { b.style.bottom = 'auto'; b.style.top = '6px'; b.style.right = 'auto'; b.style.left = '50%'; b.style.transform = 'translateX(-50%)'; b.style.padding = '5px 9px'; b.style.fontSize = '9px'; }
        b.onclick = () => { if (T.skipT > 0) { finish(true); } else { T.skipT = 1; b.textContent = '¿SEGURO? TOCA OTRA VEZ'; setTimeout(() => { T.skipT = 0; if (b.isConnected) b.textContent = 'SALTAR TUTORIAL ✕'; }, 2500); } };
        document.body.appendChild(b); T.skipBtn = b;
    }
    function removeSkip() { if (T.skipBtn) { T.skipBtn.remove(); T.skipBtn = null; } const o = $('tcSkip2'); if (o) o.remove(); }
    window.addEventListener('keydown', e => { if (!T.on) return; if (e.key === 'Enter' || e.key === 'x' || e.key === 'X') { advance(); e.preventDefault(); } }, true);
    try { $('btnShoot').addEventListener('pointerdown', () => { if (T.on) advance(); }); } catch (e) {}
    try { $('gameCanvas').addEventListener('pointerdown', () => { if (T.on) advance(); }); } catch (e) {}
    setInterval(() => {
        if (T.on && !isPlaying) finish(true);
        if (T.pending && !T.on && !isPlaying) { T.pending = false; window.TutorialOpen = false; }
        const po = $('pauseOverlay'); if (!po || po.classList.contains('hidden') || $('btnTutorial')) return;   // botón "VER TUTORIAL" en el menú de pausa
        const q = $('btnQuitToMenu'), r = $('btnResume'); if (!q) return;
        const b = document.createElement('button'); b.id = 'btnTutorial'; b.type = 'button'; b.textContent = 'VER TUTORIAL'; if (r) b.className = r.className;
        b.onclick = () => { if (!safe()) { b.textContent = 'SOLO ENTRE JEFES'; setTimeout(() => { b.textContent = 'VER TUTORIAL'; }, 1800); return; } if (r) r.click(); setTimeout(() => start(true), 60); };
        q.parentNode.insertBefore(b, q);
    }, 500);

    // ------------------------------------------------------------------ enganches al juego
    const _bg = window.drawThemeBackground;
    window.drawThemeBackground = function () {
        if (!T.on) return _bg.apply(this, arguments);
        try { step(); } catch (e) { console.warn('[Tutorial] step', e); }
        if (!T.on) return _bg.apply(this, arguments);
        try { drawBg(); world(); } catch (e) { console.warn('[Tutorial] dibujo', e); }
    };
    const _hud = window.drawHud;
    window.drawHud = function () {
        try { if (!T.on) tick(); } catch (e) { console.warn('[Tutorial]', e); }   // antes que la historia: así ella espera a que acabe el tutorial
        const r = _hud.apply(this, arguments); try { if (T.on) ui(); } catch (e) { console.warn('[Tutorial]', e); } return r;
    };
    const _go = window.gameOver;
    window.gameOver = function () { if (T.on) { try { onDown(); } catch (e) { lives = Math.max(lives, 3); } return; } return _go.apply(this, arguments); };
    const _ums = window.updateMusicState;
    window.updateMusicState = function () { if (!T.on) return _ums.apply(this, arguments); musicStep(); };

    window.Tutorial = {
        show() { start(true); }, reset() { seen = false; ls.set('sg_tut_seen', '0'); }, close() { finish(true); }, state: T,
        dev: { go(name) { if (T.on) finish(true); return start(true, name); }, hp(n) { if (B) B.hp = n; }, boss() { return B; }, star }
    };
})();
