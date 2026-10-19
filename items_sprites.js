/* ===== items_sprites.js ===== */
// ============================================================================================
//  SPRITES DE POWER-UPS Y PUNTOS  ·  v38
// --------------------------------------------------------------------------------------------
//  Rehace el dibujo de las tarjetas que caen (poderes: escudo, doble, fiesta, etc.) y de los ítems de P / G / A y las gemitas:
//   · Antes: cuadrados planos de colores muy fuertes con un contorno que parpadeaba blanco/negro (se veía duro).
//   · Ahora: orbes de píxeles con sombreado de 3 tonos, borde del mismo color (más oscuro), brillo y la letra con sombra.
//     Los colores se suavizan un poco (mismo tono, menos "neón").
//   · Animación suave (nada de parpadeos): flotan, se balancean apenas, respiran, tienen un halo que late despacio,
//     un brillito que pulsa y 3 destellos que orbitan. Al aparecer "brotan" con un pequeño rebote.
//  La hitbox NO cambia. Se carga justo después de juego.js; si quitas el <script> vuelven los sprites de antes.
// ============================================================================================
(function () {
    'use strict';
    if (typeof Item === 'undefined' || typeof PointItem === 'undefined') return;
    const _iDraw = Item.prototype.draw, _pDraw = PointItem.prototype.draw;
    const TAU = Math.PI * 2, sin = Math.sin, cos = Math.cos;
    const active = () => currentMode !== 'clasico';
    const low = () => (typeof performanceMode !== 'undefined' && performanceMode);

    // ---------------------------------------------------------------- color
    function parse(hex) {
        let h = String(hex || '#888').replace('#', '');
        if (h.length === 3) h = h.split('').map(c => c + c).join('');
        if (!/^[0-9a-f]{6}$/i.test(h)) return [136, 136, 136];
        return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    }
    const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
    const css = c => 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    // suaviza el neón: acerca el color un poco a su gris (mismo tono, menos saturación bruta)
    function soften(rgb) { const g = Math.round(rgb[0] * 0.3 + rgb[1] * 0.59 + rgb[2] * 0.11); return mix(rgb, [g, g, g], 0.14); }
    function ramp(hex) {
        const m = soften(parse(hex));
        return { o: mix(m, [24, 10, 44], 0.78), d: mix(m, [40, 14, 78], 0.42), m, l: mix(m, [255, 255, 255], 0.38), h: mix(m, [255, 255, 255], 0.82), rgb: m };
    }

    // ---------------------------------------------------------------- orbe horneado (11x11 px, se escala con nearest-neighbor)
    const BAYER = [[0, 2], [3, 1]];
    const FONT_ROWS = ch => (typeof RETRO_FONT !== 'undefined' && RETRO_FONT[ch]) ? RETRO_FONT[ch].split('/') : null;
    const ORB = {};
    function orbSprite(hex, ch) {
        const key = hex + '|' + (ch || '');
        if (ORB[key]) return ORB[key];
        const N = 11, c = document.createElement('canvas'); c.width = N; c.height = N; const x = c.getContext('2d'), R = ramp(hex), mid = 5;
        const px = (i, j, col) => { x.fillStyle = css(col); x.fillRect(i, j, 1, 1); };
        for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
            const dx = i - mid, dy = j - mid, r = Math.hypot(dx, dy);
            if (r > 5.35) continue;
            if (r > 4.4) { px(i, j, R.o); continue; }                                  // borde (mismo tono, oscuro)
            const v = Math.hypot(i - 3.3, j - 3.1) / 7.6 + BAYER[j & 1][i & 1] * 0.045;  // luz desde arriba a la izquierda
            let col = v < 0.30 ? R.l : (v < 0.66 ? R.m : R.d);
            if (r > 3.5 && dx + dy > 1.5) col = R.d;                                   // sombra del borde inferior derecho
            px(i, j, col);
        }
        px(2, 2, R.h); px(3, 2, R.h); px(2, 3, R.h);                                   // brillo
        const g = ch ? FONT_ROWS(ch) : null;
        if (g) {                                                                       // letra 3x5 con sombra
            g.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') px(4 + i + 1, 3 + j + 1 > 10 ? 10 : 3 + j + 1, R.o); });
            g.forEach((row, j) => { for (let i = 0; i < 3; i++) if (row[i] === '1') px(4 + i, 3 + j, [255, 255, 255]); });
        }
        return (ORB[key] = { c, R });
    }
    // gemita (diamante 7x9) para los puntos que sueltan los enemigos
    let GEM = null;
    function gemSprite() {
        if (GEM) return GEM;
        const rows = ['...k...', '..klk..', '.klwmk.', 'klwmmdk', 'kmmmmdk', '.kmmdk.', '..kdk..', '...k...'];
        const pal = { k: '#16264a', l: '#a8e8ff', w: '#ffffff', m: '#4cb4ff', d: '#2a74d8' };
        const c = document.createElement('canvas'); c.width = 7; c.height = rows.length; const x = c.getContext('2d');
        rows.forEach((r, j) => { for (let i = 0; i < 7; i++) if (r[i] !== '.') { x.fillStyle = pal[r[i]]; x.fillRect(i, j, 1, 1); } });
        return (GEM = c);
    }

    // ---------------------------------------------------------------- dibujo
    const easeBack = k => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
    function sparkle(cx, cy, s, a, col) {
        ctx.globalAlpha = a; ctx.fillStyle = col;
        ctx.fillRect(Math.round(cx - s), Math.round(cy), s * 2 + 1, 1); ctx.fillRect(Math.round(cx), Math.round(cy - s), 1, s * 2 + 1);
    }
    function drawOrb(it, hex, ch, ps, halo) {
        const o = orbSprite(hex, ch), t = Date.now(), seed = (it.x || 0) * 0.05;
        const age = it._age = (it._age || 0) + 1, pop = age < 16 ? Math.max(0.01, easeBack(age / 16)) : 1;
        const w = 11 * ps, cx = it.x + it.width / 2, cy = it.y + it.height / 2 + sin(t / 360 + seed) * 2.2;
        ctx.save(); ctx.imageSmoothingEnabled = false;
        const rgb = o.R.rgb;
        if (!low()) {                                                                  // halo suave que late despacio
            const pr = halo * (1 + 0.08 * sin(t / 520 + seed)), g = ctx.createRadialGradient(cx, cy, 2, cx, cy, pr);
            g.addColorStop(0, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (0.34 + 0.08 * sin(t / 520 + seed)) + ')'); g.addColorStop(1, 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',0)');
            ctx.fillStyle = g; ctx.fillRect(cx - pr, cy - pr, pr * 2, pr * 2);
        }
        ctx.translate(cx, cy); ctx.rotate(sin(t / 720 + seed) * 0.07); const br = pop * (1 + 0.035 * sin(t / 430 + seed)); ctx.scale(br, br);
        ctx.drawImage(o.c, -Math.round(w / 2), -Math.round(w / 2), w, w);
        ctx.restore();
        // destellos que orbitan despacio + brillito que pulsa (sin parpadeos bruscos)
        ctx.save();
        for (let i = 0; i < 3; i++) {
            const a = t / 1100 + i * TAU / 3 + seed, rr = w * 0.68 + 1.5 * sin(t / 600 + i * 2), al = 0.22 + 0.5 * (0.5 + 0.5 * sin(t / 380 + i * 2.1 + seed));
            sparkle(cx + cos(a) * rr, cy + sin(a) * rr * 0.9, i === 0 ? 2 : 1, al * Math.min(1, pop), '#ffffff');
        }
        sparkle(cx - w * 0.22, cy - w * 0.24, 2, 0.35 + 0.45 * (0.5 + 0.5 * sin(t / 300 + seed)), '#ffffff');
        ctx.restore();
    }

    Item.prototype.draw = function () {
        if (!active() || (window.SHMUP_RETRO && window.SHMUP_RETRO.enabled === false)) return _iDraw.call(this);
        try { drawOrb(this, (this.colors && this.colors[this.type]) || '#888888', (this.letters && this.letters[this.type]) || '', 3, 30); }
        catch (e) { return _iDraw.call(this); }
    };

    PointItem.prototype.draw = function () {
        if (!active() || (window.SHMUP_RETRO && window.SHMUP_RETRO.enabled === false)) return _pDraw.call(this);
        try {
            const t = Date.now();
            if (this.type === 'pixel') {                                               // gemita que gira apenas y brilla
                const g = gemSprite(), seed = this.x * 0.07, cx = Math.round(this.x + this.width / 2), cy = Math.round(this.y + this.height / 2 + sin(t / 260 + seed) * 1.2);
                const sx = 0.82 + 0.18 * Math.abs(cos(t / 520 + seed));                  // "giro" suave (ancho que respira)
                ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(cx, cy); ctx.scale(sx * 1.6, 1.6);
                ctx.drawImage(g, -3.5, -4, 7, 8); ctx.restore();
                ctx.save(); sparkle(cx + 4, cy - 5, 1, 0.3 + 0.6 * (0.5 + 0.5 * sin(t / 240 + seed)), '#ffffff'); ctx.restore();
                return;
            }
            const col = this.type === 'power' ? '#e8483f' : (this.type === 'graze' ? '#3fcf5e' : '#ff9a2e');
            drawOrb(this, col, this.letter || '', 2, 20);
        } catch (e) { return _pDraw.call(this); }
    };
})();
