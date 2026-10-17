/* ===== jefes/j4_arana.js ===== */
// ============================================================================================
//  NIVEL 4 · REINA ARAÑA / MADRE ESPINA  (Bosque Encantado)
//  Identidad: araña (referencia Undertale: Muffet). Veneno que gotea, crías que se dispersan,
//  telarañas que ralentizan, hilos de seda y rayos de seda giratorios.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, P, shot, beam, zone, hazard, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('a_venom', 13, 11, (g) => { P.p(g, [13, 5.5, 8, 1.5, 3, 5.5, 8, 9.5], '#3cbf2a'); P.c(g, 5, 5.5, 4.6, '#4fe03a'); P.c(g, 4, 4, 1.6, '#d8ffc8'); P.r(g, 7, 7, 2, 1, '#1e7a1a'); });
    def('a_silk', 19, 5, (g) => { P.p(g, [0, 2.5, 5, 0.5, 19, 2.5, 5, 4.5], '#f2eaff'); P.r(g, 3, 2, 14, 1, '#b8a4e8'); });
    def('a_spider', 15, 13, (g, f) => {
        const o = f ? 1.5 : -1.5; P.c(g, 7.5, 7, 3.4, '#8a5ad0'); P.c(g, 7.5, 3.8, 2.2, '#8a5ad0'); P.r(g, 6, 3, 1, 1, '#ff3030'); P.r(g, 8, 3, 1, 1, '#ff3030'); P.r(g, 7, 8, 1, 2, '#c01818');
        for (let i = 0; i < 4; i++) { const y = 3.5 + i * 2.3; P.l(g, 6, y, 1, y + o * (i % 2 ? -1 : 1) + 1, '#b08af0', 1.2); P.l(g, 9, y, 14, y - o * (i % 2 ? -1 : 1) + 1, '#b08af0', 1.2); }
    }, 2);
    def('a_cocoon', 15, 19, (g) => { P.e(g, 7.5, 9.5, 6.4, 8.6, '#f4efff'); for (let y = 3; y < 17; y += 3) P.l(g, 2, y, 13, y + 1.5, '#b8a4e8', 1); P.l(g, 4, 3, 11, 16, '#cfc2f0', 1); P.c(g, 5, 5, 1.4, '#fff'); });
    def('a_hour', 11, 15, (g) => { P.p(g, [1, 0, 10, 0, 6, 7, 10, 14, 1, 14, 5, 7], '#e0e0ec'); P.p(g, [2, 1, 9, 1, 5.5, 5], '#d01830'); P.p(g, [3, 13, 8, 13, 5.5, 9.5], '#d01830'); P.r(g, 0, 0, 11, 1, '#2a1a3a'); P.r(g, 0, 14, 11, 1, '#2a1a3a'); });

    const VEN = { glow: '#6dff4a', hit: 7, sc: 2 };
    const SILK = { glow: '#d8c8ff', hit: 5, sc: 2 };
    const babyUpd = sp => bb => { if (bb.age % 20 === 0) { const a = Math.atan2(bb.vy, bb.vx) + rr(-0.9, 0.9); bb.vx = C(a) * sp; bb.vy = S(a) * sp; } };

    const attacks = [
        {   // 1 · gotas de veneno en arco
            id: 'veneno', name: 'GOTAS DE VENENO', jp: '毒符「滴る猛毒」', minPhase: 1, dur: 240,
            line: 'Pica, pica... ¡y gotea!',
            tick(b, H, t) {
                if (t % H.iv(9) === 0) {
                    const x = b.x + rr(0.15, 0.85) * b.width;
                    H.shot(-PI / 2 + rr(-0.9, 0.9), H.sp(0.62), 'a_venom', Object.assign({}, VEN, { grav: 0.055 * H.K, rot: 'vel' }), x, H.cy);
                }
            }
        },
        {   // 2 · crías en estampida
            id: 'crias', name: 'CRIAS EN ESTAMPIDA', jp: '蜘蛛「蜘蛛の子を散らす」', minPhase: 1, dur: 260,
            line: '¡Mis bebés! ¡Salúdenlos... de cerca!',
            tick(b, H, t) {
                if (t % H.iv(60) === 1 && t < 200) {
                    const n = Math.max(5, H.n(9)), sp = H.sp(0.5);
                    H.shot(H.ang, H.sp(0.5), 'a_cocoon', { sc: 2, hit: 9, glow: '#d8c8ff', rot: 'fix', a0: 0,
                        upd: bb => { if (bb.age === 58) { for (let i = 0; i < n; i++) { const a = i * TAU / n + rnd(); shot(bb.x, bb.y, a, sp, 'a_spider', { sc: 2, hit: 7, anim: 6, upd: babyUpd(sp), life: 240 }); } createExplosion(bb.x, bb.y, '#f4efff', 8, true); kill(bb); } } });
                }
            }
        },
        {   // 3 · telarañas pegajosas
            id: 'telarana', name: 'TELARANA PEGAJOSA', jp: '罠「蜘蛛の巣の罠」', minPhase: 2, dur: 290,
            line: 'Te quedarás un ratito... ¡toda la eternidad!',
            tick(b, H, t) {
                if (t === 1 || t === 130) for (let i = 0; i < 3; i++) {
                    const x = clamp(H.px + (i - 1) * 190 + rr(-40, 40), 80, PW() - 80), y = clamp(H.py - 40 + rr(-90, 30), 200, PH() - 90);
                    zone({ x, y, r: 88, warn: 40, life: 150, fx: 'slow', pow: 0.5, col: '#e6dcff',
                        draw: h => { const k = Math.min(1, h.t / h.warn); ctx.save(); ctx.strokeStyle = '#f2eaff'; ctx.globalAlpha = 0.8 * Math.min(1, (h.life - h.t) / 15); ctx.lineWidth = 1.5;
                            for (let i2 = 0; i2 < 8; i2++) { const a = i2 * PI / 4; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(h.x + C(a) * h.r * k, h.y + S(a) * h.r * k); ctx.stroke(); }
                            for (let r = 1; r <= 3; r++) { ctx.beginPath(); for (let i2 = 0; i2 <= 8; i2++) { const a = i2 * PI / 4, rr2 = h.r * k * r / 3 * (i2 % 2 ? 0.92 : 1); ctx[i2 ? 'lineTo' : 'moveTo'](h.x + C(a) * rr2, h.y + S(a) * rr2); } ctx.stroke(); } ctx.restore(); } });
                }
                if (t > 40 && t % H.iv(28) === 0) H.fan(H.ang, 0.32, 3, H.sp(0.8), 'a_silk', SILK);
            }
        },
        {   // 4 · cortinas de hilos
            id: 'hilos', name: 'CORTINA DE HILOS', jp: '糸繰「絹の格子」', minPhase: 2, dur: 280,
            line: '¿Un hueco? Ah, sí... uno pequeñito.',
            tick(b, H, t) {
                if (t % H.iv(46) === 1 && t < 230) {
                    const dir = (Math.floor(t / H.iv(46)) % 2) ? -1 : 1, gapY = clamp(H.py + rr(-110, 110), 150, PH() - 130);
                    H.wave(dir, gapY, 150, H.sp(0.62), 'a_silk', Object.assign({}, SILK, { roff: 0 }), 34);
                }
                if (t % H.iv(60) === 20) H.shot(H.ang, H.sp(0.6), 'a_hour', { hit: 7, sc: 2, glow: '#ff3a50' });
            }
        },
        {   // 5 · ESPECIAL: rayos de seda giratorios
            id: 'seda', name: 'SEDA MORTAL', jp: '女王「死を呼ぶ絹の輪」', minPhase: 3, sp: true, sig: true, dur: 330,
            line: 'Seis hilos. Un solo baile. ¡Sígueme el ritmo!',
            tick(b, H, t) {
                if (t === 1) {
                    const dir = rnd() < 0.5 ? 1 : -1;
                    for (let i = 0; i < 6; i++) beam({ x: H.cx, y: H.cy, a: i * PI / 3, len: 440, w: 15, warn: H.tele + 20, on: 238, rv: dir * 0.0055, col: '#c8b4ff', col2: '#ffffff', snd: i === 0,
                        follow: h => { h.x = b.x + b.width / 2; h.y = b.y + b.height / 2; } });
                }
                if (t > H.tele && t % H.iv(34) === 0) H.shot(H.aim(H.cx, H.cy) + rr(-0.5, 0.5), H.sp(0.5), 'a_spider', { sc: 2, hit: 7, anim: 6, upd: babyUpd(H.sp(0.5)), life: 220 });
            }
        },
        {   // 6 · ÚLTIMA PALABRA: vals de la viuda negra (deja un rastro de seda que cae)
            id: 'viuda', name: 'VALS DE LA VIUDA NEGRA', jp: '黒蜘蛛「黒後家蜘蛛の円舞曲」', minPhase: 3, lw: true, dur: 320,
            line: '¿Bailamos? Yo guío... y tú caes.',
            tick(b, H, t) {
                H.dash(5.5);
                if (t % H.iv(8) === 0) shot(H.cx, H.cy + 24, PI / 2, 0.05, 'a_silk', Object.assign({}, SILK, { fz: 52, rot: 'fix', a0: PI / 2, onThaw: bb => { bb.vx = 0; bb.vy = H.sp(0.85); bb.rotm = 'vel'; } }));
                if (t % H.iv(46) === 20) H.fan(H.ang, 0.5, H.n(7), H.sp(0.65), 'a_hour', { hit: 7, sc: 2, glow: '#ff3a50' });
            }
        }
    ];
    J.register(3, { attacks, base(b, H, t) { if (t % H.iv(60) === 0) H.shot(H.ang, H.sp(0.6), 'a_silk', SILK); } });
    J.names(3, 'SEDA MORTAL');
})();
