/* ===== aliados.js ===== */
// ============================================================================================
//  ALIADOS (PARTNERS) REDISEÑADOS  ·  v32
// --------------------------------------------------------------------------------------------
//  · Cada nave tiene SU PROPIO tipo de aliado, con sprite animado (4 cuadros) y contorno:
//      1 Tanque  → mini-tanque blindado con orugas que se mueven
//      2 Sniper  → dron-mira con lente y punto láser parpadeante
//      3 Ligera  → dron-rayo amarillo con llama
//      4 Omega   → núcleo de plasma con púas giratorias
//      5 Reimu   → orbe yin-yang que gira (como las "options" de Touhou)
//      6 Marisa  → estrella mágica giratoria
//      7 Goku    → sus amigos (estilo manga de Toriyama, versión chibi): monje calvo de seis puntos,
//                  guerrero de pelo largo con cicatriz, luchador de tres ojos, muñequito pálido de mejillas rojas,
//                  guerrero verde con antenas y capa, y el niño del gi naranja.
//  · FORMACIÓN ORDENADA: ya no orbitan revueltos. Se colocan en "V" detrás de la nave, alternando izquierda y derecha
//    (1º izq, 2º der, 3º izq...), cada uno con su hueco fijo, y se mueven con suavidad al seguirte.
//  · Dispararán con el mismo ritmo de siempre (la lógica de disparo no cambia), pero ahora en columnas paralelas.
//  Se carga DESPUÉS de juego.js. Ajusta SLOT_X / SLOT_Y / SC para cambiar la formación o el tamaño.
// ============================================================================================
(function () {
    'use strict';
    if (typeof Partner === 'undefined') return;

    const TAU = Math.PI * 2, OUT = '#140a1c';
    const SC = 1.45;                 // escala de dibujo (px de pantalla por px de sprite)
    const SLOT_X = 26, SLOT_X0 = 30; // separación lateral: primera fila a 30 px, luego +26 px por fila
    const SLOT_Y = 18, SLOT_Y0 = 14; // cada fila queda un poco más atrás que la anterior
    const FPS = 7;                   // cuadros de animación por segundo

    // ---------------------------------------------------------------- primitivas
    const c = (g, x, y, r, col) => { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const r = (g, x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
    const p = (g, pts, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); };
    const l = (g, x0, y0, x1, y1, col, w) => { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); };
    const ring = (g, x, y, rad, col, w) => { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke(); };

    // hornea un sprite: dibuja, binariza el alfa (pixel art nítido) y añade contorno de 1 px
    function bake(w, h, fn) {
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const g = cv.getContext('2d', { willReadFrequently: true });
        fn(g, w, h);
        const im = g.getImageData(0, 0, w, h), d = im.data;
        for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;
        g.putImageData(im, 0, 0);
        const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
        const sg = sil.getContext('2d'); sg.drawImage(cv, 0, 0); sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OUT; sg.fillRect(0, 0, w, h);
        const o = document.createElement('canvas'); o.width = w + 2; o.height = h + 2;
        const og = o.getContext('2d');
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx !== 1 || dy !== 1) og.drawImage(sil, dx, dy);
        og.drawImage(cv, 1, 1);
        return o;
    }

    // ---------------------------------------------------------------- diseños (18 x 20 px, 4 cuadros)
    const ACC = ['#ff5a5a', '#ffd23a', '#4ad0ff', '#c07aff', '#ff9a3a', '#7dff7d'];   // detalle de color por hueco

    function tank(g, f, a) {                                    // 1 · TANQUE
        r(g, 2, 13, 14, 5, '#243020'); for (let i = 0; i < 7; i++) if ((i + f) % 2 === 0) r(g, 3 + i * 2, 14, 1, 3, '#7a9a68');
        r(g, 3, 8, 12, 6, '#4a7a3a'); r(g, 3, 8, 12, 1, '#86bc68'); r(g, 4, 11, 10, 1, '#33582a');
        c(g, 9, 8, 3.4, '#6aa850'); r(g, 8, 1, 2, 7, '#94aa84'); r(g, 7, 1, 4, 1, '#d4e4c4'); c(g, 9, 8, 1.4, a);
    }
    function sniper(g, f, a) {                                  // 2 · SNIPER
        c(g, 9, 10, 7.4, '#2a6ab0'); c(g, 9, 10, 5.4, '#08162c'); l(g, 9, 3, 9, 17, '#9fe0ff', 1); l(g, 2, 10, 16, 10, '#9fe0ff', 1);
        c(g, 9, 10, 2.1, f % 2 ? '#ff3030' : '#ff9a9a'); r(g, 0, 9, 3, 2, '#7ab0e0'); r(g, 15, 9, 3, 2, '#7ab0e0'); r(g, 8, 1, 2, 2, a); ring(g, 9, 10, 7.4, '#cfe8ff', 1);
    }
    function ligera(g, f, a) {                                  // 3 · LIGERA
        const fl = f % 2 ? 2 : 0;
        p(g, [9, 11, 12, 17 + fl, 9, 15, 6, 17 + fl], a); p(g, [9, 1, 16, 15, 9, 12, 2, 15], '#ffd23a'); p(g, [9, 4, 12.5, 12.5, 9, 11, 5.5, 12.5], '#fff6b0');
        l(g, 2, 15, 0, 18, '#ffb000', 1.6); l(g, 16, 15, 18, 18, '#ffb000', 1.6); r(g, 8, 6, 2, 3, '#fff');
    }
    function omega(g, f, a) {                                   // 4 · OMEGA
        for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + f * 0.2; p(g, [9 + Math.cos(an - 0.24) * 5, 10 + Math.sin(an - 0.24) * 5, 9 + Math.cos(an) * 8.6, 10 + Math.sin(an) * 8.6, 9 + Math.cos(an + 0.24) * 5, 10 + Math.sin(an + 0.24) * 5], '#c02818'); }
        c(g, 9, 10, 5.2, '#ff5a2a'); c(g, 9, 10, 3.4, '#ffb06a'); c(g, 9, 10, 1.7, '#fff'); c(g, 6.5, 7.5, 1, a);
    }
    function yinyang(g, f, a) {                                 // 5 · REIMU
        g.save(); g.translate(9, 10); g.rotate(f * 0.5);
        c(g, 0, 0, 7.8, '#ffffff'); g.fillStyle = '#e02838'; g.beginPath(); g.arc(0, 0, 7.8, -Math.PI / 2, Math.PI / 2); g.fill();
        c(g, 0, -3.9, 3.9, '#e02838'); c(g, 0, 3.9, 3.9, '#ffffff'); c(g, 0, -3.9, 1.3, '#ffffff'); c(g, 0, 3.9, 1.3, '#e02838'); g.restore();
        ring(g, 9, 10, 7.8, a === ACC[0] ? '#ff8a96' : a, 1);
    }
    function star5(g, f, a) {                                   // 6 · MARISA
        g.save(); g.translate(9, 10); g.rotate(f * TAU / 20);
        const pt = (R, rr) => { const q = []; for (let i = 0; i < 10; i++) { const rad = i % 2 ? rr : R, an = -Math.PI / 2 + i * Math.PI / 5; q.push(Math.cos(an) * rad, Math.sin(an) * rad); } return q; };
        p(g, pt(8.8, 3.8), '#8a3ad8'); p(g, pt(7.4, 3.2), '#ffd83a'); p(g, pt(4.2, 2), '#fff6b0'); g.restore(); c(g, 9, 10, 1.3, a);
    }
    // ---- 7 · amigos de Goku (chibi, inspirados en el manga de Toriyama)
    const SKIN = '#f7c9a0';
    function eyes(g, f, x1, x2, y, h, col) { if (f === 3) { r(g, x1 - 1, y + h - 1, 3, 1, '#2a1a1a'); r(g, x2 - 1, y + h - 1, 3, 1, '#2a1a1a'); } else { r(g, x1, y, 1.6, h, col || '#1a1a22'); r(g, x2, y, 1.6, h, col || '#1a1a22'); } }
    function monje(g, f) {                                      // monje calvo de seis puntos, gi naranja
        r(g, 5, 13, 8, 6, '#f58220'); r(g, 5, 16, 8, 1.6, '#2a4aa0'); r(g, 3, 13, 2, 4, '#f58220'); r(g, 13, 13, 2, 4, '#f58220'); r(g, 3, 17, 2, 2, SKIN); r(g, 13, 17, 2, 2, SKIN);
        c(g, 9, 7.5, 5.6, SKIN); [[7, 3.6], [9, 3.1], [11, 3.6], [8, 5], [10, 5], [9, 6.3]].forEach(q => r(g, q[0] - 0.5, q[1] - 0.5, 1.1, 1.1, '#7a4a2a')); eyes(g, f, 6.6, 10.4, 8, 2.2); r(g, 8.6, 10, 0.9, 1, '#d09878'); r(g, 8, 11.8, 2, 0.8, '#a05a4a');
    }
    function guerrero(g, f) {                                   // guerrero de pelo largo y cicatriz
        p(g, [2.5, 12, 3, 4, 5, 2.6, 7, 0.4, 9, 2.6, 11, 0.4, 13, 2.6, 15, 4, 15.5, 12, 13, 15, 5, 15], '#16161e');
        r(g, 5, 13, 8, 6, '#e86a10'); r(g, 3, 13, 2, 4, '#fff3d0'); r(g, 13, 13, 2, 4, '#fff3d0'); r(g, 5, 16, 8, 1.6, '#2a4aa0');
        c(g, 9, 8, 4.8, SKIN); eyes(g, f, 6.6, 10.4, 7.6, 2.2); l(g, 12, 7, 12.8, 10.2, '#c04040', 1); r(g, 8, 11, 2, 0.8, '#a05a4a');
    }
    function tresojos(g, f) {                                   // luchador calvo de tres ojos, chaleco verde
        r(g, 3, 13, 2, 5, SKIN); r(g, 13, 13, 2, 5, SKIN); r(g, 5, 13, 8, 6, '#2a9a4a'); r(g, 5, 16, 8, 1.6, '#e8c030');
        c(g, 9, 7.2, 5.4, '#f2c28c'); r(g, 7.5, 3.1, 3, 1.5, '#fff'); r(g, 8.6, 3.2, 0.9, 1.3, '#201010'); eyes(g, f, 6.2, 10.6, 6.6, 1.8, '#101018'); l(g, 5.8, 5.6, 8, 6.2, '#101018', 1); l(g, 12.2, 5.6, 10, 6.2, '#101018', 1); r(g, 8, 10.6, 2, 0.8, '#a05a4a');
    }
    function muneco(g, f) {                                     // muñequito pálido de mejillas rojas
        r(g, 5, 14, 8, 5, '#3a3ab8'); r(g, 3, 14, 2, 3, '#6a6ae0'); r(g, 13, 14, 2, 3, '#6a6ae0'); r(g, 5, 16.5, 8, 1.2, '#f0c030');
        c(g, 9, 9.2, 5.2, '#f6efe6'); p(g, [7.5, 4.5, 9, 2, 10.5, 4.5], '#14141c'); c(g, 6, 10.6, 1.4, '#ff6a6a'); c(g, 12, 10.6, 1.4, '#ff6a6a');
        if (f === 3) { r(g, 6.4, 9, 1.6, 0.8, '#222'); r(g, 10, 9, 1.6, 0.8, '#222'); } else { c(g, 7.2, 8.8, 0.9, '#222'); c(g, 10.8, 8.8, 0.9, '#222'); } r(g, 8.4, 11.6, 1.2, 0.8, '#b06a6a');
    }
    function verde(g, f) {                                      // guerrero verde con antenas, turbante y capa
        l(g, 6.4, 3.4, 5.2, 0.2, '#5ab84a', 1.3); l(g, 11.6, 3.4, 12.8, 0.2, '#5ab84a', 1.3);
        r(g, 6, 13, 6, 6, '#6a2a9a'); p(g, [1.5, 11, 16.5, 11, 15, 14.5, 3, 14.5], '#f2f2f2'); r(g, 6, 16.5, 6, 1.4, '#c03070');
        p(g, [3.6, 6.4, 0.6, 4.4, 3.8, 9], '#5ab84a'); p(g, [14.4, 6.4, 17.4, 4.4, 14.2, 9], '#5ab84a');
        c(g, 9, 7.2, 5.3, '#5ab84a'); r(g, 5, 3.4, 8, 1.8, '#f2f2f2'); eyes(g, f, 6.3, 10.5, 6.8, 2, '#2a0a30'); l(g, 5.8, 5.8, 8.3, 6.7, '#14301a', 1); l(g, 12.2, 5.8, 9.7, 6.7, '#14301a', 1); r(g, 7.8, 10.6, 2.4, 0.8, '#2a5a2a');
    }
    function nino(g, f) {                                       // niño de pelo negro y gi naranja
        r(g, 5, 13, 8, 6, '#f58220'); r(g, 7, 13, 4, 2, '#2a4aa0'); r(g, 3, 13, 2, 4, '#f58220'); r(g, 13, 13, 2, 4, '#f58220'); r(g, 3, 17, 2, 2, SKIN); r(g, 13, 17, 2, 2, SKIN);
        c(g, 9, 8, 5.2, SKIN); p(g, [3.2, 8, 3.6, 2.4, 5.6, 4, 7.4, 0.6, 9.4, 3.6, 11.4, 0.6, 12.8, 4, 14.6, 2.4, 14.8, 8, 12.4, 5.6, 5.8, 5.6], '#14141c');
        if (f === 3) { r(g, 5.6, 9.2, 2.4, 0.9, '#222'); r(g, 10, 9.2, 2.4, 0.9, '#222'); } else { r(g, 6, 7.6, 2, 2.6, '#14141c'); r(g, 10, 7.6, 2, 2.6, '#14141c'); r(g, 6.2, 7.8, 0.8, 0.8, '#fff'); r(g, 10.2, 7.8, 0.8, 0.8, '#fff'); } r(g, 8.2, 11.2, 1.6, 0.8, '#b06a5a');
    }

    // ---------------------------------------------------------------- temas por nave
    const THEME = {
        1: { name: 'Mini-tanques', col: '#7ad060', glow: '#9aff80', fn: tank, same: true },
        2: { name: 'Drones mira', col: '#4ad0ff', glow: '#7ae0ff', fn: sniper, same: true },
        3: { name: 'Drones rayo', col: '#ffd23a', glow: '#ffe66a', fn: ligera, same: true },
        4: { name: 'Núcleos plasma', col: '#ff5a2a', glow: '#ff8a4a', fn: omega, same: true },
        5: { name: 'Orbes yin-yang', col: '#ff4a5a', glow: '#ff8a96', fn: yinyang, same: true },
        6: { name: 'Estrellas mágicas', col: '#ffd83a', glow: '#c07aff', fn: star5, same: true },
        7: { name: 'Amigos de Goku', col: '#ffb347', glow: '#ffe14a', fns: [monje, guerrero, tresojos, muneco, verde, nino],
            cols: ['#ffb347', '#ff9a3a', '#7dff7d', '#ffffff', '#b06aff', '#ffe14a'],
            tag: ['Monje', 'Guerrero', 'Tres ojos', 'Muñeco', 'Namek', 'Niño'] }
    };
    const FR = {};                                              // cache de sprites: FR[tipo][hueco] = [cuadros]
    function frames(type, slot) {
        type = THEME[type] ? type : 1; slot = ((slot % 6) + 6) % 6;
        const K = type + '_' + slot; if (FR[K]) return FR[K];
        const T = THEME[type], fn = T.fns ? T.fns[slot] : T.fn, out = [];
        for (let f = 0; f < 4; f++) out.push(bake(18, 20, (g) => fn(g, f, ACC[slot])));
        return (FR[K] = out);
    }
    const GL = {};
    function glow(col, rad) {
        const k = col + rad; if (GL[k]) return GL[k];
        const cv = document.createElement('canvas'); cv.width = cv.height = rad * 2;
        const g = cv.getContext('2d'), gr = g.createRadialGradient(rad, rad, 0, rad, rad, rad);
        gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, rad * 2, rad * 2);
        return (GL[k] = cv);
    }
    const shipType = () => { try { return (player && player.type) || selectedShipType || 1; } catch (e) { return 1; } };
    const theme = (type) => THEME[type] || THEME[1];
    const colorOf = (type, slot) => { const T = theme(type); return T.cols ? T.cols[slot % 6] : T.col; };

    // dibuja un aliado en (x, y) con el tipo/hueco dados. t = ms (animación)
    function drawAt(x, y, type, slot, t, sc, opts) {
        opts = opts || {}; sc = sc || SC;
        const T = theme(type), fr = frames(type, slot), n = Math.floor(t / (1000 / FPS) + slot) % 4, cv = fr[n];
        const w = Math.round(cv.width * sc), h = Math.round(cv.height * sc);
        const gcol = T.cols ? T.cols[slot % 6] : T.glow;
        if (!opts.noGlow) {
            const gr = Math.round(w * 0.95), fl = 0.28 + 0.1 * Math.sin(t * 0.01 + slot);
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (opts.alpha === undefined ? 1 : opts.alpha) * fl;
            ctx.drawImage(glow(gcol, gr), x - gr, y + (type === 7 ? h * 0.28 : 0) - gr); ctx.restore();
        }
        ctx.save(); ctx.imageSmoothingEnabled = false; if (opts.alpha !== undefined) ctx.globalAlpha = opts.alpha;
        ctx.drawImage(cv, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
        ctx.restore();
    }

    // ---------------------------------------------------------------- formación en "V"
    function slotOffset(i) {
        const row = Math.floor(i / 2), side = (i % 2) ? 1 : -1;
        return { dx: side * (SLOT_X0 + SLOT_X * row), dy: SLOT_Y0 + SLOT_Y * row };
    }
    Partner.prototype.update = function () {
        const type = shipType(), T = theme(type), cx = player.x + player.width / 2, cy = player.y + player.height / 2, o = slotOffset(this.index);
        let tx = cx + o.dx, ty = cy + o.dy;
        const W = (typeof playAreaW !== 'undefined') ? playAreaW : 600, H = (typeof playAreaH !== 'undefined') ? playAreaH : 600;
        tx = Math.max(14, Math.min(W - 14, tx)); ty = Math.min(H - 12, ty);
        if (this._f === undefined) { this.x = cx; this.y = cy; this._f = 1; }   // al aparecer, salen desde la nave y se acomodan
        this.x += (tx - this.x) * 0.2; this.y += (ty - this.y) * 0.2;
        this.color = T.cols ? T.cols[this.index % 6] : T.col;                   // los disparos del aliado toman el color de su diseño
    };
    Partner.prototype.draw = function () {
        const t = performance.now(), bob = Math.sin(t * 0.005 + this.index * 1.3) * 1.8;
        drawAt(this.x, this.y + bob, shipType(), this.index, t, SC);
    };

    window.Aliados = { theme, frames, drawAt, slotOffset, colorOf, shipType, THEME, SC };
})();
