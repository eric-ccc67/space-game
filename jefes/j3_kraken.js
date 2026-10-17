/* ===== jefes/j3_kraken.js ===== */
// ============================================================================================
//  NIVEL 3 · KRAKEN ESPECTRAL / LA DAMA DEL LAGO  (Lago Espectral)
//  Identidad: fantasma del mar. Burbujas que revientan, tentáculos desde el fondo, remolino que atrae,
//  anclas fantasma que hacen olas, tinta que oculta y la gran marejada.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, P, shot, beam, zone, hazard, ink, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('u_bubble', 15, 15, (g) => { P.c(g, 7.5, 7.5, 7, '#59e6d0'); P.c(g, 7.5, 7.5, 5.2, '#0f5f6e'); P.c(g, 7.5, 7.5, 4, '#1b8a96'); P.r(g, 3, 3, 3, 2, '#e6fffb'); P.r(g, 3, 5, 1, 1, '#e6fffb'); P.r(g, 10, 10, 1, 1, '#9ff5e8'); });
    def('u_gf', 11, 14, (g, f) => { const t = f ? 1 : 0; P.p(g, [5.5, t, 10, 8, 8.5, 13, 2.5, 13, 1, 8], '#1fb8a8'); P.p(g, [5.5, 3 + t, 8.5, 8.5, 7.5, 12, 3.5, 12, 2.5, 8.5], '#8ffbe0'); P.c(g, 4, 8, 1, '#0a2a30'); P.c(g, 7, 8, 1, '#0a2a30'); }, 2);
    def('u_ink', 13, 13, (g) => { P.c(g, 6.5, 6.5, 5.5, '#2b1048'); P.c(g, 3.5, 4, 2.5, '#2b1048'); P.c(g, 10, 9, 2.5, '#2b1048'); P.c(g, 5, 5, 1.6, '#8a5cc8'); P.r(g, 8, 4, 1, 1, '#b48ae8'); });
    def('u_anchor', 21, 25, (g) => {
        P.r(g, 9, 3, 3, 17, '#9db0a8'); P.r(g, 5, 7, 11, 3, '#9db0a8'); P.c(g, 10.5, 3, 3, '#cfe0d8'); P.c(g, 10.5, 3, 1.2, '#2a4a40');
        P.a(g, 10.5, 15, 8, 0.15, PI - 0.15, '#9db0a8', 3); P.p(g, [1, 14, 5, 16, 1, 20], '#cfe0d8'); P.p(g, [20, 14, 16, 16, 20, 20], '#cfe0d8'); P.r(g, 9, 4, 1, 14, '#e6f2ec');
    });
    def('u_wave', 19, 11, (g) => { P.e(g, 9.5, 6, 9, 4.2, '#2cc8c0'); P.e(g, 11, 4, 6, 3.2, '#8ff5ea'); P.p(g, [14, 0, 19, 4, 14, 5], '#e8fffb'); P.r(g, 3, 8, 12, 2, '#168f98'); });

    const BUB = { glow: '#59e6d0', hit: 7, sc: 2, rot: 'none' };
    const GF = { anim: 8, glow: '#8ffbe0', hit: 7, sc: 3, rot: 'none' };
    const INK = { glow: '#8a5cc8', hit: 7, sc: 3, rot: 'spin', spin: 0.06 };

    const attacks = [
        {   // 1 · burbujas que revientan
            id: 'burbujas', name: 'BURBUJAS FANTASMA', jp: '水符「ゴースト・バブル」', minPhase: 1, dur: 240,
            line: 'Glu glu... ¡no las pinches!',
            tick(b, H, t) {
                if (t % H.iv(34) === 0) {
                    const n = Math.max(3, H.n(4)), delay = 62 + rnd() * 20;
                    for (let k = 0; k < n; k++) {
                        const a = PI / 2 + (k - (n - 1) / 2) * 0.42 + rr(-0.1, 0.1);
                        shot(H.cx, H.cy, a, H.sp(0.4), 'u_bubble', { glow: '#59e6d0', hit: 8, sc: 3, rot: 'none', grav: 0.008 * H.K,
                            upd: bb => { if (bb.age === Math.round(delay + k * 4)) { for (let i = 0; i < 5; i++) shot(bb.x, bb.y, i * TAU / 5 + bb.age, H.sp(0.36), 'u_bubble', BUB); kill(bb); } } });
                    }
                }
            }
        },
        {   // 2 · tentáculos que golpean desde el fondo
            id: 'tentaculos', name: 'LATIGAZO DE TENTACULOS', jp: '触手「深海の鞭」', minPhase: 1, dur: 270,
            line: 'Mis brazos... ¡son MUCHOS brazos!',
            tick(b, H, t) {
                if ([1, 62, 124, 186].includes(t)) {
                    const warn = H.tele + 14;
                    beam({ x: clamp(H.px, 40, PW() - 40), y: PH(), a: -PI / 2, len: PH() + 20, w: 56, warn, on: 20, col: '#2fd0b8', col2: '#e8fffb',
                        track: h => { if (h.t < h.warn - 18) h.x += (pcx() - h.x) * 0.09; },
                        onFire: h => { for (let i = 0; i < 7; i++) shot(h.x, PH() * 0.38, -PI * (0.1 + 0.8 * i / 6) - 0 + PI, H.sp(0.4), 'u_bubble', BUB); } });
                }
            }
        },
        {   // 3 · remolino que atrae
            id: 'remolino', name: 'MAELSTROM', jp: '渦符「メイルストロム」', minPhase: 2, dur: 270,
            line: 'Ven, ven... el fondo te espera.',
            tick(b, H, t) {
                if (t === 1) {
                    const x = PW() / 2, y = PH() * 0.5;
                    zone({ x, y, r: 170, warn: 30, life: 262, fx: 'pull', pow: 0.75 * Math.min(1.2, H.K), col: '#2fd0b8' });
                    zone({ x, y, r: 26, warn: 40, life: 262, fx: 'hurt', col: '#0a3a44' });
                }
                if (t % H.iv(12) === 0) { b._sp = (b._sp || 0) + 0.2; for (let i = 0; i < 4; i++) H.shot(b._sp + i * PI / 2, H.sp(0.42), 'u_gf', GF); }
                if (t % H.iv(70) === 30) H.fan(H.ang, 0.3, 3, H.sp(0.7), 'u_ink', INK);
            }
        },
        {   // 4 · anclas fantasma que hacen olas
            id: 'ancla', name: 'ANCLA FANTASMA', jp: '錨符「ゴースト・アンカー」', minPhase: 2, dur: 290,
            line: '¿Alguien pidió anclar?',
            tick(b, H, t) {
                if (t % H.iv(60) === 1 && t < 250) {
                    const x = clamp(H.px + rr(-40, 40), 30, PW() - 30);
                    shot(x, 26, PI / 2, 0.1, 'u_anchor', { fz: H.tele, acc: 0.22 * H.K, vmin: 0.1, vmax: H.sp(1.7), hit: 18, sc: 3, rot: 'vel', roff: -PI / 2, glow: '#8ffbe0',
                        extra: bb => { if (bb.fz > 0) { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#8ffbe0'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(bb.x, bb.y + 28); ctx.lineTo(bb.x, PH() - 40); ctx.stroke(); } },
                        upd: bb => { if (bb.y > PH() - 56) { for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 2; k++) shot(bb.x + s * 18, PH() - 34 - k * 34, s > 0 ? 0 : PI, H.sp(0.55 + k * 0.12), 'u_wave', { hit: 8, sc: 2, glow: '#8ff5ea' }); H.shake(8); kill(bb); } } });
                }
            }
        },
        {   // 5 · ESPECIAL: tinta que oculta + tentáculos laterales
            id: 'furia', name: 'FURIA DEL KRAKEN', jp: '海魔「深淵の墨と触手」', minPhase: 3, sp: true, sig: true, dur: 330,
            line: '¡No me ves? Perfecto. ¡Yo a ti sí!',
            tick(b, H, t) {
                if (t % H.iv(66) === 1) shot(H.cx, H.cy, H.ang + rr(-0.5, 0.5), H.sp(0.5), 'u_ink', Object.assign({}, INK, { upd: bb => { if (bb.age === 48) { ink(bb.x, bb.y, 105, 270); for (let i = 0; i < 8; i++) shot(bb.x, bb.y, i * TAU / 8, H.sp(0.35), 'u_ink', INK); kill(bb); } } }));
                if (t % 100 === 40) { const y = clamp(H.py, 140, PH() - 80), left = (Math.floor(t / 100) % 2) === 0;
                    beam({ x: left ? 0 : PW(), y, a: left ? 0 : PI, len: PW() + 20, w: 54, warn: H.tele + 14, on: 20, col: '#2fd0b8', col2: '#e8fffb', track: h => { if (h.t < h.warn - 18) h.y += (pcy() - h.y) * 0.08; } }); }
                if (t % H.iv(40) === 0) H.shot(PI / 2 + rr(-1.2, 1.2), H.sp(0.5), 'u_gf', GF);
            }
        },
        {   // 6 · ÚLTIMA PALABRA: gran marejada (olas con hueco; la corriente: alma AZUL)
            id: 'marejada', name: 'GRAN MAREJADA', jp: '海嘯「亡霊の大津波」', minPhase: 3, lw: true, dur: 310,
            line: 'Las mareas no perdonan... ¡ni descansan!',
            tick(b, H, t) {
                if ([1, 76, 150, 224].includes(t)) {
                    const dir = (Math.floor(t / 75) % 2) ? -1 : 1, gapY = clamp(H.py + rr(-90, 90), 150, PH() - 150);
                    for (let k = 0; k < 2; k++) H.wave(dir, gapY, 170, H.sp(0.62 - k * 0.1), 'u_wave', { hit: 8, sc: 2, glow: '#8ff5ea', roff: 0 }, 38);
                }
                if (t % H.iv(18) === 0) H.shot(PI / 2 + rr(-0.9, 0.9), H.sp(0.45), 'u_bubble', Object.assign({}, BUB, { soul: 'blue' }));
                if (t === 1) { H.tint('#1a8a98', 0.12, 330); b._soulHint = 160; }
            }
        }
    ];
    J.register(2, { attacks, base(b, H, t) { if (t % H.iv(66) === 0) H.shot(H.ang, H.sp(0.5), 'u_gf', GF); } });
    J.names(2, 'FURIA DEL KRAKEN');
})();
