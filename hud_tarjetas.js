/* ===== hud_tarjetas.js ===== */
// ============================================================================================
//  TARJETAS ANIMADAS DEL HUD  ·  v32
// --------------------------------------------------------------------------------------------
//  Sustituyen a las filas planas "Poder / Roce / Aliados" del panel lateral por cuatro tarjetas con vida:
//    · NIVEL DE ATAQUE  → cristal giratorio del color del nivel, barra segmentada y destellos al subir
//    · POWER            → orbe "P" con arcos eléctricos y barra con brillo que corre
//    · GRAZE            → nave con una bala que la bordea; pulsa en dorado cuando la bomba está lista
//    · ALIADOS          → sprites REALES de tus partners (los de tu nave), animados; el nuevo aparece con destello
//  Iconos de 40 px (antes ~11 px), borde que respira, reflejo que barre la tarjeta y números que "saltan" al cambiar.
//  juego.js llama a HudCards.side(...) desde HUD.drawSide(); si este archivo no carga, se usa el HUD de siempre.
// ============================================================================================
(function () {
    'use strict';
    const TAU = Math.PI * 2, OUT = '#140a1c';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------------------------------------------------------------- sprites de los iconos
    function bake(w, h, fn) {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const g = cv.getContext('2d', { willReadFrequently: true }); fn(g, w, h);
        const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0; g.putImageData(im, 0, 0);
        const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
        const sg = sil.getContext('2d'); sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OUT; sg.fillRect(0, 0, w, h);
        const o = document.createElement('canvas'); o.width = w + 2; o.height = h + 2; const og = o.getContext('2d');
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx !== 1 || dy !== 1) og.drawImage(sil, dx, dy);
        og.drawImage(cv, 1, 1); return o;
    }
    const c = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const p = (g, pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const l = (g, x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const lighten = (hex) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.min(255, v + 90); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); };
    const toHex = (col) => /^#[0-9a-f]{6}$/i.test(col) ? col : ({ '#0ff': '#00ffff', '#f0f': '#ff00ff', '#fa0': '#ffaa00', '#7cf': '#77ccff', '#ffe94a': '#ffe94a' })[col] || '#ffe94a';

    const CACHE = {};
    // cristal de ataque (rota "en 3D" estrechando el ancho)
    function atkFrames(col) {
        col = toHex(col); const K = 'atk' + col; if (CACHE[K]) return CACHE[K];
        const out = [];
        for (let f = 0; f < 8; f++) out.push(bake(20, 20, (g) => {
            const ang = f / 8 * TAU, sx = Math.abs(Math.cos(ang)) * 0.75 + 0.25, hl = lighten(col);
            p(g, [10, 1, 10 + 7 * sx, 10, 10, 19, 10 - 7 * sx, 10], col); p(g, [10, 1, 10 + 7 * sx, 10, 10, 10], hl); p(g, [10, 4, 10 + 3 * sx, 10, 10, 10], '#ffffff');
            const s = f % 4; if (s < 2) { l(g, 2, 3, 6, 3, '#fff', 1); l(g, 4, 1, 4, 5, '#fff', 1); } else { l(g, 15, 15, 19, 15, '#fff', 1); l(g, 17, 13, 17, 17, '#fff', 1); }
        }));
        return (CACHE[K] = out);
    }
    function powerFrames() {
        if (CACHE.pw) return CACHE.pw;
        const out = [];
        for (let f = 0; f < 8; f++) out.push(bake(20, 20, (g) => {
            c(g, 10, 10, 8, '#c81e1e'); c(g, 10, 10, 6.6, '#ee3a3a'); c(g, 7.2, 7, 2, '#ffb0b0');
            g.fillStyle = '#fff'; g.fillRect(8, 6, 2, 8); g.fillRect(8, 6, 5, 2); g.fillRect(11, 6, 2, 5); g.fillRect(8, 9, 5, 2);       // "P"
            const z = f % 4; g.strokeStyle = '#ffee66'; g.lineWidth = 1.2; g.beginPath();
            if (z === 0) { g.moveTo(1, 5); g.lineTo(4, 7); g.lineTo(2, 9); g.lineTo(5, 11); } else if (z === 1) { g.moveTo(18, 4); g.lineTo(15, 6); g.lineTo(17, 8); g.lineTo(14, 10); }
            else if (z === 2) { g.moveTo(2, 15); g.lineTo(5, 14); g.lineTo(4, 17); g.lineTo(7, 17); } else { g.moveTo(17, 14); g.lineTo(14, 15); g.lineTo(15, 18); g.lineTo(12, 18); }
            g.stroke();
        }));
        return (CACHE.pw = out);
    }
    function grazeFrames() {
        if (CACHE.gz) return CACHE.gz;
        const out = [];
        for (let f = 0; f < 8; f++) out.push(bake(22, 22, (g) => {
            p(g, [11, 4, 15, 16, 11, 13.5, 7, 16], '#4adf6a'); p(g, [11, 7, 13, 13.5, 11, 12.4, 9, 13.5], '#c8ffd4'); c(g, 11, 11, 0.01, '#fff');
            const a = f / 8 * TAU, bx = 11 + Math.cos(a) * 8.6, by = 11 + Math.sin(a) * 7.6;
            for (let k = 3; k >= 1; k--) { const aa = a - k * 0.42; c(g, 11 + Math.cos(aa) * 8.6, 11 + Math.sin(aa) * 7.6, 1.1, 'rgba(255,120,200,0.9)'); }
            c(g, bx, by, 2.4, '#ff5aa8'); c(g, bx, by, 1, '#fff');
            if (f % 8 === 4 || f % 8 === 5) { l(g, 11, 2, 11, 5, '#fff', 1); l(g, 9.5, 3.5, 12.5, 3.5, '#fff', 1); }
        }));
        return (CACHE.gz = out);
    }

    // ---------------------------------------------------------------- estado de animación
    const S = { last: {}, pop: {}, sweep: 0 };
    function pop(k, v) { if (S.last[k] !== v) { S.pop[k] = 1; S.last[k] = v; } S.pop[k] = Math.max(0, (S.pop[k] || 0) - 0.05); return S.pop[k]; }

    // ---------------------------------------------------------------- tarjeta base
    function card(o, x, y, w, h, col, boost, key) {
        const ctx2 = ctx, t = o.t;
        ctx2.save();
        ctx2.fillStyle = 'rgba(14,1,5,0.84)'; ctx2.fillRect(x, y, w, h);
        const gr = ctx2.createLinearGradient(x, y, x, y + h); gr.addColorStop(0, 'rgba(255,255,255,0.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx2.fillStyle = gr; ctx2.fillRect(x, y, w, h);
        ctx2.fillStyle = col; ctx2.fillRect(x, y, 3, h);
        // reflejo que barre la tarjeta (cada tarjeta con su fase)
        ctx2.save(); ctx2.beginPath(); ctx2.rect(x, y, w, h); ctx2.clip();
        const bx = x + ((t / 22 + key * 60) % (w + 90)) - 45; ctx2.globalAlpha = 0.11 + boost * 0.12; ctx2.fillStyle = '#fff';
        ctx2.beginPath(); ctx2.moveTo(bx, y); ctx2.lineTo(bx + 16, y); ctx2.lineTo(bx - 4, y + h); ctx2.lineTo(bx - 20, y + h); ctx2.fill(); ctx2.restore();
        ctx2.globalAlpha = clamp(0.5 + 0.22 * Math.sin(t * 0.004 + key) + boost * 0.4, 0, 1); ctx2.strokeStyle = col; ctx2.lineWidth = 1 + (boost > 0.3 ? 1 : 0);
        ctx2.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx2.restore();
    }
    // icono dentro de un marco, con rebote suave y brillo
    function icon(o, cv, cx, cy, size, col, key, extraBob) {
        const t = o.t, bob = Math.sin(t * 0.005 + key * 1.7) * 1.6 + (extraBob || 0), sc = size / cv.height;
        ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.38)'; ctx.fillRect(cx - size / 2 - 3, cy - size / 2 - 3, size + 6, size + 6);
        ctx.strokeStyle = 'rgba(255,215,170,0.28)'; ctx.lineWidth = 1; ctx.strokeRect(cx - size / 2 - 2.5, cy - size / 2 - 2.5, size + 5, size + 5);
        ctx.globalCompositeOperation = 'lighter'; const r = size * 0.9, g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = 0.32 + 0.12 * Math.sin(t * 0.007 + key); ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
        const w = Math.round(cv.width * sc), h = Math.round(cv.height * sc); ctx.drawImage(cv, Math.round(cx - w / 2), Math.round(cy - h / 2 + bob), w, h);
        ctx.restore();
    }
    // barra con brillo que corre
    function shimmerBar(o, x, y, w, h, ratio, c1, c2, seg, key) {
        o.tbar(x, y, w, h, ratio, c1, c2, seg);
        const fw = Math.round(w * clamp(ratio, 0, 1)); if (fw < 3) return;
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, fw, h); ctx.clip();
        const bx = x + ((o.t / 9 + key * 40) % (fw + 40)) - 20, g = ctx.createLinearGradient(bx - 14, 0, bx + 14, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 14, y, 28, h); ctx.restore();
    }
    function value(o, txt, x, y, col, size, k, glow) {
        const pp = pop(k, txt), s = 1 + pp * 0.3;
        ctx.save(); ctx.translate(x, y); ctx.scale(s, s); o.tt(String(txt), 0, 0, pp > 0.2 ? '#fff' : col, size, 'right', glow ? { glow } : null); ctx.restore();
    }

    // ---------------------------------------------------------------- las cuatro tarjetas
    function side(o) {
        const P = o.P, W = o.IW, v = o.v, t = o.t, fi = Math.floor(t / 110) % 8, CH = 46, G = 5, tx = P + 54, tw = W - 54 - 8;
        let y = o.y;

        // ---- 1 · NIVEL DE ATAQUE
        const tc = o.tier(v.pl), maxed = v.pl >= v.plMax;
        card(o, P, y, W, CH, tc, o.st.lvFx, 1);
        icon(o, atkFrames(tc)[fi], P + 28, y + CH / 2, 34, tc, 1, o.st.lvFx * -3);
        o.tt('ATAQUE', tx, y + 14, '#ffd0b8', 9, 'left');
        value(o, maxed ? 'MAX' : 'Lv.' + v.pl + '/' + v.plMax, P + W - 8, y + 15, maxed ? (Math.floor(t / 160) % 2 ? '#fff' : '#9ee8ff') : tc, 11, 'atk', tc);
        shimmerBar(o, tx, y + 21, tw, 9, v.pl / v.plMax, '#6b3cff', '#d06bff', v.plMax, 1);
        o.tbar(tx, y + 34, tw, 4, maxed ? 1 : v.kills, '#b86a00', '#ffb040', 0);
        if (o.st.lvFx > 0) {
            const k = 1 - o.st.lvFx; ctx.save(); ctx.globalAlpha = Math.min(1, o.st.lvFx * 1.6);
            o.tt('¡NIVEL ARRIBA!', P + W / 2 + 20, y - 3 - k * 10, '#fff', 10, 'center', { glow: tc });
            o.st.lvSparks.forEach(sp => { ctx.fillStyle = tc; ctx.globalAlpha = 1 - sp.t / 40; ctx.fillRect(P + 28 + Math.cos(sp.a) * sp.t * sp.v * 1.3, y + CH / 2 + Math.sin(sp.a) * sp.t * sp.v * 0.9, 3, 3); });
            ctx.restore();
        }
        y += CH + G;

        // ---- 2 · POWER
        card(o, P, y, W, CH, '#ff4a4a', 0, 2);
        icon(o, powerFrames()[fi], P + 28, y + CH / 2, 34, '#ff4a4a', 2);
        o.tt('POWER', tx, y + 14, '#ffb0b0', 9, 'left');
        value(o, Math.floor(v.pp) + '/150', P + W - 8, y + 15, '#ffd0d0', 10, 'pw');
        shimmerBar(o, tx, y + 21, tw, 9, v.pp / 150, '#d01818', '#ff8a6a', 10, 2);
        o.tt('+ POWER = + DAÑO', tx, y + 41, 'rgba(255,200,190,0.7)', 7, 'left');
        y += CH + G;

        // ---- 3 · GRAZE (la bomba se carga rozando balas)
        const rdy = v.bombReady, gcol = rdy ? '#ffd02a' : '#3fe06a';
        card(o, P, y, W, CH, gcol, rdy ? 0.5 + 0.5 * Math.sin(t * 0.012) : 0, 3);
        icon(o, grazeFrames()[fi], P + 28, y + CH / 2, 34, gcol, 3);
        o.tt('GRAZE', tx, y + 14, rdy ? '#fff27a' : '#a8ffbc', 9, 'left');
        value(o, v.graze, P + W - 8, y + 15, '#e8fff0', 11, 'gz');
        shimmerBar(o, tx, y + 21, tw, 9, v.bombFrac, rdy ? '#ffb000' : '#2fb34f', rdy ? '#fff27a' : '#8cff9d', 12, 3);
        o.tt(rdy ? 'BOMBA LISTA  [Z]' : 'BOMBA x' + v.bombStock, tx, y + 41, rdy ? (Math.floor(t / 130) % 2 ? '#ffee66' : '#fff') : 'rgba(200,255,210,0.75)', 7, 'left', rdy ? { glow: '#fa0' } : null);
        y += CH + G;

        // ---- 4 · ALIADOS (sprites reales de tus partners)
        const type = (window.Aliados && Aliados.shipType()) || 1, PH = 56, n = v.partners, fx = o.st.partnerFx;
        card(o, P, y, W, PH, '#3fc8ff', fx, 4);
        o.tt('ALIADOS', P + 10, y + 13, '#9fe8ff', 9, 'left');
        value(o, n + '/6', P + W - 8, y + 14, n >= 6 ? '#ffe66a' : '#d8f6ff', 11, 'pa', '#3fc8ff');
        if (window.Aliados) {
            const step = (W - 20) / 6;
            for (let i = 0; i < 6; i++) {
                const on = i < n, cx = P + 10 + step * i + step / 2, cy = y + 31, isNew = on && i === n - 1 && fx > 0, sc = 1.18 * (isNew ? 1 + fx * 0.6 : 1);
                if (isNew) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fx; ctx.fillStyle = '#9fe8ff'; ctx.beginPath(); ctx.arc(cx, cy, 6 + (1 - fx) * 16, 0, TAU); ctx.fill(); ctx.restore(); }
                Aliados.drawAt(cx, cy + (on ? Math.sin(t * 0.005 + i * 1.3) * 1.5 : 0), type, i, t, sc, { alpha: on ? 1 : 0.16, noGlow: !on });
                if (!on) { ctx.save(); ctx.strokeStyle = 'rgba(160,220,255,0.35)'; ctx.setLineDash([2, 3]); ctx.strokeRect(cx - 9, cy - 11, 18, 22); ctx.restore(); }
            }
        }
        shimmerBar(o, P + 8, y + PH - 9, W - 16, 4, n >= 6 ? 1 : v.partnerRatio, '#1a8cc0', '#7fe0ff', 0, 4);
        y += PH + G;
        return y;
    }

    // ---------------------------------------------------------------- versión para el HUD inferior (móvil vertical): 4 tarjetas en fila
    function bottom(o) {
        const P = o.P, IW = o.IW, v = o.v, t = o.t, fi = Math.floor(t / 110) % 8, G = 4, w = (IW - G * 3) / 4, h = 58, y = o.y;
        const tc = o.tier(v.pl), maxed = v.pl >= v.plMax, rdy = v.bombReady, gcol = rdy ? '#ffd02a' : '#3fe06a';
        const type = (window.Aliados && Aliados.shipType()) || 1, n = v.partners, fx = o.st.partnerFx;
        const specs = [
            { col: tc, boost: o.st.lvFx, k: 1, cv: atkFrames(tc)[fi], label: 'ATAQUE', val: maxed ? 'MAX' : 'Lv.' + v.pl, vc: tc, ratio: v.pl / v.plMax, c1: '#6b3cff', c2: '#d06bff', seg: v.plMax, sub: maxed ? '' : Math.floor(v.kills * 100) + '%', key: 'atk', ib: o.st.lvFx * -3 },
            { col: '#ff4a4a', boost: 0, k: 2, cv: powerFrames()[fi], label: 'POWER', val: Math.floor(v.pp), vc: '#ffd0d0', ratio: v.pp / 150, c1: '#d01818', c2: '#ff8a6a', seg: 10, sub: '/150', key: 'pw' },
            { col: gcol, boost: rdy ? 0.5 + 0.5 * Math.sin(t * 0.012) : 0, k: 3, cv: grazeFrames()[fi], label: 'GRAZE', val: v.graze, vc: '#e8fff0', ratio: v.bombFrac, c1: rdy ? '#ffb000' : '#2fb34f', c2: rdy ? '#fff27a' : '#8cff9d', seg: 12, sub: rdy ? 'BOMBA [Z]' : 'BOMBA x' + v.bombStock, key: 'gz' },
            { col: '#3fc8ff', boost: fx, k: 4, cv: window.Aliados ? Aliados.frames(type, Math.max(0, Math.min(5, n - 1)))[fi % 4] : atkFrames('#3fc8ff')[fi], label: 'ALIADOS', val: n + '/6', vc: n >= 6 ? '#ffe66a' : '#d8f6ff', ratio: n >= 6 ? 1 : v.partnerRatio, c1: '#1a8cc0', c2: '#7fe0ff', seg: 0, sub: '', key: 'pa', ib: fx * -3 }
        ];
        specs.forEach((c2, i) => {
            const x = P + i * (w + G);
            card(o, x, y, w, h, c2.col, c2.boost, c2.k);
            icon(o, c2.cv, x + 17, y + 20, 26, c2.col, c2.k, c2.ib);
            o.txt(c2.label, x + 34, y + 11, 'rgba(255,255,255,0.78)', 5, 'left');
            const pp = pop(c2.key + 'b', c2.val), sc = 1 + pp * 0.3;
            ctx.save(); ctx.translate(x + w - 4, y + 26); ctx.scale(sc, sc); o.txt(String(c2.val), 0, 0, pp > 0.2 ? '#fff' : c2.vc, 9, 'right', pp > 0.2 ? c2.col : null); ctx.restore();
            o.bar(x + 4, y + 38, w - 8, 6, c2.ratio, c2.c1, { glow: 3, seg: c2.seg || 0 });
            const fw = Math.round((w - 8) * clamp(c2.ratio, 0, 1));
            if (fw > 3) { ctx.save(); ctx.beginPath(); ctx.rect(x + 4, y + 38, fw, 6); ctx.clip(); const bx = x + 4 + ((t / 9 + c2.k * 40) % (fw + 30)) - 15, g = ctx.createLinearGradient(bx - 10, 0, bx + 10, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(bx - 10, y + 38, 20, 6); ctx.restore(); }
            if (i === 3 && window.Aliados) {                   // fila de mini-aliados bajo la barra
                const st2 = (w - 8) / 6;
                for (let j = 0; j < 6; j++) { const on = j < n; Aliados.drawAt(x + 4 + st2 * j + st2 / 2, y + 51, type, j, t, 0.5, { alpha: on ? 1 : 0.18, noGlow: true }); }
            } else if (c2.sub) o.txt(c2.sub, x + w / 2, y + 53, rdy && i === 2 ? (Math.floor(t / 130) % 2 ? '#ffee66' : '#fff') : 'rgba(255,255,255,0.6)', 5, 'center');
        });
        if (o.st.lvFx > 0.3) { ctx.save(); ctx.globalAlpha = o.st.lvFx; o.txt('¡NIVEL ARRIBA!', P + IW / 2, y - 2, '#fff', 7, 'center', tc); ctx.restore(); }
        return y + h + 4;
    }

    window.HudCards = { side, bottom };
})();
