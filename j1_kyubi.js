/* ===== jefes/j1_kyubi.js ===== */
// ============================================================================================
//  NIVEL 1 · KYŪBI, ZORRO DE NUEVE COLAS  (Campos de Sakura)
//  Identidad: kitsune. Fuegos fatuos, hojas que se transforman, ilusiones, santuario Inari y nueve colas.
//  Sprites propios: fuego fatuo, hoja kitsune, bola de fuego, ofuda, pétalo, cola, torii, máscara de zorro.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, spr, P, shot, beam, hazard, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, sfx } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    // ------------------------------------------------------------------ sprites
    def('k_fire', 11, 14, (g, f) => {                          // hitodama / kitsune-bi (2 cuadros)
        const t = f ? 1 : 0;
        P.p(g, [5.5, t, 10, 8, 8.5, 13, 2.5, 13, 1, 8], '#2f5fe0');
        P.p(g, [5.5, 3 + t, 8.5, 8.5, 7.5, 12, 3.5, 12, 2.5, 8.5], '#72d0ff');
        P.e(g, 5.5, 9.5, 1.8, 2.8, '#ffffff');
    }, 2);
    def('k_leaf', 11, 9, (g) => {                              // hoja mágica del zorro
        P.e(g, 5.5, 4.5, 5, 3.2, '#4fb04a', -0.35); P.e(g, 5.5, 4.5, 3.4, 1.7, '#9aea82', -0.35); P.l(g, 1, 7, 10, 2, '#2a7a30', 1);
    });
    def('k_fball', 15, 13, (g) => {                            // bola de fuego con cola (apunta a la derecha)
        P.p(g, [0, 6.5, 6, 2, 6, 11], '#d2461a'); P.c(g, 9, 6.5, 5, '#ff7a1a'); P.c(g, 9, 6.5, 3.3, '#ffcf4a'); P.c(g, 9.5, 6.5, 1.7, '#ffffff');
    });
    def('k_petal', 9, 9, (g) => {                              // pétalo de sakura
        P.e(g, 4.5, 4.5, 4, 3, '#ff9ecb', 0.6); P.e(g, 5, 4, 2.2, 1.4, '#ffd9ea', 0.6);
    });
    def('k_tail', 17, 9, (g) => {                              // punta de cola (blanca al final)
        P.e(g, 7.5, 4.5, 7.5, 3.6, '#ff9a2a'); P.e(g, 7, 5.6, 6, 2, '#d9701a'); P.e(g, 6, 3.2, 4, 1.1, '#ffd58a'); P.e(g, 13.5, 4.5, 3.5, 3, '#fff6e8');
    });
    def('k_mask', 23, 21, (g) => {                             // máscara de zorro (clones)
        P.p(g, [2, 0, 8, 6, 15, 6, 21, 0, 22, 10, 17, 19, 11.5, 21, 6, 19, 1, 10], '#f6f0e8');
        P.p(g, [3, 2, 7, 5, 4, 8], '#d02030'); P.p(g, [20, 2, 16, 5, 19, 8], '#d02030');
        P.p(g, [5, 9, 10, 10.5, 5, 12.5], '#d02030'); P.p(g, [18, 9, 13, 10.5, 18, 12.5], '#d02030');
        P.r(g, 10.5, 14, 2, 2, '#2a1a1a'); P.l(g, 3, 14, 7, 15, '#d02030', 1); P.l(g, 20, 14, 16, 15, '#d02030', 1); P.p(g, [8, 17, 15, 17, 11.5, 20], '#d02030');
    });
    def('k_torii', 17, 13, (g) => {                            // portón torii
        P.r(g, 0, 1, 17, 2, '#1c1018'); P.r(g, 1, 0, 15, 2, '#e0301c'); P.r(g, 2, 4, 13, 2, '#e0301c'); P.r(g, 3, 4, 2, 9, '#e0301c'); P.r(g, 12, 4, 2, 9, '#e0301c');
    });

    // ------------------------------------------------------------------ ayudas
    const FIRE = { anim: 8, glow: '#7ad0ff', hit: 7, sc: 3, rot: 'none' };
    const leafUpd = (sp, delay) => b => {                       // la hoja parpadea y se transforma en bola de fuego apuntada
        if (b.age > delay - 16 && b.age < delay) b.alpha = (b.age % 4 < 2) ? 0.4 : 1;
        if (b.age === delay) {
            b.alpha = 1; b.ub = 'k_fball'; b.rotm = 'vel'; b.glow = '#ff9a3a'; b.hit = 8; b.sc = 3; b.anim = 0;
            const a = Math.atan2(pcy() - b.y, pcx() - b.x); b.vx = C(a) * sp; b.vy = S(a) * sp;
            createExplosion(b.x, b.y, '#ffcf8a', 5, true); sfx(760, 300, 0.08, 'triangle', 0.03);
        }
    };

    // ------------------------------------------------------------------ spell cards
    const attacks = [
        {   // 1 · fuegos fatuos que serpentean
            id: 'fuegos', name: 'PROCESION DE FUEGOS FATUOS', jp: '狐火「鬼火の行列」', minPhase: 1, dur: 230,
            line: 'Sigan las lucecitas... si se atreven.',
            tick(b, H, t) {
                const per = H.iv(24);
                if (t % per === 0) {
                    const n = Math.max(3, H.n(6)), ph = (Math.floor(t / per) % 2) ? PI : 0;
                    for (let k = 0; k < n; k++) {
                        const a = H.ang + (k - (n - 1) / 2) * 0.17, p = ph + k * 0.9;
                        H.shot(a, H.sp(0.52), 'k_fire', Object.assign({}, FIRE, { upd: bb => { bb.curve = S(bb.age * 0.11 + p) * 0.038; } }));
                    }
                }
            }
        },
        {   // 2 · hojas que se transforman en bolas de fuego
            id: 'hojas', name: 'ILUSION DE HOJAS', jp: '化符「葉っぱの化かし」', minPhase: 1, dur: 250,
            line: '¿Hojas? ¡Claro que son hojas! ...hasta que dejan de serlo.',
            tick(b, H, t) {
                if (t % H.iv(34) === 1 && t < 190) {
                    const n = Math.max(4, H.n(8));
                    for (let k = 0; k < n; k++) {
                        const x = 30 + (PW() - 60) * (k + rnd() * 0.6) / n, delay = 52 + (k % 3) * 15;
                        H.shot(PI / 2 + rr(-0.12, 0.12), H.sp(0.26), 'k_leaf', { rot: 'spin', spin: rr(-0.16, 0.16), a0: rnd() * 6, hit: 6, upd: leafUpd(H.sp(0.78), delay) }, x, -8);
                    }
                }
            }
        },
        {   // 3 · pilares de fuego bajo los torii
            id: 'torii', name: 'MIL PORTONES TORII', jp: '稲荷「千本鳥居」', minPhase: 2, dur: 290,
            line: 'Crucen por la puerta del santuario. Despacito.',
            tick(b, H, t) {
                if ([1, 80, 160, 240].includes(t)) {
                    const gap = clamp(H.px + rr(-140, 140), 110, PW() - 110), warn = H.tele + 14;
                    for (let x = 48; x < PW(); x += 96) {
                        if (Math.abs(x - gap) < 74) continue;
                        beam({ x, y: 0, a: PI / 2, len: PH(), w: 46, warn, on: 24, col: '#ff5a1a', col2: '#fff0c0',
                            cap: h => { const k = Math.min(1, h.t / 20); spr('k_torii', h.x, 18, 3, 0, k); } });
                    }
                }
                if (t % H.iv(30) === 0) H.shot(PI / 2, H.sp(0.24), 'k_petal', { rot: 'spin', spin: 0.12, hit: 5 }, rr(30, PW() - 30), -8);
            }
        },
        {   // 4 · clones-máscara que disparan a la vez (¿cuál es el real?)
            id: 'sombras', name: 'DANZA DE SOMBRAS', jp: '分身「影分身の舞」', minPhase: 2, dur: 280,
            line: '¿Cuál soy yo? Ninguna... o todas.',
            tick(b, H, t) {
                b._alpha = t < 20 ? 1 - 0.65 * t / 20 : 0.35;
                if (t === 1) {
                    H.blink();
                    const per = H.iv(26), sp = H.sp(0.6);
                    [0.17, 0.5, 0.83].forEach((fx, i) => {
                        hazard({ x: PW() * fx, y: i === 1 ? 105 : 150, life: 262, off: i * Math.floor(per / 3), flash: 0,
                            update(h) {
                                const tt = h.t - 34;
                                if (tt > 0 && (tt + h.off) % per === 0) {
                                    h.flash = 10; const a = Math.atan2(pcy() - h.y, pcx() - h.x);
                                    for (let k = -1; k <= 1; k++) shot(h.x, h.y, a + k * 0.24, sp, 'k_fball', { glow: '#ff9a3a', hit: 7 });
                                    sfx(520, 260, 0.07, 'triangle', 0.025);
                                }
                                if (h.flash > 0) h.flash--;
                            },
                            draw(h) {
                                const a = Math.min(1, h.t / 26) * Math.min(1, (h.life - h.t) / 18);
                                spr('k_mask', h.x, h.y + S(h.t * 0.06 + h.off) * 4, 2.2, 0, a * 0.95);
                                if (h.flash > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = h.flash / 10 * 0.8; spr('k_mask', h.x, h.y, 2.2, 0, 1); ctx.restore(); }
                            } });
                    });
                }
                if (t > 40 && t % H.iv(64) === 0) H.ring(H.n(8), t * 0.1, H.sp(0.36), 'k_fire', FIRE);
            }
        },
        {   // 5 · ESPECIAL: las nueve colas
            id: 'nuevecolas', name: 'ATAQUE DE NUEVE COLAS', jp: '九尾「天狐九尾乱舞」', minPhase: 3, sp: true, sig: true, dur: 320,
            line: 'Nueve colas... ¡y todas quieren bailar contigo!',
            tick(b, H, t) {
                const dir = t < 160 ? 1 : -1;
                b._ta = (b._ta || 0) + dir * 0.03;
                if (t % H.iv(14) === 0) for (let i = 0; i < 9; i++) H.shot(b._ta + TAU / 9 * i, H.sp(0.5), 'k_tail', { hit: 7, sc: 2, curve: 0.011 * dir, glow: '#ffb347' });
                if (t % H.iv(60) === 30) H.ring(H.n(10), t * 0.07, H.sp(0.36), 'k_fire', FIRE);
            }
        },
        {   // 6 · ÚLTIMA PALABRA: ventisca de pétalos con un carril en calma
            id: 'sakura', name: 'VENTISCA DE SAKURA', jp: '狐符「桜吹雪の化身」', minPhase: 3, lw: true, dur: 300,
            line: 'Sakura Eterna... ¡no se marchita jamás!',
            tick(b, H, t) {
                const dir = (Math.floor(t / 110) % 2) ? -1 : 1, K = H.K, gapY = PH() * 0.58 + S(t * 0.022) * PH() * 0.2;
                if (t % H.iv(5) === 0) {
                    const y = rr(60, PH() - 70);
                    if (Math.abs(y - gapY) > 82) {
                        const ph = rnd() * 6;
                        shot(dir > 0 ? -10 : PW() + 10, y, dir > 0 ? 0 : PI, H.sp(0.42) * rr(0.85, 1.2), 'k_petal', { rot: 'spin', spin: rr(0.1, 0.25), hit: 6, upd: bb => { bb.vy = S(bb.age * 0.07 + ph) * 1.3 * K; } });
                    }
                }
                if (t % H.iv(46) === 0) H.ring(H.n(12), t * 0.05, H.sp(0.4), 'k_fire', FIRE);
            }
        }
    ];

    J.register(0, {
        attacks,
        base(b, H, t) { if (t % H.iv(70) === 0) H.shot(H.ang, H.sp(0.55), 'k_fire', FIRE); }
    });
    J.names(0, 'ATAQUE DE NUEVE COLAS');
})();
