// ============================================================================
//  sprites8bit_plus.js — v58 · SPRITES 8-BIT MEJORADOS PARA ENEMIGOS, MINI JEFES Y JEFES (mismo estilo, más detalle y mejor animación)
// ----------------------------------------------------------------------------
//  Parte de TUS sprites 8-bit de shmup_art.js (no los reemplaza por otro estilo) y los trabaja así:
//    · DOBLE RESOLUCIÓN de píxel (escalado "EPX": diagonales y curvas más finas) con contorno de 1 píxel nuevo
//    · contorno interior de color (en vez de todo negro), luz arriba-izquierda / sombra abajo-derecha y brillo del color del nivel (aura de píxeles)
//    · ANIMACIÓN de 16 cuadros (antes 2): aleteo/ondeo de alas, brazos y tentáculos, vaivén de la falda o cola, flotación suave y respiración,
//      alternando además las dos poses originales; los 3 tipos de enemigo desfasados para que no se muevan todos igual
//    · poses de carga / disparo / golpe como antes (temblor, destello blanco, chispas de píxel), un poco más marcadas
//  Los cuadros se hornean una sola vez por sprite y se reutilizan (casi no cuesta rendimiento).
//  Botón "SPRITES: MEJORADOS / CLÁSICOS" en la pausa. Consola: Sprites8Plus.enabled = false
// ============================================================================
(function () {
    'use strict';
    if (typeof SHMUP_ART === 'undefined' || typeof PX === 'undefined' || typeof PX.draw !== 'function') return;
    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos, clamp = (v, a, b) => Math.max(a, Math.min(b, v)), KEYLS = 'sg_s8plus';
    const NF = 16, TICK = { enemy: 3, mini: 4, boss: 5 };
    const SP = window.Sprites8Plus = { enabled: true, stats: { baked: 0 } };
    try { SP.enabled = localStorage.getItem(KEYLS) !== '0'; } catch (e) {}
    const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const lite = () => { try { return !!performanceMode; } catch (e) { return false; } };

    // ------------------------------------------------------------------ base: cuadro → rejilla completa (espejada) → EPX x2
    const BASE = {};
    function grid(d, rows) {                      // letras → códigos (0 = vacío)
        const w = d.w, h = d.h, hw = w / 2, g = new Uint8Array(w * h);
        for (let y = 0; y < h; y++) { const r = rows[y] || ''; for (let x = 0; x < hw; x++) { const ch = r[x]; const v = (!ch || ch === '.') ? 0 : ch.charCodeAt(0); g[y * w + x] = v; g[y * w + (w - 1 - x)] = v; } }
        return g;
    }
    function epx(g, w, h) {
        const W = w * 2, H = h * 2, o = new Uint8Array(W * H), at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : g[y * w + x];
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const P = at(x, y), A = at(x, y - 1), B = at(x + 1, y), Cc = at(x - 1, y), D = at(x, y + 1);
            let p1 = P, p2 = P, p3 = P, p4 = P;
            if (Cc === A && Cc !== D && A !== B) p1 = A; if (A === B && A !== Cc && B !== D) p2 = B;
            if (D === Cc && D !== B && Cc !== A) p3 = Cc; if (B === D && B !== A && D !== Cc) p4 = D;
            const i = (y * 2) * W + x * 2; o[i] = p1; o[i + 1] = p2; o[i + W] = p3; o[i + W + 1] = p4;
        }
        return o;
    }
    function base(key) {
        if (BASE[key]) return BASE[key]; const d = SHMUP_ART[key], pal = {}; Object.keys(d.p).forEach(k => { pal[k.charCodeAt(0)] = hex2rgb(d.p[k]); });
        const K = 'k'.charCodeAt(0); const W = d.w * 2, H = d.h * 2;
        return BASE[key] = { W, H, pal, K, f: [epx(grid(d, d.a), d.w, d.h), epx(grid(d, d.b), d.w, d.h)] };
    }

    // ------------------------------------------------------------------ un cuadro de la animación
    const mix = (c, t, a) => [c[0] + (t[0] - c[0]) * a, c[1] + (t[1] - c[1]) * a, c[2] + (t[2] - c[2]) * a];
    function frame(key, i, accentHex, white) {
        const B = base(key), W = B.W, H = B.H, src = B.f[(i >> 2) & 1], ph = i / NF * TAU, PAD = 3, OW = W + PAD * 2, OH = H + PAD * 2;
        const big = key[0] === 'b', mid = key[0] === 'm', amp = Math.max(1, W * (big ? 0.028 : 0.04)), cx = (W - 1) / 2;
        // 1) transformación animada (mapeo inverso para no dejar huecos)
        const T = new Uint8Array(OW * OH);
        const bob = Math.round(S(ph) * (big ? 1.8 : 1.1)), breathe = S(ph + 0.8) * (big ? 0.012 : 0.02);
        for (let y = 0; y < H; y++) {
            const hem = clamp((y / H - 0.58) / 0.42, 0, 1), dx = Math.round(hem * hem * S(ph * 2 - y * 0.45) * (big ? 2.4 : 1.5));
            for (let x = 0; x < W; x++) {
                const ax = Math.abs(x - cx) / (W / 2), flap = Math.round(S(ph * 2 + 0.6) * amp * Math.pow(ax, 1.5) * (1 - 0.35 * hem));
                // origen de este pixel (inverso): vamos a escribir desde src hacia T
                const sx = x, sy = y, v = src[sy * W + sx]; if (!v) continue;
                const ty = Math.round(y * (1 + breathe) - H * breathe * 0.5) - flap + bob + PAD, tx = x + dx + PAD;
                if (tx < 0 || ty < 0 || tx >= OW || ty >= OH) continue; T[ty * OW + tx] = v;
                if (breathe > 0 && y > 0 && src[(y - 1) * W + x] && T[(ty - 1) * OW + tx] === 0) T[(ty - 1) * OW + tx] = v;   // rellena huecos al estirar
            }
        }
        // 2) contorno de 1 píxel nuevo + contorno interior de color
        const at = (x, y) => (x < 0 || y < 0 || x >= OW || y >= OH) ? 0 : T[y * OW + x], K = B.K;
        const isEdge = (x, y) => !at(x - 1, y) || !at(x + 1, y) || !at(x, y - 1) || !at(x, y + 1);
        const rgba = new Uint8ClampedArray(OW * OH * 4), col = new Array(OW * OH);
        for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
            const v = T[y * OW + x]; if (!v) continue; let c = B.pal[v] || [255, 0, 255];
            const edge = isEdge(x, y);
            if (v === K) {
                if (edge) c = [24, 20, 37];
                else { let n = null; for (const [ax, ay] of [[0, 1], [1, 0], [-1, 0], [0, -1]]) { const nv = at(x + ax, y + ay); if (nv && nv !== K) { n = B.pal[nv]; break; } } c = n ? mix(n, [20, 14, 34], 0.58) : [24, 20, 37]; }
            } else {
                const u = at(x, y - 1), l = at(x - 1, y), d = at(x, y + 1), r = at(x + 1, y), u2 = at(x, y - 2);
                let sh = 0; if (!u || u === K) sh += 26; else if (!u2 || u2 === K) sh += 9; if (!l || l === K) sh += 14; if (!d || d === K) sh -= 28; if (!r || r === K) sh -= 15;
                if (sh > 0) c = mix(c, [255, 255, 255], sh / 255 * 1.9); else if (sh < 0) c = mix(c, [14, 8, 30], -sh / 255 * 1.9);
            }
            col[y * OW + x] = c;
        }
        // 3) aura de píxeles del color del nivel (pulsa con la animación)
        const acc = hex2rgb(accentHex || '#fee761'), pulse = 0.28 + 0.22 * S(ph + 1.2), glow = !lite();
        for (let y = 0; y < OH; y++) for (let x = 0; x < OW; x++) {
            const j = (y * OW + x) * 4, c = col[y * OW + x];
            if (c) { if (white) { rgba[j] = 255; rgba[j + 1] = 255; rgba[j + 2] = 255; } else { rgba[j] = c[0]; rgba[j + 1] = c[1]; rgba[j + 2] = c[2]; } rgba[j + 3] = 255; continue; }
            if (!glow) continue;
            let n1 = false, n2 = false;
            if (at(x - 1, y) || at(x + 1, y) || at(x, y - 1) || at(x, y + 1)) n1 = true;
            else if (at(x - 2, y) || at(x + 2, y) || at(x, y - 2) || at(x, y + 2) || at(x - 1, y - 1) || at(x + 1, y - 1) || at(x - 1, y + 1) || at(x + 1, y + 1)) n2 = true;
            if (n1 || n2) { rgba[j] = acc[0]; rgba[j + 1] = acc[1]; rgba[j + 2] = acc[2]; rgba[j + 3] = Math.round(255 * (n1 ? pulse : pulse * 0.4) * ((x + y) & 1 || n1 ? 1 : 0.55)); }
        }
        const cv = document.createElement('canvas'); cv.width = OW; cv.height = OH; cv.getContext('2d').putImageData(new ImageData(rgba, OW, OH), 0, 0); SP.stats.baked++;
        return { cv, OW, OH, PAD };
    }
    const CACHE = {};
    function getFrame(key, i, acc, white) { const k = key + '|' + i + '|' + acc + '|' + (white ? 1 : 0); return CACHE[k] || (CACHE[k] = frame(key, i, acc, white)); }

    // ------------------------------------------------------------------ dibujo (mismas poses que el juego original, más marcadas)
    function keyFor(ent, kind) {
        const L = ent.levelIdx;
        if (kind === 'enemy') { const k = 'e' + L + (ent.type - 1); return (ent._v && SHMUP_ART[k + 'v']) ? k + 'v' : (SHMUP_ART[k] ? k : null); }
        const k = (kind === 'mini' ? 'm' : 'b') + L; return SHMUP_ART[k] ? k : null;
    }
    function dot(c, x, y, s, col) { x = Math.round(x / s) * s; y = Math.round(y / s) * s; c.fillStyle = '#181425'; c.fillRect(x - 1, y - 1, s + 2, s + 2); c.fillStyle = col; c.fillRect(x, y, s, s); }
    function draw(ctx, ent, key, o) {
        const d = SHMUP_ART[key], kind = o.kind, ps = Math.max(2, Math.floor(Math.min(ent.width / d.w, (ent.height * 1.04) / d.h))), cs = ps / 2, now = performance.now();
        const clock = o.clock !== undefined ? o.clock : (ent.timer !== undefined ? ent.timer : (ent.t || 0));
        if (ent.hp !== undefined) { if (ent._s8h !== undefined && ent.hp < ent._s8h && ent.hp > 0) ent._s8w = now + 120; ent._s8h = ent.hp; }
        let white = now < (ent._s8w || 0), ox = 0, oy = 0, gather = -1, aura = false;
        const q = o.pose, tick = Math.floor(o.t / 3) & 1;
        if (o.charge) { const p = Math.min(1, o.charge / 18); gather = p; if (o.charge > 7) ox = (tick ? 1 : -1) * ps; if (o.charge > 10 && tick) white = true; if (o.charge > 4) oy = Math.round(p * cs * 2); }
        else if (q) {
            if (q.name === 'charge') { gather = q.p; if (q.p > 0.3) ox = (tick ? 1 : -1) * ps * (q.p > 0.7 ? 2 : 1); if (q.p > 0.55 && tick) white = true; }
            else if (q.name === 'cast') { aura = true; oy = (Math.floor(q.t / 6) % 2) ? -ps : 0; }
        }
        let age = -1; if (ent._fireT !== undefined && o.clock !== undefined) { age = o.clock - ent._fireT; if (age >= 0 && age < 10) { oy += age < 5 ? -ps : 0; if (age < 2) white = true; } }
        const idx = (Math.floor(o.t / TICK[kind]) + (kind === 'enemy' ? (ent.type || 0) * 5 : 0)) % NF;
        const fr = getFrame(key, idx, o.accent || '#fee761', white), w = fr.OW * cs, h = fr.OH * cs;
        const x = Math.round((o.cx - w / 2 + ox) / cs) * cs - o.cx, y = Math.round((o.cy - h / 2 + oy) / cs) * cs - o.cy;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        if (kind === 'enemy' && ent.t !== undefined && ent.t < 8) ctx.globalAlpha *= 0.35 + ent.t / 8 * 0.65;    // aparece de golpe, sin cortes
        ctx.drawImage(fr.cv, x, y, w, h);
        ctx.globalAlpha = 1;
        if (!lite()) {            // chispas de píxel: carga / aura / disparo / centelleo
            const acc = o.accent || '#fee761', R = Math.max(d.w, d.h) * ps * 0.62, dd = Math.max(2, ps);
            if (gather >= 0) for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + (Math.floor(o.t / 4) & 3) * (Math.PI / 16), r = R * (1 - gather * 0.8); dot(ctx, C(a) * r, S(a) * r * 0.85, dd, (i & 1) ? '#ffffff' : acc); }
            if (aura) for (let i = 0; i < 6; i++) { const a = Math.floor(o.t / 5) * (Math.PI / 6) + i * TAU / 6; dot(ctx, C(a) * R * 0.9, S(a) * R * 0.62, dd, (i & 1) ? acc : '#ffffff'); }
            if (age >= 0 && age < 9) { const r = R * (0.55 + age * 0.045); for (let i = 0; i < 8; i++) { const a = i * TAU / 8 + Math.PI / 8; dot(ctx, C(a) * r, S(a) * r, age < 5 ? dd : Math.max(2, dd - 1), (i & 1) ? '#ffffff' : acc); } }
            if (kind !== 'boss' && gather < 0 && !aura) { const ph = (Math.floor(o.t / 7) + (ent.type || 0) * 3) % 24; if (ph < 3) { const a = (ph + (ent.type || 0)) * 2.1 + (ent.phase || 0), r = R * 0.78; dot(ctx, C(a) * r, S(a) * r * 0.8, ph === 1 ? dd : Math.max(2, dd - 1), '#ffffff'); } }
        }
        ctx.restore();
    }
    const _prev = PX.draw;
    PX.draw = function (ctx, ent, fn, o) {
        if (SP.enabled && window.SHMUP_RETRO && window.SHMUP_RETRO.enabled) {
            try { const key = keyFor(ent, o.kind); if (key) return draw(ctx, ent, key, o); } catch (e) { if (!SP._w) { SP._w = 1; console.warn('sprites8bit_plus: usando los sprites originales', e); } }
        }
        return _prev.apply(this, arguments);
    };
    SP.sheet = function (keys) { const cv = document.createElement('canvas'), g = cv.getContext('2d'); const cols = 8, cell = 120; cv.width = cols * cell; cv.height = keys.length * cell; g.fillStyle = '#10081c'; g.fillRect(0, 0, cv.width, cv.height); g.imageSmoothingEnabled = false;
        keys.forEach((k, r) => { for (let c = 0; c < cols; c++) { const f = getFrame(k, c * 2, '#fee761', false), s = Math.min(cell / f.OW, cell / f.OH) | 0 || 1; g.drawImage(f.cv, c * cell + 4, r * cell + 4, f.OW * s, f.OH * s); } }); return cv; };

    // botón en la pausa
    setInterval(() => {
        const po = document.getElementById('pauseOverlay'); if (!po || po.classList.contains('hidden')) return; const q = document.getElementById('btnQuitToMenu'); if (!q) return;
        const label = () => 'SPRITES: ' + (SP.enabled ? 'MEJORADOS' : 'CLÁSICOS'); let b = document.getElementById('btnS8'); 
        if (!b) { b = document.createElement('button'); b.id = 'btnS8'; b.type = 'button'; const r = document.getElementById('btnResume'); if (r) b.className = r.className; b.onclick = () => { SP.enabled = !SP.enabled; try { localStorage.setItem(KEYLS, SP.enabled ? '1' : '0'); } catch (e) {} b.textContent = label(); }; q.parentNode.insertBefore(b, q); }
        if (b.textContent !== label()) b.textContent = label();
    }, 600);
})();
