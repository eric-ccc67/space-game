// ==========================================================================================
//  choque.js  ·  CHOQUE DE PODERES (estilo Dragon Ball Z: Budokai Tenkaichi 3) + DROPS DE JEFE
// ------------------------------------------------------------------------------------------
//  1) CHOQUE DE PODERES: cuando la vida de un JEFE FINAL (los 7 de los niveles + el INVASOR) llega a 0,
//     el jefe dice que no se rinde y el juego se congela: la nave y el jefe disparan sus rayos de frente. Hay que
//     MARTILLEAR el botón de DISPARO (Espacio / botón A / clic) para empujar el choque hacia el
//     jefe. Si lo logras, tu rayo lo arrasa y cae. Si no, te golpea, el jefe se recupera un poco
//     y tendrás una revancha cuando vuelvas a vaciarle la barra.
//     Cada jefe tiene su propio rayo, colores, decorado de fondo, partículas y frases.
//  2) DROPS: mientras un jefe final está activo, cada ~3.5 s tira un dado con 47.6 % de soltar
//     un power-up (con preferencia por los que ayudan a matarlo más rápido).
//  Se carga DESPUÉS de invasor.js. Engancha Extras.takeover / busy / afterFrame / onRunStart.
//  Ajustes rápidos: TRIGGER, PUSH, DRIFT, TIME_LIMIT, DROP_CHANCE, DROP_EVERY (abajo).
//  Consola:  Choque.dev.start()  (fuerza el choque contra el jefe actual)
// ==========================================================================================
(function () {
    'use strict';
    if (typeof Extras === 'undefined' || typeof defeatBoss !== 'function') return;

    // ---------------------------------------------------------------------- ajustes
    const MAX_CLASHES = 2;                  // choque final + 1 revancha si lo pierdes
    const TIME_LIMIT = 840;                 // cuadros (~14 s) que dura el pulso como máximo
    const PUSH = 0.034;                     // cuánto empuja cada toque de disparo (0..1 de la distancia)
    const DRIFT = { facil: 0.070, medio: 0.100, dificil: 0.105, lunatico: 0.115 };   // empuje del jefe (por segundo)
const MOBILE_EASE = 0.8;                // en teléfono el jefe empuja 20 % menos (tocar rápido en pantalla es más difícil)
const HOLD_PUSH = 0.0010;               // mantener pulsado DISPARO (o AUTO) también empuja un poco, por cuadro
const SUPER_RATE = 5;                   // toques/s para el bonus ¡SUPER! (x1.35)
    const DROP_CHANCE = 0.476;              // 47.6 % de soltar power-up...
    const DROP_EVERY = 210;                 // ...cada vez que pasan estos cuadros (~3.5 s) con el jefe activo
    const DROP_MAX_ON_SCREEN = 3;
    const WIN_BONUS = 3000;

    // ---------------------------------------------------------------------- utilidades
    const TAU = Math.PI * 2;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const rr = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const sstep = (a, b, t) => { const k = clamp((t - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
    const eOut = t => 1 - Math.pow(1 - t, 3);
    const lite = () => typeof performanceMode !== 'undefined' && performanceMode;
    const W = () => playAreaW, H = () => playAreaH;
    const PX = '"Press Start 2P", monospace';
    const rgba = (h, a) => { const n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; };
    const isMobile = () => document.body.classList.contains('mobile-playing');
    const hash = (a, b, c) => (((a * 73856093) ^ (b * 19349663) ^ (c * 83492791)) >>> 0) % 7;
    const steps = (yA, yB, st) => { const a = [], d = Math.sign(yB - yA) || 1; for (let y = yA; (yB - y) * d > 0; y += st * d) a.push(y); return a; };
    const hwAt = (yA, yB, y, w) => lerp(0.5, 1, clamp((y - yA) / ((yB - yA) || 1), 0, 1)) * w / 2;

    function tone(f0, f1, dur, type, vol) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
            o.type = type || 'square'; o.connect(g); g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
            g.gain.setValueAtTime(vol || 0.05, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
            o.start(); o.stop(t + dur);
        } catch (e) {}
    }

    // ---------------------------------------------------------------------- un choque distinto por jefe
    const HERO = { c1: '#2a9bff', c2: '#9ef6ff', c3: '#ffffff' };
    const GLYPHS = 'ΩΨΣΔΞΦΛΠ✦☽';
    const CFG = [
        { style: 'flame', c1: '#ff5fa2', c2: '#ffb347', c3: '#ffd6e8', atk: 'KITSUNE-BI · LLAMA DE NUEVE COLAS', hero: 'RAYO ESTELAR',
          taunt: '¡NO ME RENDIRÉ! ¡LAS NUEVE COLAS ARDERÁN!', reply: '¡NO RETROCEDERÉ!', win: '¡LAS NUEVE COLAS SE APAGAN!' },
        { style: 'ice', c1: '#79b8ff', c2: '#dff4ff', c3: '#ffffff', atk: 'ALIENTO DE VENTISCA', hero: 'LANZA POLAR',
          taunt: '¡UN REY NO CAE! ¡CONGELARÉ TU FUTURO!', reply: '¡MI FUEGO NO SE APAGA!', win: '¡EL REY YETI SE HACE AÑICOS!' },
        { style: 'water', c1: '#1fb8a0', c2: '#9ff7e8', c3: '#e8fffb', atk: 'TORRENTE ABISAL', hero: 'ONDA DE MAREA',
          taunt: '¡EL ABISMO NO SE RINDE! ¡TE ARRASTRARÉ!', reply: '¡VOLVERÉ A LA SUPERFICIE!', win: '¡EL KRAKEN VUELVE AL ABISMO!' },
        { style: 'web', c1: '#5fd84a', c2: '#d6ffb0', c3: '#ffffff', atk: 'HILO VENENOSO', hero: 'DESTELLO SILVESTRE',
          taunt: '¡AÚN NO! ¡MI RED NO SE ROMPE!', reply: '¡CORTARÉ TU TELARAÑA!', win: '¡LA RED SE ROMPE EN MIL HILOS!' },
        { style: 'tome', c1: '#c9a24a', c2: '#ffe9a8', c3: '#fff6d8', atk: 'GRIMORIO PROHIBIDO', hero: 'TINTA LUMINOSA',
          taunt: '¡MI ÚLTIMA PÁGINA AÚN NO SE ESCRIBE!', reply: '¡YO ESCRIBO MI FINAL!', win: '¡EL LIBRO SE CIERRA PARA SIEMPRE!' },
        { style: 'gears', c1: '#ff9a2c', c2: '#ffe08a', c3: '#fff3c4', atk: 'CAÑÓN DEL TIEMPO', hero: 'PULSO CRONO',
          taunt: '¡EL TIEMPO NO SE DETIENE! ¡NO CAERÉ!', reply: '¡EL TIEMPO ES MÍO!', win: '¡EL RELOJ SE DETIENE!' },
        { style: 'blood', c1: '#c4122b', c2: '#ff4a66', c3: '#ffd0d6', atk: 'MIRADA CARMESÍ', hero: 'LUZ DE LUNA NUEVA',
          taunt: '¡NO... CERRARÉ... MI OJO!', reply: '¡CIERRA TÚ LOS OJOS!', win: '¡EL OJO SE APAGA... Y LA LUNA SANGRA!' },
        { style: 'pixel', c1: '#2dff6a', c2: '#eaffee', c3: '#ffffff', atk: 'RAYO 8-BIT · GAME OVER', hero: 'HAZ ARCADE',
          taunt: '¡CONTINUAR! ¡INSERTA MONEDA... NO ME RINDO!', reply: '¡YO TENGO VIDAS EXTRA!', win: '¡GAME OVER... PARA EL INVASOR!' }
    ];

    // ---------------------------------------------------------------------- estado
    let ST = null;          // choque en curso
    let post = 0;           // fogonazo blanco al volver al juego
    let postCol = '#fff';
    let dropT = 0;
    const parts = [];

    // ---------------------------------------------------------------------- partículas
    function emit(o) { if (parts.length < (lite() ? 90 : 260)) parts.push(Object.assign({ x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 0.99, life: 40, max: 40, size: 3, rot: 0, vr: 0, col: '#fff', kind: 'dot', ch: '*' }, o, { max: o.life || 40 })); }
    function stepParts() {
        for (let i = parts.length - 1; i >= 0; i--) {
            const p = parts[i]; p.vx *= p.drag; p.vy *= p.drag; p.vy += p.g; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
            if (--p.life <= 0) parts.splice(i, 1);
        }
    }
    function drawParts() {
        ctx.save();
        for (const p of parts) {
            const a = clamp(p.life / (p.max * 0.5), 0, 1); if (a <= 0.02) continue;
            const s = p.size; ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.strokeStyle = p.col;
            switch (p.kind) {
                case 'spark': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2); ctx.stroke(); break;
                case 'petal': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, s, s * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); break;
                case 'shard': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(0, -s * 1.4); ctx.lineTo(s * 0.6, s); ctx.lineTo(-s * 0.6, s); ctx.closePath(); ctx.fill(); ctx.restore(); break;
                case 'bubble': ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, TAU); ctx.stroke(); break;
                case 'glyph': ctx.font = Math.round(s) + 'px serif'; ctx.textAlign = 'center'; ctx.fillText(p.ch, p.x, p.y); break;
                case 'gear': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-s, -s * 0.28, s * 2, s * 0.56); } ctx.restore(); break;
                case 'blood': ctx.beginPath(); ctx.ellipse(p.x, p.y, s * 0.55, s, 0, 0, TAU); ctx.fill(); break;
                case 'pixel': ctx.fillRect(Math.round(p.x / 4) * 4, Math.round(p.y / 4) * 4, s, s); break;
                default: ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
            }
        }
        ctx.restore();
    }
    const STY = {
        flame: () => ({ kind: 'petal', col: pick(['#ffb7d5', '#ff9ecb', '#ffd6e8', '#ff7fb8', '#ffb347']), size: rr(3, 5), vr: rr(-0.2, 0.2) }),
        ice: () => ({ kind: Math.random() < 0.5 ? 'shard' : 'dot', col: pick(['#ffffff', '#dff4ff', '#79b8ff']), size: rr(2, 5), vr: rr(-0.15, 0.15) }),
        water: () => ({ kind: 'bubble', col: '#d8fff8', size: rr(2, 6), g: -0.04 }),
        web: () => ({ kind: 'spark', col: pick(['#d6ffb0', '#ffffff', '#5fd84a']), size: 3 }),
        tome: () => ({ kind: 'glyph', col: pick(['#ffe9a8', '#c9a24a', '#fff6d8']), size: rr(10, 17), ch: GLYPHS[Math.floor(Math.random() * GLYPHS.length)], g: -0.02 }),
        gears: () => ({ kind: 'gear', col: pick(['#ffe08a', '#ff9a2c', '#fff3c4']), size: rr(4, 8), vr: rr(-0.25, 0.25) }),
        blood: () => ({ kind: 'blood', col: pick(['#ff4a66', '#c4122b', '#7a0016']), size: rr(2, 5), g: 0.18 }),
        pixel: () => ({ kind: 'pixel', col: pick(['#2dff6a', '#ffffff', '#eaffee']), size: pick([4, 6, 8]) })
    };
    function burst(x, y, n, spMin, spMax, extra) {
        for (let i = 0; i < n; i++) { const a = rr(0, TAU), sp = rr(spMin, spMax); emit(Object.assign({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rr(20, 46), kind: 'spark', col: pick(['#ffffff', '#fff3a0', '#9ef6ff']), size: 3 }, extra || {})); }
    }
    function styleBurst(S, x, y, n) {
        const mk = STY[S.cfg.style];
        for (let i = 0; i < n; i++) { const a = rr(0, TAU), sp = rr(1.2, 4.6); emit(Object.assign({ x: x + rr(-14, 14), y: y + rr(-8, 8), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rr(26, 56) }, mk())); }
    }

    // ---------------------------------------------------------------------- dibujo base
    function glow(x, y, r, col, a) {
        if (r <= 0) return;
        ctx.save();
        if (lite()) { ctx.globalAlpha = 0.5 * a; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill(); }
        else { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, a)); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
        ctx.restore();
    }
    function wash(col, a) { if (a <= 0.003) return; ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col; ctx.fillRect(0, 0, W(), H()); ctx.restore(); }
    function vignette(a, col) {
        if (a <= 0.01 || lite()) return;
        const g = ctx.createRadialGradient(W() / 2, H() / 2, H() * 0.3, W() / 2, H() / 2, H() * 0.95);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, col || 'rgba(0,0,0,1)');
        ctx.save(); ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = g; ctx.fillRect(0, 0, W(), H()); ctx.restore();
    }
    function txt(str, x, y, size, col, glowCol, align, alpha) {
        ctx.save(); ctx.font = Math.round(size) + 'px ' + PX; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
        const w = ctx.measureText(str).width, mw = W() * 0.94;
        if (w > mw) { size *= mw / w; ctx.font = Math.round(size) + 'px ' + PX; }
        ctx.globalAlpha = alpha === undefined ? 1 : clamp(alpha, 0, 1);
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size / 4); ctx.strokeStyle = '#000'; ctx.strokeText(str, x, y);
        if (glowCol && !lite()) { ctx.shadowColor = glowCol; ctx.shadowBlur = 14; }
        ctx.fillStyle = col; ctx.fillText(str, x, y); ctx.restore();
    }
    function orb(x, y, r, pal) { glow(x, y, r * 2.6, pal.c1, 0.8); glow(x, y, r * 1.5, pal.c2, 0.95); ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, TAU); ctx.fill(); ctx.restore(); }

    // ---------------------------------------------------------------------- rayos
    function poly(x, yA, yB, wA, wB, t, ph, sc) {
        const n = lite() ? 10 : 22, L = [], R = [];
        for (let i = 0; i <= n; i++) { const k = i / n, y = lerp(yA, yB, k), hw = lerp(wA, wB, k) * 0.5 * sc * (1 + 0.09 * Math.sin(y * 0.06 - t * 0.55 + ph)); L.push([x - hw, y]); R.push([x + hw, y]); }
        ctx.beginPath(); L.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
        for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]); ctx.closePath();
    }
    // Decoración propia de cada jefe, dibujada encima del rayo
    const DECO = {
        flame(x, yA, yB, w, p, t) {                       // nueve colas: nueve listones de fuego ondulantes
            ctx.lineWidth = 2.2; const st = Math.max(4, Math.floor(Math.abs(yB - yA) / 10));
            for (let i = 0; i < 9; i++) {
                const o = (i - 4) / 4; ctx.strokeStyle = i % 2 ? p.c3 : p.c1; ctx.globalAlpha = 0.85; ctx.beginPath();
                for (let s = 0; s <= st; s++) { const k = s / st, y = lerp(yA, yB, k), hw = lerp(0.5, 1, k) * w / 2, xx = x + o * hw * 0.85 + Math.sin(y * 0.045 - t * 0.35 + i * 0.9) * hw * 0.22; s ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); }
                ctx.stroke();
            }
        },
        ice(x, yA, yB, w, p, t) {                         // cristales de hielo en los bordes
            const d = Math.sign(yB - yA) || 1; ctx.fillStyle = p.c3; ctx.globalAlpha = 0.9;
            steps(yA, yB, 26).forEach((y, i) => { const hw = hwAt(yA, yB, y, w); for (const sd of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + sd * hw, y); ctx.lineTo(x + sd * (hw + 9 + (i % 3) * 5), y + d * 10); ctx.lineTo(x + sd * hw, y + d * 21); ctx.fill(); } });
        },
        water(x, yA, yB, w, p, t) {                       // olas y burbujas dentro del chorro
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
            for (let k = -1; k <= 1; k += 2) { ctx.beginPath(); steps(yA, yB, 6).forEach((y, i) => { const xx = x + k * hwAt(yA, yB, y, w) * 0.45 + Math.sin(y * 0.09 - t * 0.4 + k) * w * 0.12; i ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); }); ctx.stroke(); }
            ctx.lineWidth = 1.3; steps(yA, yB, 30).forEach((y, i) => { ctx.beginPath(); ctx.arc(x + Math.sin(y * 0.1 + t * 0.2 + i) * hwAt(yA, yB, y, w) * 0.55, y, 3 + (i % 3), 0, TAU); ctx.stroke(); });
        },
        web(x, yA, yB, w, p, t) {                         // telaraña: hebras cruzadas
            const d = Math.sign(yB - yA) || 1; ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.3; ctx.globalAlpha = 0.65;
            steps(yA, yB, 18).forEach(y => { const hw = hwAt(yA, yB, y, w); ctx.beginPath(); ctx.moveTo(x - hw, y); ctx.lineTo(x + hw, y + d * 18); ctx.moveTo(x + hw, y); ctx.lineTo(x - hw, y + d * 18); ctx.stroke(); });
            ctx.lineWidth = 1.6; for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.2, yA); ctx.lineTo(x + i * w * 0.34, yB); ctx.stroke(); }
        },
        tome(x, yA, yB, w, p, t) {                        // runas que corren por el rayo
            ctx.fillStyle = '#5a3a00'; ctx.font = '14px serif'; ctx.textAlign = 'center'; ctx.globalAlpha = 0.9;
            const off = (t * 3) % 24, d = Math.sign(yB - yA) || 1;
            steps(yA, yB, 24).forEach((y, i) => { ctx.fillText(GLYPHS[(i + Math.floor(t / 8)) % GLYPHS.length], x + Math.sin(i * 1.7) * w * 0.22, y + d * off); });
        },
        gears(x, yA, yB, w, p, t) {                       // engranajes en los bordes y marcas de reloj
            ctx.strokeStyle = '#7a3a00'; ctx.lineWidth = 2; ctx.fillStyle = p.c3; ctx.globalAlpha = 0.95;
            steps(yA, yB, 56).forEach((y, i) => { const hw = hwAt(yA, yB, y, w), sd = i % 2 ? 1 : -1, gx = x + sd * hw * 0.55; ctx.save(); ctx.translate(gx, y); ctx.rotate(t * 0.08 * sd); for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 4); ctx.fillRect(-9, -2.4, 18, 4.8); } ctx.beginPath(); ctx.arc(0, 0, 5, 0, TAU); ctx.stroke(); ctx.restore(); });
            steps(yA, yB, 14).forEach(y => { const hw = hwAt(yA, yB, y, w); ctx.beginPath(); ctx.moveTo(x - hw * 0.9, y); ctx.lineTo(x - hw * 0.6, y); ctx.moveTo(x + hw * 0.6, y); ctx.lineTo(x + hw * 0.9, y); ctx.stroke(); });
        },
        blood(x, yA, yB, w, p, t) {                       // venas que laten
            ctx.strokeStyle = '#4a000d'; ctx.lineWidth = 1.8; ctx.globalAlpha = 0.55 + 0.35 * Math.max(0, Math.sin(t * 0.13));
            for (let i = 0; i < 5; i++) { ctx.beginPath(); steps(yA, yB, 8).forEach((y, j) => { const xx = x + Math.sin(y * 0.05 + i * 1.9 + t * 0.05) * hwAt(yA, yB, y, w) * (0.2 + 0.14 * i); j ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); }); ctx.stroke(); }
        },
        pixel(x, yA, yB, w, p, t) {                       // rayo hecho de píxeles de 8 bits
            const f = Math.floor(t / 3), c = 8;
            steps(yA, yB, c).forEach((y, j) => { const hw = hwAt(yA, yB, y, w); for (let xx = -hw; xx < hw; xx += c) { const h = hash(Math.floor(xx / c), j, f); if (h === 0) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.9; ctx.fillRect(Math.round((x + xx) / c) * c, y, c, c); } else if (h === 1) { ctx.fillStyle = '#0a3a18'; ctx.globalAlpha = 0.55; ctx.fillRect(Math.round((x + xx) / c) * c, y, c, c); } } });
        },
        hero(x, yA, yB, w, p, t) {                        // chispas que suben por tu rayo
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; ctx.setLineDash([14, 10]); ctx.lineDashOffset = -t * 9 * (Math.sign(yB - yA) || 1);
            for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * w * 0.18, yA); ctx.lineTo(x + i * w * 0.3, yB); ctx.stroke(); }
            ctx.setLineDash([]);
        }
    };
    function drawBeam(x, yA, yB, w, pal, style, t, ph, isBoss) {
        if (Math.abs(yB - yA) < 3 || w <= 0) return;
        ctx.save(); if (!lite()) ctx.globalCompositeOperation = 'lighter';
        [[1.9, 0.22, pal.c1], [1.25, 0.7, pal.c1], [0.85, 0.95, pal.c2], [0.42, 1, '#ffffff']].forEach(l => { ctx.globalAlpha = l[1]; ctx.fillStyle = l[2]; poly(x, yA, yB, w * 0.5, w, t, ph, l[0]); ctx.fill(); });
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
        const f = DECO[style]; if (f) f(x, yA, yB, w, pal, t);
        ctx.restore();
    }
    function drawSphere(S, x, y) {
        const t = S.t, rate = S.rate || 0, r = 20 + 6 * Math.sin(t * 0.5) + rate * 1.6 + S.kick * 8 + (S.ph === 'fire' ? 6 : 0);
        glow(x, y, r * 3.4, S.cfg.c1, 0.55); glow(x, y, r * 2.4, HERO.c1, 0.5); glow(x, y, r * 1.6, S.cfg.c2, 0.85);
        ctx.save(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, r * 0.8, 0, TAU); ctx.fill(); ctx.restore();
        if (!lite()) {                                     // rayitos eléctricos alrededor del choque
            ctx.save(); ctx.lineWidth = 2; ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 5; i++) { const a = rr(0, TAU), L = r * rr(1.6, 3); ctx.strokeStyle = i % 2 ? S.cfg.c2 : HERO.c2; ctx.beginPath(); ctx.moveTo(x, y); for (let k = 1; k <= 4; k++) ctx.lineTo(x + Math.cos(a) * L * k / 4 + rr(-7, 7), y + Math.sin(a) * L * k / 4 + rr(-7, 7)); ctx.stroke(); }
            ctx.restore();
        }
        S.rings.forEach(g => { ctx.save(); ctx.globalAlpha = g.a; ctx.strokeStyle = g.col; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(g.x, g.y, g.r, g.r * 0.45, 0, 0, TAU); ctx.stroke(); ctx.restore(); });
    }

    // ---------------------------------------------------------------------- fondos propios de cada jefe
    const BACK = {
        flame(S, t) { wash('#ff2a7a', 0.10 + 0.04 * Math.sin(t * 0.1)); },
        ice(S, t) {
            wash('#9fd0ff', 0.10);
            [[0, 1], [W(), -1]].forEach(e => { const g = ctx.createLinearGradient(e[0], 0, e[0] + e[1] * W() * 0.24, 0); g.addColorStop(0, 'rgba(225,246,255,.6)'); g.addColorStop(1, 'rgba(225,246,255,0)'); ctx.fillStyle = g; ctx.fillRect(Math.min(e[0], e[0] + e[1] * W() * 0.24), 0, W() * 0.24, H()); });
        },
        water(S, t) {
            wash('#0a8f86', 0.16); ctx.save(); ctx.strokeStyle = 'rgba(216,255,248,.2)'; ctx.lineWidth = 2;
            for (let k = 0; k < 7; k++) { ctx.beginPath(); const y0 = H() * (k + 0.5) / 7; for (let x = 0; x <= W(); x += 10) { const y = y0 + Math.sin(x * 0.03 + t * 0.06 + k) * 8; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
            ctx.restore();
        },
        web(S, t) {
            wash('#0b2a08', 0.22); ctx.save(); ctx.strokeStyle = 'rgba(220,255,200,.32)'; ctx.lineWidth = 1;
            [[0, 0], [W(), 0], [0, H()], [W(), H()]].forEach(c => { const R = Math.min(W(), H()) * 0.42; for (let i = 0; i < 8; i++) { const a = i * Math.PI / 6; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.cos(a) * R * (c[0] ? -1 : 1), c[1] + Math.sin(a) * R * (c[1] ? -1 : 1)); ctx.stroke(); } for (let r = 1; r <= 4; r++) { ctx.beginPath(); ctx.arc(c[0], c[1], R * r / 4, 0, TAU); ctx.stroke(); } });
            ctx.restore();
        },
        tome(S, t) {
            wash('#2a1a00', 0.18); const cx = W() / 2, cy = H() * 0.46, R = Math.min(W() * 0.44, 160);
            ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.01); ctx.strokeStyle = 'rgba(255,233,168,.42)'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, R * 0.8, 0, TAU); ctx.stroke();
            for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); ctx.lineTo(Math.cos(a) * R, Math.sin(a) * R); ctx.stroke(); }
            for (let k = 0; k < 2; k++) { ctx.beginPath(); for (let i = 0; i < 3; i++) { const a = k * Math.PI / 3 + i * TAU / 3; i ? ctx.lineTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8) : ctx.moveTo(Math.cos(a) * R * 0.8, Math.sin(a) * R * 0.8); } ctx.closePath(); ctx.stroke(); }
            ctx.restore();
        },
        gears(S, t) {
            wash('#331a00', 0.2); const cx = W() / 2, cy = H() * 0.46, R = Math.min(W() * 0.44, 170);
            ctx.save(); ctx.strokeStyle = 'rgba(255,224,138,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.lineWidth = 2;
            for (let i = 0; i < 12; i++) { const a = i * TAU / 12; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * R * 0.86, cy + Math.sin(a) * R * 0.86); ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); ctx.stroke(); }
            ctx.lineWidth = 4; [[t * 0.05, 0.85], [t * 0.004, 0.55]].forEach(h => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.sin(h[0]) * R * h[1], cy - Math.cos(h[0]) * R * h[1]); ctx.stroke(); });
            ctx.restore();
        },
        blood(S, t) { const beat = Math.pow(Math.max(0, Math.sin(t * 0.13)), 8); wash('#8a0014', 0.16 + 0.18 * beat); vignette(0.7 + 0.3 * beat, 'rgba(120,0,16,.75)'); },
        pixel(S, t) {
            wash('#001a08', 0.2); ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.2)'; for (let y = 0; y < H(); y += 4) ctx.fillRect(0, y, W(), 1);
            if (t % 47 < 4) { const y = rr(0, H() - 30); ctx.fillStyle = 'rgba(45,255,106,.18)'; ctx.fillRect(0, y, W(), rr(8, 28)); }
            ctx.restore();
        }
    };

    // ---------------------------------------------------------------------- lógica
    const go = ph => { ST.ph = ph; ST.pt = 0; };
    function recentRate() { const S = ST, lim = S.t - 60; while (S.hist.length && S.hist[0] < lim) S.hist.shift(); return S.hist.length; }

    function start(b) {
        const idx = clamp(b.levelIdx | 0, 0, 7), attempt = b._clashN | 0;
        // OJO: start() se llama desde DENTRO del bucle de balas de juego.js (defeatBoss). Vaciar bullets/enemyBullets aquí
        // rompía ese bucle (bullets[i] undefined -> TypeError -> el juego se congelaba). Se limpian en el primer cuadro del choque.
        parts.length = 0;
        invulnerableUntil = 0;
        ST = { boss: b, cfg: CFG[idx], idx, attempt, t: 0, pt: 0, ph: 'charge', pos: 0.5, posDraw: 0.5, taps: 0, hist: [], rate: 0, surge: 0, nextSurge: 90,
               shake: 0, flash: 0, dark: 0, kick: 0, rings: [], bx0: b.x, px0: player.x, timeLeft: TIME_LIMIT, say: '', sayT: 0, hp0: b.hp, eP: 0, eB: 0, white: 0, pre: 0, clean: true };
        b._clashN = attempt + 1;
        tone(80, 420, 0.8, 'sawtooth', 0.06);
    }

    function press() {
        const S = ST; if (!S) return;
        if (S.ph !== 'struggle') return;
        S.hist.push(S.t); S.taps++; S.kick = 1;
        const rate = recentRate(), boost = rate >= SUPER_RATE ? 1.35 : 1;
        S.pos = Math.max(0, S.pos - PUSH * boost);
        const g = geo(S);
        burst(g.cx, g.cy, 5, 2, 6); if (Math.random() < 0.5) styleBurst(S, g.cx, g.cy, 2);
        if (S.taps % 3 === 0) S.rings.push({ x: g.cx, y: g.cy, r: 10, a: 0.9, col: pick([S.cfg.c2, HERO.c2, '#fff']) });
        tone(420 + rate * 55, 900 + rate * 80, 0.05, 'square', 0.035);
    }

    function geo(S) {
        const b = S.boss, cx = W() / 2, bY = b.y + b.height * 0.78, pY = player.y + 3;
        return { cx, bY, pY, cy: lerp(bY, pY, S.posDraw) };
    }

    function finishWin() {
        const S = ST, b = S.boss;
        b.hp = 0; b._clashDone = true; ST = null; parts.length = 0;
        score += WIN_BONUS;
        post = 1; postCol = '#fff';
        invulnerableUntil = Date.now() + 2500;
        defeatBoss(b);
    }
    function finishLose() {
        const S = ST, b = S.boss;
        b._clashDone = (S.attempt + 1) >= MAX_CLASHES; ST = null; parts.length = 0;
        const shielded = powerUps.shield > Date.now();
        if (shielded) { powerUps.shield = 0; createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#0ff', 20); }
        else { createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color || '#0ff', 40); lives -= shipHitDamage(); powerPoints = Math.max(0, powerPoints - 50); }
        invulnerableUntil = Date.now() + 3000;
        b.hp = Math.max(b.hp, b.maxHp * 0.30);         // el jefe se recupera con la energía robada
        post = 0.8; postCol = S.cfg.c1; screenShake = Math.max(screenShake, 30);
        if (lives <= 0) gameOver();
    }
    function abort() { if (ST) { ST.boss._clashDone = true; ST = null; } parts.length = 0; }

    function step() {
        const S = ST, b = S.boss, cfg = S.cfg;
        S.t++; S.pt++;
        if (S.clean) {                       // limpieza diferida (ya fuera del bucle de balas)
            S.clean = false;
            enemyBullets.length = 0; bullets.length = 0;
            try { if (window.WaveAttacks && WaveAttacks.reset) WaveAttacks.reset(); } catch (e) {}
        }
        S.posDraw += (S.pos - S.posDraw) * 0.35;
        S.dark = Math.min(1, S.dark + 0.04); S.kick *= 0.82;
        if (S.flash > 0) S.flash = Math.max(0, S.flash - 0.04);
        if (S.sayT > 0) S.sayT--;
        S.rings.forEach(g => { g.r += 5; g.a -= 0.035; }); S.rings = S.rings.filter(g => g.a > 0);
        const g = geo(S);
        switch (S.ph) {
            case 'charge': {
                const k = eOut(clamp(S.pt / 45, 0, 1));
                if (S.pt < 60 && S.pt % 7 === 0) S.shake = Math.max(S.shake, 6);   // el jefe se levanta tambaleándose
                b.x = lerp(S.bx0, W() / 2 - b.width / 2, k); player.x = lerp(S.px0, W() / 2 - player.width / 2, k);
                const gg = geo(S), R = 8 + sstep(30, 100, S.pt) * 26;
                if (S.pt % 12 === 0) tone(120 + S.pt * 6, 200 + S.pt * 9, 0.18, 'sawtooth', 0.035);
                if (S.pt % 2 === 0) [[gg.cx, gg.bY, S.cfg.c2], [gg.cx, gg.pY, HERO.c2]].forEach(o => { const a = rr(0, TAU), d = R * 3 + 30; emit({ x: o[0] + Math.cos(a) * d, y: o[1] + Math.sin(a) * d, vx: -Math.cos(a) * d / 16, vy: -Math.sin(a) * d / 16, drag: 1, life: 16, kind: 'spark', col: o[2], size: 3 }); });
                S.shake = Math.max(S.shake, sstep(10, 100, S.pt) * 5);
                if (S.pt >= 100) { go('fire'); S.shake = 18; S.flash = 0.8; tone(200, 40, 0.7, 'sawtooth', 0.08); tone(900, 300, 0.4, 'square', 0.05); }
                break;
            }
            case 'fire':
                if (S.pt % 6 === 0) tone(300 + S.pt * 10, 150, 0.1, 'square', 0.03);
                S.shake = Math.max(S.shake, 8);
                if (S.pt >= 40) { go('struggle'); S.flash = 1; S.shake = 26; S.hist = []; S.nextSurge = 70 + (Math.random() * 40 | 0); S.rings.push({ x: g.cx, y: lerp(g.bY, g.pY, 0.5), r: 10, a: 1, col: '#fff' }); tone(60, 30, 0.6, 'sawtooth', 0.09); }
                break;
            case 'struggle': {
                S.timeLeft--; S.rate = recentRate();
                let d = ((DRIFT[currentDiff] || 0.1) + S.idx * 0.004) / 60 * (S.attempt ? 1.05 : 1) * (isMobile() ? MOBILE_EASE : 1);
                try { if (keys['Space']) d -= HOLD_PUSH; } catch (e) {}
                if (S.surge > 0) { S.surge--; d += 0.0045; }
                else if (--S.nextSurge <= 0) { S.surge = 14; S.nextSurge = 80 + (Math.random() * 60 | 0); S.shake = 16; S.flash = 0.35; S.say = '¡EMBESTIDA!'; S.sayT = 26; tone(70, 35, 0.4, 'sawtooth', 0.07); }
                S.pos = clamp(S.pos + d, 0, 1);
                S.shake = Math.max(S.shake, 4 + S.rate * 0.8);
                if (S.t % (lite() ? 4 : 2) === 0) styleBurst(S, g.cx + rr(-18, 18), g.cy, 1);
                if (S.pos <= 0.05) { go('win'); S.hp0 = b.hp; S.say = cfg.win; S.sayT = 200; tone(100, 900, 1.0, 'sawtooth', 0.08); }
                else if (S.pos >= 0.95 || (S.timeLeft <= 0 && S.pos >= 0.5)) { go('lose'); S.say = '¡TE SUPERARON!'; S.sayT = 200; tone(300, 40, 0.9, 'sawtooth', 0.08); }
                else if (S.timeLeft <= 0) { go('win'); S.hp0 = b.hp; S.say = cfg.win; S.sayT = 200; tone(100, 900, 1.0, 'sawtooth', 0.08); }
                break;
            }
            case 'win':
                S.pos += (0 - S.pos) * 0.15; S.eP = sstep(10, 60, S.pt); S.eB = S.eP;
                b.hp = Math.max(0.0001, lerp(S.hp0, 0.0001, sstep(20, 80, S.pt)));
                S.shake = Math.max(S.shake, 22); S.white = sstep(66, 98, S.pt);
                if (S.pt % 3 === 0) { burst(b.x + rr(0, b.width), b.y + rr(0, b.height), 6, 3, 9, { col: pick([cfg.c2, '#fff']) }); styleBurst(S, b.x + b.width / 2, b.y + b.height / 2, 3); }
                if (S.pt === 20 || S.pt === 50) tone(150, 700, 0.35, 'sawtooth', 0.07);
                if (S.pt >= 100) finishWin();
                break;
            case 'lose':
                S.pos += (1 - S.pos) * 0.15; S.eB = sstep(10, 55, S.pt); S.shake = Math.max(S.shake, 20);
                if (S.pt === 40) { burst(g.cx, g.pY, 40, 3, 11, { col: pick([cfg.c1, '#fff']) }); tone(200, 30, 0.7, 'sawtooth', 0.09); }
                if (S.pt >= 40 && S.pt % 3 === 0) styleBurst(S, g.cx, g.pY, 3);
                S.white = sstep(70, 92, S.pt) * 0.9;
                if (S.pt >= 96) finishLose();
                break;
        }
        stepParts();
    }

    // ---------------------------------------------------------------------- dibujo de cada cuadro
    function render() {
        const S = ST, b = S.boss, cfg = S.cfg, t = S.t, w = W(), h = H(), g = geo(S);
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, w, h); ctx.clip();
        if (S.shake > 0.5) { ctx.translate(rr(-S.shake, S.shake) * 0.5, rr(-S.shake, S.shake) * 0.5); S.shake *= 0.88; }
        if (currentMode !== 'clasico') drawThemeBackground(); else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h); }
        wash('#000', 0.45 * S.dark);
        if (BACK[cfg.style]) BACK[cfg.style](S, t);
        b.draw(currentEnemyFrame);

        // rayos
        const base = clamp(w * 0.11, 30, 64);
        if (S.ph !== 'charge') {
            const kf = S.ph === 'fire' ? eOut(clamp(S.pt / 40, 0, 1)) : 1, cy = S.ph === 'fire' ? lerp(g.bY, g.pY, 0.5) : g.cy;
            const wB = base * (0.55 + S.posDraw) * (1 - S.eB * 0.9) * (S.ph === 'lose' ? 1 + S.eB * 2.2 : 1);
            const wP = base * (0.55 + (1 - S.posDraw)) * (1 + S.eP * 2.6) * (S.ph === 'lose' ? 1 - S.eB * 0.9 : 1);
            drawBeam(g.cx, g.bY, lerp(g.bY, cy, kf), Math.max(2, wB), cfg, cfg.style, t, 0, true);
            drawBeam(g.cx, g.pY, lerp(g.pY, cy, kf), Math.max(2, wP), HERO, 'hero', t, 2, false);
            if (S.ph !== 'fire' || S.pt > 30) drawSphere(S, g.cx, S.ph === 'fire' ? cy : g.cy);
        } else {                                                  // cargando: dos orbes que crecen
            const R = 8 + sstep(30, 100, S.pt) * 26;
            orb(g.cx, g.bY, R, cfg); orb(g.cx, g.pY - 4, R, HERO);
        }
        try { player.draw(); } catch (e) {}
        drawParts();

        // fogonazos
        if (S.flash > 0.01) wash('#fff', S.flash * 0.7);
        if (S.white > 0.01) wash(S.ph === 'lose' ? cfg.c1 : '#fff', S.white);
        vignette(0.5, cfg.style === 'blood' ? 'rgba(60,0,10,1)' : 'rgba(0,0,0,1)');

        // barras de cine
        const bar = Math.round(h * 0.07 * sstep(0, 12, S.t)); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, bar); ctx.fillRect(0, h - bar, w, bar);

        // textos
        const fs = clamp(w * 0.05, 12, 24);
        if (S.ph === 'charge') {
            const n1 = Math.floor(S.pt * 0.9);
            if (S.pt > 8) txt(cfg.taunt.slice(0, n1), w / 2, h * 0.36, fs * 0.78, cfg.c2, cfg.c1, 'center', sstep(8, 18, S.pt));
            if (S.pt > 52) txt(cfg.reply.slice(0, Math.floor((S.pt - 52) * 0.8)), w / 2, h * 0.58, fs * 0.78, HERO.c2, HERO.c1, 'center', sstep(52, 62, S.pt));
        }
        if (S.ph === 'fire') {
            const sc = 1 + Math.sin(S.pt * 0.9) * 0.05;
            txt('¡¡CHOQUE DE PODERES!!', w / 2, h * 0.5, fs * 1.25 * sc, '#fff', cfg.c1, 'center', sstep(0, 6, S.pt));
        }
        if (S.ph === 'struggle' || S.ph === 'win' || S.ph === 'lose') {
            txt(cfg.atk, 8, g.bY + 16, fs * 0.5, cfg.c2, cfg.c1, 'left');                 // nombre del rayo del jefe
            txt(cfg.hero, w - 8, g.pY - 18, fs * 0.5, HERO.c2, HERO.c1, 'right');          // nombre de tu rayo
            if (S.pt < 50 && S.ph === 'struggle') txt('¡¡CHOQUE DE PODERES!!', w / 2, h * 0.2, fs * 0.95, '#fff', cfg.c1, 'center', 1 - sstep(30, 50, S.pt));
        }
        if (S.ph === 'struggle') {
            // medidor del pulso (izquierda): arriba = VICTORIA, abajo = PELIGRO
            const mx = 10, mw = 10, my0 = g.bY, my1 = g.pY, mh = my1 - my0;
            ctx.save(); ctx.fillStyle = 'rgba(0,0,0,.6)'; ctx.fillRect(mx - 2, my0 - 2, mw + 4, mh + 4);
            const grd = ctx.createLinearGradient(0, my0, 0, my1); grd.addColorStop(0, '#2dff6a'); grd.addColorStop(0.5, '#ffd84a'); grd.addColorStop(1, '#ff2d4a');
            ctx.fillStyle = grd; ctx.fillRect(mx, my0, mw, mh);
            const my = lerp(my0, my1, S.posDraw); ctx.fillStyle = '#fff'; ctx.fillRect(mx - 5, my - 3, mw + 10, 6); ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.strokeRect(mx - 5, my - 3, mw + 10, 6);
            ctx.restore();
            // indicación de qué tocar + velocidad
            const pulse = 1 + Math.sin(t * 0.5) * 0.08 + S.kick * 0.15;
            txt(isMobile() ? '¡TOCA  A  SÚPER RÁPIDO!' : '¡MARTILLEA  ESPACIO!', w / 2, h - bar - 18, fs * 0.85 * pulse, '#fff', '#ffd84a', 'center');
            txt(S.rate + ' toques/s', w - 8, h - bar - 44, fs * 0.55, S.rate >= SUPER_RATE ? '#2dff6a' : (S.rate >= 3 ? '#ffd84a' : '#ff6a6a'), null, 'right');
            if (S.rate >= SUPER_RATE) txt('¡¡SUPER!!', w / 2, h * 0.3, fs * 1.1 + Math.sin(t) * 2, '#ffd84a', '#ff9a2c', 'center');
            if (S.sayT > 0) txt(S.say, w / 2, h * 0.24, fs * 1.05, cfg.c2, cfg.c1, 'center', Math.min(1, S.sayT / 8));
            ctx.save(); ctx.fillStyle = cfg.c1; ctx.fillRect(0, h - 3, w * clamp(S.timeLeft / TIME_LIMIT, 0, 1), 3); ctx.restore();   // tiempo restante
        }
        if (S.ph === 'win') { txt('¡¡VICTORIA!!', w / 2, h * 0.36, fs * 1.5, '#ffd84a', '#ff9a2c', 'center', sstep(0, 10, S.pt)); txt(S.say, w / 2, h * 0.46, fs * 0.7, '#fff', cfg.c1, 'center', sstep(10, 20, S.pt)); }
        if (S.ph === 'lose') { txt('¡¡TE SUPERARON!!', w / 2, h * 0.36, fs * 1.3, '#ff6a6a', '#ff2d4a', 'center', sstep(0, 10, S.pt)); if (S.pt > 30) txt('EL JEFE ABSORBE TU ENERGÍA...', w / 2, h * 0.46, fs * 0.6, '#fff', cfg.c1, 'center', sstep(30, 40, S.pt)); }
        ctx.restore();
    }

    function frame() {
        try { step(); } catch (e) { console.error('[choque] step', e); abort(); return false; }
        if (!ST) return false;
        try { render(); } catch (e) { console.error('[choque] render', e); try { ctx.restore(); } catch (e2) {} abort(); return false; }
        return true;
    }
    const valid = () => ST && isPlaying && activeBoss === ST.boss && ST.boss.state === 'active';

    // ---------------------------------------------------------------------- disparador + drops
    // Lo llama defeatBoss() (juego.js) cuando la vida del jefe llega a 0: en vez de morir, dice que no se rinde
    // y se lanza el choque de poderes. Devuelve true si el jefe NO debe morir todavía.
    function intercept(b) {
        if (ST) return ST.boss === b;                                // ya hay un choque en curso: los disparos sobrantes no matan
        if (!b || b._clashDone || (b._clashN | 0) >= MAX_CLASHES || levelPhase !== 'boss') return false;
        if (b.mode && b.mode !== 'fight') return false;
        if ((b.levelIdx | 0) > 7) return false;
        b.hp = 0.0001;                                               // barra vacía, pero aún en pie
        start(b);
        return true;
    }
    function bossDrops() {
        const b = activeBoss;
        if (!b || b.state !== 'active' || levelPhase !== 'boss' || b.mode === 'enter') { dropT = 0; return; }
        if (++dropT < DROP_EVERY) return; dropT = 0;
        if (Math.random() >= DROP_CHANCE) return;                  // 47.6 %
        if (items.length >= DROP_MAX_ON_SCREEN) return;
        const it = new Item(clamp(b.x + b.width * rr(0.15, 0.85), 0, W() - 24), b.y + b.height * 0.8);
        if (Math.random() < 0.6 && it.colors && it.colors[1] && it.colors[3]) it.type = Math.random() < 0.5 ? 1 : 3;   // Doble disparo / Súper: matan más rápido
        items.push(it);
        createExplosion(it.x + 10, it.y + 10, '#ff0', 10, true);
    }

    // ---------------------------------------------------------------------- enganches
    const _take = Extras.takeover, _busy = Extras.busy, _after = Extras.afterFrame, _run = Extras.onRunStart;
    Extras.takeover = function () {
        if (ST) { if (valid()) { if (frame()) return true; } else { ST = null; parts.length = 0; } }
        return _take.apply(Extras, arguments);
    };
    Extras.busy = function () { return !!ST || _busy.apply(Extras, arguments); };
    Extras.afterFrame = function () {
        const r = _after.apply(Extras, arguments);
        try { bossDrops(); } catch (e) { console.error('[choque]', e); }
        if (post > 0.01) { wash(postCol, post); post -= 0.045; }
        return r;
    };
    Extras.onRunStart = function () { ST = null; post = 0; dropT = 0; parts.length = 0; return _run.apply(Extras, arguments); };

    // entradas: Espacio, botón A del móvil, clic de ratón
    const held = () => window.GamePause && window.GamePause.on;
    window.addEventListener('keydown', e => { if (!ST || held()) return; if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) press(); } }, true);
    const bind = () => {
        const a = document.getElementById('btnShoot'); if (a) a.addEventListener('pointerdown', () => { if (ST && !held()) press(); }, true);
        if (typeof canvas !== 'undefined') canvas.addEventListener('pointerdown', e => { if (ST && !held() && e.pointerType === 'mouse') press(); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();

    window.Choque = {
        active: () => !!ST,
        intercept,
        dev: { start() { if (activeBoss && activeBoss.state === 'active' && !ST) { activeBoss._clashN = 0; activeBoss._clashDone = false; start(activeBoss); } } }
    };
})();
