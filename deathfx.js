// ============================================================================
//  deathfx.js — v56 · EXPLOSIONES al morir enemigos, mini jefes y jefes (estilo Touhou 6, pero llamativas)
// ----------------------------------------------------------------------------
//  En vez de una nube de fragmentos de píxel, ahora cada muerte es un "pop" limpio como en Touhou 6 (EoSD):
//    · enemigo común : destello + anillo fino que se expande + segundo anillo blanco + unas pocas chispas en forma de rombo
//    · mini jefe     : destello grande + 3 anillos escalonados + rayos + chispas + pequeñas explosiones en cadena
//    · jefe          : lo anterior pero enorme: 4 anillos, rayos, destello de pantalla y una cadena larga de explosiones
//  Y se reducen mucho los fragmentos de píxel (menos partículas). Se engancha a createExplosion(), así que no hace falta
//  tocar nada más. Ajustes rápidos: DeathFX.cfg (ver abajo). Prueba desde consola: DeathFX.test(1|2|3)
// ============================================================================
(function () {
    'use strict';
    if (typeof createExplosion !== 'function') return;
    const TAU = Math.PI * 2, C = Math.cos, S = Math.sin, rnd = (a, b) => a + Math.random() * (b - a);
    const cfg = { shardsEnemy: 0.2, shardsMini: 45, shardsBoss: 90, sparks: 1 };   // fragmentos de píxel que se conservan · multiplicador de chispas
    const out = k => 1 - Math.pow(1 - k, 3);
    const low = () => { try { return !!performanceMode; } catch (e) { return false; } };

    class FX {
        constructor(o) { Object.assign(this, o); this.t = -(o.delay || 0); this.life = 1; this.x = o.x; this.y = o.y; }
        update() {
            this.t++; if (this.t >= this.dur) { this.life = 0; return; }
            if (this.t > 0 && this.vx !== undefined) { this.x += this.vx; this.y += this.vy; this.vx *= 0.93; this.vy *= 0.93; this.rot += this.vr; }
            if (this.t > 0 && this.tick) this.tick(this);
        }
        draw() {
            if (this.t < 0 || this.life <= 0) return; const g = ctx, k = this.t / this.dur; g.save(); g.globalCompositeOperation = 'lighter';
            switch (this.kind) {
                case 'flash': {
                    const r = this.r * (0.35 + 0.65 * out(k)), a = Math.pow(1 - k, 1.5), gr = g.createRadialGradient(this.x, this.y, 0, this.x, this.y, r);
                    gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(0.45, this.col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.globalAlpha = a; g.fillStyle = gr; g.beginPath(); g.arc(this.x, this.y, r, 0, TAU); g.fill(); break;
                }
                case 'ring': {
                    const r = this.r0 + (this.r1 - this.r0) * out(k), a = 1 - k * k; g.strokeStyle = this.col;
                    g.globalAlpha = a * 0.28; g.lineWidth = this.w * 2.6 * (1 - k) + 2; g.beginPath(); g.arc(this.x, this.y, r, 0, TAU); g.stroke();
                    g.globalAlpha = a; g.lineWidth = this.w * (1 - k) + 0.8; g.beginPath(); g.arc(this.x, this.y, r, 0, TAU); g.stroke(); break;
                }
                case 'rays': {
                    const L = this.r1 * out(k), a = Math.pow(1 - k, 1.3); g.fillStyle = this.col; g.globalAlpha = a;
                    for (let i = 0; i < this.n; i++) { const an = this.rot + i * TAU / this.n + k * 0.25, w = 0.05 * (1 - k * 0.6); g.beginPath(); g.moveTo(this.x + C(an) * L * 0.12, this.y + S(an) * L * 0.12); g.lineTo(this.x + C(an - w) * L, this.y + S(an - w) * L); g.lineTo(this.x + C(an + w) * L, this.y + S(an + w) * L); g.closePath(); g.fill(); }
                    break;
                }
                case 'spark': {
                    const s = this.s * (1 - k * 0.55), a = 1 - k * k; g.translate(this.x, this.y); g.rotate(this.rot); g.globalAlpha = a;
                    g.fillStyle = this.col; g.beginPath(); g.moveTo(0, -s * 1.6); g.lineTo(s * 0.45, 0); g.lineTo(0, s * 1.6); g.lineTo(-s * 0.45, 0); g.closePath(); g.fill();
                    g.rotate(Math.PI / 2); g.beginPath(); g.moveTo(0, -s); g.lineTo(s * 0.32, 0); g.lineTo(0, s); g.lineTo(-s * 0.32, 0); g.closePath(); g.fill();
                    g.fillStyle = '#fff'; g.globalAlpha = a * 0.9; g.beginPath(); g.arc(0, 0, s * 0.3, 0, TAU); g.fill(); break;
                }
                case 'screen': {
                    g.globalAlpha = this.a * Math.pow(1 - k, 2); g.fillStyle = '#fff'; g.fillRect(-60, -60, playAreaW + 120, playAreaH + 120); break;
                }
            }
            g.restore();
        }
    }
    const add = o => { particles.push(new FX(o)); };
    function sparks(x, y, col, n, v0, v1, s0, s1, dur, delay) {
        n = Math.max(2, Math.round(n * cfg.sparks * (low() ? 0.5 : 1)));
        for (let i = 0; i < n; i++) { const a = rnd(0, TAU) , v = rnd(v0, v1); add({ kind: 'spark', x, y, vx: C(a) * v, vy: S(a) * v, rot: rnd(0, TAU), vr: rnd(-0.18, 0.18), s: rnd(s0, s1), col: i % 3 === 0 ? '#fff' : col, dur: dur + Math.round(rnd(-4, 8)), delay }); }
    }
    function small(x, y, col, sc, delay) {
        sc = sc || 1; delay = delay || 0;
        add({ kind: 'flash', x, y, r: 18 * sc, col, dur: 9, delay });
        add({ kind: 'ring', x, y, r0: 4 * sc, r1: 46 * sc, w: 3.2, col, dur: 22, delay });
        add({ kind: 'ring', x, y, r0: 2 * sc, r1: 27 * sc, w: 2, col: '#fff', dur: 15, delay: delay + 2 });
        sparks(x, y, col, 5, 2.6 * sc, 5.2 * sc, 3.4 * sc, 5 * sc, 26, delay);
    }
    function burst(x, y, col, tier) {
        const sc = Math.max(0.7, Math.min(1.25, Math.min(playAreaW, playAreaH) / 560));
        if (tier === 1) { small(x, y, col, 1); return; }
        if (tier === 2) {   // MINI JEFE
            add({ kind: 'screen', a: 0.2, dur: 16 });   // v60: más suave (antes 0.45 en 9 cuadros)
            add({ kind: 'flash', x, y, r: 80 * sc, col, dur: 20 });
            [[0, 175, 6, col], [6, 250, 4, '#fff'], [14, 320, 3, col]].forEach(a => add({ kind: 'ring', x, y, r0: 10, r1: a[1] * sc, w: a[2], col: a[3], dur: 30, delay: a[0] }));
            add({ kind: 'rays', x, y, r1: 210 * sc, n: 10, rot: rnd(0, TAU), col: '#fff', dur: 28 });
            sparks(x, y, col, 16, 4, 9.5, 6 * sc, 10 * sc, 42, 0);
            for (let i = 0; i < 6; i++) small(x + rnd(-44, 44) * sc, y + rnd(-34, 34) * sc, col, 0.9, 4 + i * 5);
            return;
        }
        add({ kind: 'screen', a: 0.28, dur: 30 });  // JEFE · v60: antes 0.8 en 18 cuadros (blanco casi total); ahora tenue y lento, apto para fotosensibles
        add({ kind: 'flash', x, y, r: 150 * sc, col, dur: 26 });
        [[0, 270, 8], [8, 370, 6], [17, 460, 4], [27, 560, 3]].forEach((a, i) => add({ kind: 'ring', x, y, r0: 12, r1: a[1] * sc, w: a[2], col: i % 2 ? '#fff' : col, dur: 38, delay: a[0] }));
        add({ kind: 'rays', x, y, r1: 340 * sc, n: 14, rot: rnd(0, TAU), col: '#fff', dur: 34 });
        add({ kind: 'rays', x, y, r1: 250 * sc, n: 9, rot: rnd(0, TAU), col, dur: 40, delay: 8 });
        sparks(x, y, col, 30, 5, 12, 7 * sc, 12 * sc, 52, 0);
        for (let i = 0; i < 14; i++) small(x + rnd(-80, 80) * sc, y + rnd(-60, 60) * sc, i % 2 ? col : '#ffd23a', 1.15, 6 + i * 5);
    }
    const PASS = ['#0ff', '#8ff', '#00ffff'];
    const _ce = window.createExplosion;
    window.createExplosion = function (x, y, color, amount, isImpact) {
        if (amount === undefined) amount = 30;
        if (isImpact || amount < 14 || PASS.indexOf(color) >= 0) return _ce.apply(this, arguments);
        try { if (typeof player !== 'undefined' && player && color === player.color && amount <= 46) return _ce.apply(this, arguments); } catch (e) {}   // golpe a TU nave: se queda como estaba
        const tier = amount >= 350 ? 3 : (amount >= 150 ? 2 : 1), keep = tier === 3 ? cfg.shardsBoss : (tier === 2 ? cfg.shardsMini : Math.max(5, Math.round(amount * cfg.shardsEnemy)));
        const r = _ce.call(this, x, y, color, keep, false);
        try { burst(x, y, color, tier); } catch (e) { console.warn('DeathFX', e); }
        return r;
    };
    window.DeathFX = { cfg, burst, test(t) { burst(playAreaW / 2, playAreaH * 0.35, ['#4fd8ff', '#fa0', '#f33'][(t || 1) - 1], t || 1); } };
})();
