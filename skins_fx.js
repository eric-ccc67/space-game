// ============================================================================
// skins_fx.js — EFECTOS ÚNICOS PARA CADA SKIN DE LA TIENDA (v39)
// ----------------------------------------------------------------------------
//  Cada skin tiene su propio carácter (aura + estela + partículas + detalle propio):
//    NEON MAGENTA     → estelas de luz neón desde las alas, aura vibrante y barrido de escáner
//    CRISTAL GLACIAL  → copos de nieve, cristales de hielo que orbitan, bruma y anillo escarchado
//    MAGMA            → llamas en los dos motores, brasas, chispas y halo de calor
//    SAKURA           → torbellino de pétalos, pétalos orbitando y aura rosada
//    SOMBRA           → humo oscuro, relámpagos violeta y aura sombría
//    ORO REAL         → destellos de estrella de 4 puntas, rayos de luz giratorios y polvo de oro
//    ARCOIRIS         → cinta arcoíris desde las alas, orbes de colores y anillo cromático
//  Lo llama el parche de Player.draw en la tienda (juego.js): SkinFX.draw(nave) → true si dibujó el efecto.
//  Se carga DESPUÉS de juego.js. En modo de bajo rendimiento hay menos partículas y sin brillos aditivos.
// ============================================================================
const SkinFX = (function () {
    'use strict';
    const TAU = Math.PI * 2;
    const P = [];                       // partículas
    let T = 0, hist = [], lastCall = 0, bolt = null, nextBolt = 90;
    const lite = () => { try { return !!performanceMode; } catch (e) { return false; } };
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[(Math.random() * a.length) | 0];
    const hsl = (h, s, l, a) => 'hsla(' + (((h % 360) + 360) % 360) + ',' + s + '%,' + l + '%,' + (a == null ? 1 : a) + ')';
    const cap = () => lite() ? 45 : 130;
    const add = o => { if (P.length < cap()) { o.max = o.life; P.push(o); } };
    const ADD = () => lite() ? 'source-over' : 'lighter';

    function glow(cx, cy, r, rgb, a) {
        const g = ctx.createRadialGradient(cx, cy, r * 0.15, cx, cy, r);
        g.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); g.addColorStop(1, 'rgba(' + rgb + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    }
    function star4(x, y, r, rot) {
        ctx.save(); ctx.translate(x, y); ctx.rotate(rot || 0); ctx.beginPath();
        for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.25 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function ribbon(side, hueFn, w0) {                          // cinta que sale de una ala (usa el historial de posiciones)
        for (let i = 1; i < hist.length; i++) {
            const a = hist[i - 1], b = hist[i], k = 1 - i / hist.length;
            const ax = side < 0 ? a.lx : a.rx, bx = side < 0 ? b.lx : b.rx;
            ctx.strokeStyle = hueFn(i, k); ctx.lineWidth = Math.max(0.6, w0 * k);
            ctx.beginPath(); ctx.moveTo(ax, a.y + (i - 1) * 2.6); ctx.lineTo(bx, b.y + i * 2.6); ctx.stroke();
        }
    }

    // ------------------------------------------------------------------ partículas
    function stepParticles() {
        for (let i = P.length - 1; i >= 0; i--) {
            const p = P[i]; p.life--;
            if (p.life <= 0) { P.splice(i, 1); continue; }
            p.x += p.vx; p.y += p.vy;
            switch (p.k) {
                case 'flake': p.vx += Math.sin(T * 0.08 + p.ph) * 0.03; p.rot += p.vr; break;
                case 'petal': p.vx += Math.sin(T * 0.07 + p.ph) * 0.05; p.rot += p.vr; break;
                case 'smoke': p.s += 0.32; p.vx *= 0.97; break;
                case 'mist': p.s += 0.35; break;
                case 'ember': p.s *= 0.965; p.vx += (Math.random() - 0.5) * 0.12; break;
                case 'dust': p.vy += 0.015; break;
                case 'wisp': p.vx += Math.sin(T * 0.12 + p.ph) * 0.08; break;
            }
        }
    }
    function drawParticles() {
        for (let i = 0; i < P.length; i++) {
            const p = P[i], k = p.life / p.max;
            switch (p.k) {
                case 'flake':
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k * 1.6);
                    ctx.strokeStyle = p.c; ctx.lineWidth = 1;
                    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath();
                    for (let a = 0; a < 3; a++) { const an = a * Math.PI / 3; ctx.moveTo(Math.cos(an) * p.s, Math.sin(an) * p.s); ctx.lineTo(-Math.cos(an) * p.s, -Math.sin(an) * p.s); }
                    ctx.stroke(); ctx.restore(); break;
                case 'petal':
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k * 1.8);
                    ctx.fillStyle = p.c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
                    ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * (0.35 + 0.35 * Math.abs(Math.sin(p.rot * 1.7))), 0, 0, TAU); ctx.fill(); ctx.restore(); break;
                case 'smoke':
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.5 * k * k;
                    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break;
                case 'mist':
                    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.2 * k;
                    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break;
                case 'ember':
                    ctx.globalCompositeOperation = ADD(); ctx.globalAlpha = Math.min(1, k * 1.5);
                    ctx.fillStyle = p.c; ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s); break;
                case 'dust':
                    ctx.globalCompositeOperation = ADD(); ctx.globalAlpha = Math.min(1, k * 1.6);
                    ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); break;
                case 'star':
                    ctx.globalCompositeOperation = ADD(); ctx.globalAlpha = Math.sin(k * Math.PI);
                    ctx.fillStyle = p.c; star4(p.x, p.y, p.s * (0.5 + 0.5 * Math.sin(k * Math.PI)), p.rot); break;
                case 'dot':
                    ctx.globalCompositeOperation = ADD(); ctx.globalAlpha = Math.min(1, k * 1.6);
                    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break;
                case 'wisp':
                    ctx.globalCompositeOperation = ADD(); ctx.globalAlpha = 0.7 * k;
                    ctx.fillStyle = p.c; ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, TAU); ctx.fill(); break;
            }
        }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }

    // ------------------------------------------------------------------ cada skin
    const SK = {
        neon(pl, cx, cy, w, h) {
            // estelas de luz desde las puntas de las alas
            ctx.globalCompositeOperation = ADD(); ctx.lineCap = 'round';
            [-1, 1].forEach(sd => {
                ribbon(sd, (i, k) => 'rgba(255,47,214,' + (0.75 * k) + ')', 4.5);
                ribbon(sd, (i, k) => 'rgba(255,230,255,' + (0.8 * k) + ')', 1.6);
            });
            ctx.lineCap = 'butt';
            const fl = 0.75 + 0.25 * Math.sin(T * 0.35) + (Math.random() < 0.04 ? 0.25 : 0);   // parpadeo de neón
            glow(cx, cy, Math.max(w, h) * 0.95, '255,47,214', 0.34 * fl);
            // anillo neón + barrido de escáner por la nave
            ctx.strokeStyle = 'rgba(255,120,235,' + (0.55 * fl) + ')'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.78, h * 0.68, 0, 0, TAU); ctx.stroke();
            const sy = pl.y + ((T * 1.4) % (h + 6)) - 3;
            ctx.fillStyle = 'rgba(255,200,250,0.55)'; ctx.fillRect(pl.x - 3, sy, w + 6, 1.6);
            if (T % 3 === 0) add({ k: 'dot', x: cx + rnd(-w * 0.5, w * 0.5), y: pl.y + h * 0.9, vx: 0, vy: rnd(1.2, 2.4), life: 20, s: 1.4, c: pick(['#ff2fd6', '#fff', '#ff8aee']) });
        },
        frost(pl, cx, cy, w, h) {
            if (T % 3 === 0) add({ k: 'flake', x: cx + rnd(-w * 0.7, w * 0.7), y: cy + rnd(-h * 0.4, h * 0.6), vx: rnd(-0.3, 0.3), vy: rnd(0.5, 1.2), life: 56, s: rnd(2.5, 4.5), c: pick(['#ffffff', '#cdeeff', '#9bdcff']), rot: Math.random() * TAU, vr: rnd(-0.06, 0.06), ph: Math.random() * 6 });
            if (T % 5 === 0) add({ k: 'mist', x: cx + rnd(-w * 0.3, w * 0.3), y: pl.y + h * 0.92, vx: rnd(-0.2, 0.2), vy: rnd(0.4, 0.9), life: 30, s: 6, c: '#bfe9ff' });
            ctx.globalCompositeOperation = ADD();
            glow(cx, cy, Math.max(w, h) * 0.9, '120,210,255', 0.26);
            // anillo escarchado giratorio
            ctx.strokeStyle = 'rgba(220,245,255,0.7)'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 7]); ctx.lineDashOffset = -T * 0.5;
            ctx.beginPath(); ctx.arc(cx, cy, w * 0.72, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            // cristales de hielo que orbitan
            for (let i = 0; i < 5; i++) {
                const a = T * 0.04 + i * TAU / 5, x = cx + Math.cos(a) * w * 0.78, y = cy + Math.sin(a) * h * 0.55;
                ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.95)' : 'rgba(140,220,255,0.95)';
                ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 2.6, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 2.6, y); ctx.closePath(); ctx.fill();
            }
        },
        ember(pl, cx, cy, w, h) {
            const fy = pl.y + h * 0.9;
            for (const sx of [-0.2, 0.2]) {                              // llama en cada motor
                const x = cx + w * sx, len = 12 + 6 * Math.sin(T * 0.5 + sx * 9) + Math.random() * 4;
                ctx.globalCompositeOperation = ADD();
                const g = ctx.createLinearGradient(0, fy, 0, fy + len);
                g.addColorStop(0, 'rgba(255,245,170,0.95)'); g.addColorStop(0.45, 'rgba(255,140,30,0.8)'); g.addColorStop(1, 'rgba(220,30,10,0)');
                ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - 3.5, fy); ctx.lineTo(x + 3.5, fy); ctx.lineTo(x + Math.sin(T * 0.6) * 1.5, fy + len); ctx.closePath(); ctx.fill();
                if (T % 2 === 0) add({ k: 'ember', x: x + rnd(-2, 2), y: fy + 2, vx: rnd(-0.5, 0.5), vy: rnd(0.8, 2.2), life: rnd(24, 40), s: rnd(2, 3.6), c: pick(['#ffd23a', '#ff8a1a', '#e83820']) });
            }
            if (Math.random() < 0.18) add({ k: 'ember', x: cx + rnd(-w * 0.6, w * 0.6), y: cy + rnd(-h * 0.3, h * 0.3), vx: rnd(-0.4, 0.4), vy: rnd(-1.6, -0.6), life: 30, s: 2, c: '#ffc23a' });   // chispas que suben
            ctx.globalCompositeOperation = ADD();
            glow(cx, cy, Math.max(w, h) * (0.9 + 0.08 * Math.sin(T * 0.3) + Math.random() * 0.04), '255,110,20', 0.3);   // halo de calor
        },
        petal(pl, cx, cy, w, h) {
            if (T % 4 === 0) add({ k: 'petal', x: cx + rnd(-w * 0.8, w * 0.8), y: cy + rnd(-h * 0.5, h * 0.4), vx: rnd(-0.8, 0.8), vy: rnd(0.3, 1.2), life: 70, s: rnd(3, 5), c: pick(['#ff8fbf', '#ffc2da', '#fff0f6', '#ff6aa8']), rot: Math.random() * TAU, vr: rnd(-0.12, 0.12), ph: Math.random() * 6 });
            ctx.globalCompositeOperation = ADD();
            glow(cx, cy, Math.max(w, h) * 0.9, '255,143,191', 0.26);
            ctx.globalCompositeOperation = 'source-over';
            for (let i = 0; i < 4; i++) {                                // pétalos en órbita
                const a = T * 0.05 + i * TAU / 4, x = cx + Math.cos(a) * w * 0.82, y = cy + Math.sin(a) * h * 0.5;
                ctx.fillStyle = i % 2 ? '#ffd6e6' : '#ff8fbf';
                ctx.save(); ctx.translate(x, y); ctx.rotate(a + 1.2); ctx.beginPath(); ctx.ellipse(0, 0, 4.2, 2.2, 0, 0, TAU); ctx.fill(); ctx.restore();
            }
        },
        smoke(pl, cx, cy, w, h) {
            if (T % 2 === 0) add({ k: 'smoke', x: cx + rnd(-w * 0.25, w * 0.25), y: pl.y + h * 0.9, vx: rnd(-0.3, 0.3), vy: rnd(0.6, 1.3), life: 38, s: 5, c: pick(['#2a1440', '#3a1c58', '#1a0c2c']) });
            if (T % 6 === 0) add({ k: 'smoke', x: pl.x + (Math.random() < 0.5 ? 0.1 : 0.9) * w, y: pl.y + h * 0.7, vx: rnd(-0.4, 0.4), vy: rnd(0.4, 0.9), life: 30, s: 4, c: '#2a1440' });
            if (T % 7 === 0) add({ k: 'wisp', x: cx + rnd(-w * 0.6, w * 0.6), y: cy + rnd(-h * 0.2, h * 0.5), vx: rnd(-0.2, 0.2), vy: rnd(-1.2, -0.4), life: 34, s: rnd(1.5, 2.6), c: pick(['#c9a0ff', '#a878f0']), ph: Math.random() * 6 });
            ctx.globalCompositeOperation = 'source-over';
            const g = ctx.createRadialGradient(cx, cy, w * 0.2, cx, cy, Math.max(w, h) * 0.95);   // aura oscura
            g.addColorStop(0, 'rgba(20,6,40,0)'); g.addColorStop(0.65, 'rgba(40,14,70,0.3)'); g.addColorStop(1, 'rgba(40,14,70,0)');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Math.max(w, h) * 0.95, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = ADD();
            ctx.strokeStyle = 'rgba(168,120,240,' + (0.35 + 0.2 * Math.sin(T * 0.15)) + ')'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.ellipse(cx, cy, w * 0.74, h * 0.66, 0, 0, TAU); ctx.stroke();
            // relámpagos violeta ocasionales
            if (--nextBolt <= 0) {
                nextBolt = Math.floor(rnd(70, 150));
                const a = rnd(0, TAU), pts = []; let x = cx + Math.cos(a) * w * 0.55, y = cy + Math.sin(a) * h * 0.5;
                for (let i = 0; i < 6; i++) { pts.push([x, y]); x += Math.cos(a) * 7 + rnd(-5, 5); y += Math.sin(a) * 7 + rnd(-5, 5); }
                bolt = { pts, life: 7 };
            }
            if (bolt && bolt.life-- > 0) {
                ctx.strokeStyle = 'rgba(220,190,255,' + (bolt.life / 7) + ')'; ctx.lineWidth = 2; ctx.beginPath();
                bolt.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.stroke();
            }
        },
        sparkle(pl, cx, cy, w, h) {
            if (T % 3 === 0) add({ k: 'star', x: cx + rnd(-w * 0.8, w * 0.8), y: cy + rnd(-h * 0.6, h * 0.6), vx: 0, vy: 0, life: 26, s: rnd(3.5, 7), c: pick(['#fff3a0', '#ffd84a', '#ffffff']), rot: rnd(0, 1) });
            if (T % 2 === 0) add({ k: 'dust', x: cx + rnd(-w * 0.4, w * 0.4), y: pl.y + h * 0.9, vx: rnd(-0.4, 0.4), vy: rnd(0.5, 1.5), life: 30, s: 2, c: pick(['#ffd84a', '#ffc61a', '#fff3a0']) });
            ctx.globalCompositeOperation = ADD();
            glow(cx, cy, Math.max(w, h) * 0.95, '255,200,40', 0.3);
            // rayos de luz giratorios
            ctx.fillStyle = 'rgba(255,225,120,0.16)';
            for (let i = 0; i < 8; i++) {
                const a = T * 0.012 + i * TAU / 8, r = Math.max(w, h) * (i % 2 ? 1.15 : 1.5);
                ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a - 0.09) * r, cy + Math.sin(a - 0.09) * r); ctx.lineTo(cx + Math.cos(a + 0.09) * r, cy + Math.sin(a + 0.09) * r); ctx.closePath(); ctx.fill();
            }
            // brillo grande que late sobre la nave
            const s = 0.5 + 0.5 * Math.sin(T * 0.12);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.35 + 0.45 * s) + ')'; star4(cx, pl.y + h * 0.3, 6 + 5 * s, T * 0.02);
        },
        rainbow(pl, cx, cy, w, h) {
            ctx.globalCompositeOperation = ADD(); ctx.lineCap = 'round';
            [-1, 1].forEach(sd => ribbon(sd, (i, k) => hsl(T * 6 + i * 22, 100, 62, 0.85 * k), 5));
            ctx.lineCap = 'butt';
            glow(cx, cy, Math.max(w, h) * 0.85, '255,255,255', 0.14);
            // anillo cromático
            ctx.lineWidth = 2.2; const R = w * 0.7;
            for (let i = 0; i < 18; i++) {
                const a0 = T * 0.03 + i * TAU / 18;
                ctx.strokeStyle = hsl(i * 20 + T * 4, 100, 60, 0.75); ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + TAU / 18 * 0.8); ctx.stroke();
            }
            for (let i = 0; i < 3; i++) {                               // orbes de colores
                const a = -T * 0.06 + i * TAU / 3, x = cx + Math.cos(a) * R * 1.12, y = cy + Math.sin(a) * h * 0.5, c = hsl(i * 120 + T * 5, 100, 62, 1);
                ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill();
                ctx.fillStyle = hsl(i * 120 + T * 5, 100, 70, 0.25); ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill();
            }
            if (T % 3 === 0) add({ k: 'dot', x: cx + rnd(-w * 0.5, w * 0.5), y: pl.y + h * 0.9, vx: rnd(-0.3, 0.3), vy: rnd(0.8, 1.8), life: 24, s: 1.8, c: hsl(T * 9, 100, 65, 1) });
        }
    };

    // ------------------------------------------------------------------ entrada
    function draw(pl) {
        const fx = pl.skinFx, fn = SK[fx];
        if (!fn) return false;                                           // fx desconocido → se usa el efecto sencillo de siempre
        try { if (window.Cine && Cine.hidesPlayer && Cine.hidesPlayer()) return true; } catch (e) {}
        const nowMs = performance.now();
        if (nowMs - lastCall > 400) { P.length = 0; hist = []; bolt = null; }   // partida nueva / pausa larga: empieza limpio
        lastCall = nowMs; T++;
        const w = pl.width, h = pl.height, cx = pl.x + w / 2, cy = pl.y + h / 2;
        hist.unshift({ lx: pl.x + w * 0.06, rx: pl.x + w * 0.94, y: pl.y + h * 0.72 }); if (hist.length > (lite() ? 8 : 14)) hist.pop();
        stepParticles();
        ctx.save();
        try {
            fn(pl, cx, cy, w, h);
            drawParticles();
        } catch (e) { console.warn('SkinFX', e); }
        ctx.restore();
        return true;
    }
    // El módulo retro (shmup_retro) sustituye Player.draw y se salta el parche de la tienda: por eso el efecto se
    // engancha también aquí, por fuera. Si el parche de la tienda ya lo dibujó en esta llamada, no se repite.
    let drawn = 0;
    const baseDraw = draw;
    function drawOnce(pl) { drawn++; return baseDraw(pl); }
    try {
        const pd = Player.prototype.draw;
        Player.prototype.draw = function () {
            const before = drawn, r = pd.apply(this, arguments);
            if (drawn === before && typeof gameStartTimer !== 'undefined') { try { drawOnce(this); } catch (e) {} }
            return r;
        };
    } catch (e) { console.warn('skins_fx.js:', e); }
    return { draw: drawOnce, particles: P };
})();

window.SkinFX = SkinFX;       // el parche de la tienda lo busca en window
