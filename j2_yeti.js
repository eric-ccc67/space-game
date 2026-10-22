/* ===== jefes/j2_yeti.js ===== */
// ============================================================================================
//  NIVEL 2 · REY YETI / SOBERANA GLACIAL  (Picos Helados)
//  Identidad: hielo y ventisca (referencia Touhou 6: Cirno). Carámbanos, bola de nieve que rebota y se parte,
//  "Congelación Perfecta" (balas que se paralizan y estallan), viento que empuja y frío que paraliza (alma AZUL).
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, P, shot, wind, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('y_flake', 15, 15, (g) => {
        for (let i = 0; i < 6; i++) {
            const a = i * PI / 3, x = 7.5 + C(a) * 6.5, y = 7.5 + S(a) * 6.5;
            P.l(g, 7.5, 7.5, x, y, '#e8fbff', 1.6);
            const bx = 7.5 + C(a) * 4, by = 7.5 + S(a) * 4;
            P.l(g, bx, by, bx + C(a + 0.9) * 2.4, by + S(a + 0.9) * 2.4, '#bfefff', 1.2); P.l(g, bx, by, bx + C(a - 0.9) * 2.4, by + S(a - 0.9) * 2.4, '#bfefff', 1.2);
        }
        P.c(g, 7.5, 7.5, 2, '#7fd8ff');
    });
    def('y_icicle', 19, 7, (g) => { P.p(g, [0, 0.5, 19, 3.5, 0, 6.5], '#6fcdf5'); P.p(g, [2, 1.6, 15, 3.3, 2, 3.4], '#eefcff'); P.p(g, [0, 4, 12, 4.2, 0, 6.4], '#3fa0d8'); });
    def('y_ball', 15, 15, (g) => { P.c(g, 7.5, 7.5, 7, '#e4f6ff'); P.e(g, 9, 9.5, 5.5, 4.8, '#a9d0ea'); P.c(g, 5.5, 5, 2.3, '#ffffff'); P.r(g, 4, 9, 2, 1, '#6d8fb0'); P.r(g, 10, 5, 1, 2, '#6d8fb0'); });
    def('y_shard', 11, 9, (g) => { P.p(g, [0, 4.5, 5, 0.5, 11, 4.5, 5, 8.5], '#9fe6ff'); P.p(g, [2, 4.5, 5, 2.5, 8, 4.5, 5, 6.5], '#ffffff'); });

    const FLAKE = { glow: '#a8e8ff', hit: 7, sc: 2, rot: 'spin', spin: 0.05 };
    const SHARD = { glow: '#bff6ff', hit: 6, sc: 2 };

    const attacks = [
        {   // 1 · carámbanos que aceleran al caer (aviso: se quedan colgando un instante)
            id: 'caramanos', name: 'CAIDA DE CARAMBANOS', jp: '氷符「アイシクルフォール」', minPhase: 1, dur: 240,
            line: 'Tengo mil carámbanos. ¡Todos para ti!',
            tick(b, H, t) {
                if (t % H.iv(15) === 0 && t < 200) {
                    const x = (Math.floor(t / H.iv(15)) % 3 === 0) ? clamp(H.px + rr(-30, 30), 20, PW() - 20) : rr(20, PW() - 20);
                    shot(x, 16, PI / 2, 0.1, 'y_icicle', { fz: 30, acc: 0.1 * H.K, vmin: 0.1, vmax: H.sp(1.5), hit: 6, sc: 3, glow: '#8fe0ff', icy: true });
                }
            }
        },
        {   // 2 · bola de nieve gigante que rebota y se parte
            id: 'bola', name: 'BOLA DE NIEVE GIGANTE', jp: '雪符「転がる大雪玉」', minPhase: 1, dur: 270,
            line: '¡Una bolita de nieve! ...bueno, bolota.',
            tick(b, H, t) {
                if (t === 1 || t === 120) {
                    const dir = t === 1 ? (H.px > H.cx ? 1 : -1) : -(b._bd || 1); b._bd = dir;
                    const K = Math.min(H.K, 1.2), n = H.n(8);
                    shot(H.cx, H.cy, PI / 2 - dir * 0.5, H.sp(0.38), 'y_ball', { rot: 'spin', spin: 0.07 * dir, sc: 3, hit: 36, grav: 0.034 * K, bounce: 3, bfloor: true, glow: '#dff4ff',
                        upd: bb => {
                            if (bb._pb !== undefined && bb.bounce < bb._pb) {
                                for (let i = 0; i < n; i++) { const a = -PI * (0.12 + 0.76 * i / (n - 1)); shot(bb.x, bb.y - 6, a, H.sp(0.42), 'y_shard', SHARD); }
                                if (bb.bounce === 0) kill(bb);
                            }
                            bb._pb = bb.bounce;
                        } });
                }
            }
        },
        {   // 3 · Congelación perfecta: las balas se paralizan y luego se rompen
            id: 'congelar', name: 'CONGELACION PERFECTA', jp: '凍符「パーフェクトフリーズ」', minPhase: 2, dur: 280,
            line: '¡Congelados! ¿Ves? Soy un genio.',
            tick(b, H, t) {
                if (t % H.iv(62) === 1) {
                    const n = Math.max(8, H.n(15)), a0 = rnd() * TAU, sp = H.sp(0.5), thawSp = H.sp(0.46);
                    for (let i = 0; i < n; i++) shot(H.cx, H.cy, a0 + TAU / n * i, sp, 'y_flake', Object.assign({}, FLAKE, {
                        life: 400, onThaw: bb => { bb.icy = false; const a = Math.atan2(pcy() - bb.y, pcx() - bb.x) + rr(-0.7, 0.7); bb.vx = C(a) * thawSp; bb.vy = S(a) * thawSp; },
                        upd: bb => { if (bb.age === 30) { bb.fz = 62; bb.icy = true; bb.vx = bb.vy = 0; createExplosion(bb.x, bb.y, '#dff6ff', 2, true); } } }));
                }
            }
        },
        {   // 4 · ventisca: viento que empuja + copos laterales
            id: 'viento', name: 'VIENTO DE VENTISCA', jp: '風雪「吹き荒ぶ白嵐」', minPhase: 2, dur: 300,
            line: '¿Sientes eso? ...es mi aliento.',
            tick(b, H, t) {
                if (t === 1 || t === 150) { const d = (t === 1 ? (rnd() < 0.5 ? 1 : -1) : -(b._wd || 1)); b._wd = d; wind({ dir: d, f: 0.85, warn: H.tele + 12, life: 145, col: '#dff4ff' }); }
                const d = b._wd || 1;
                if (t > H.tele && t % H.iv(9) === 0) shot(d > 0 ? -10 : PW() + 10, rr(60, PH() - 60), d > 0 ? 0 : PI, H.sp(0.55), 'y_flake', FLAKE);
            }
        },
        {   // 5 · ESPECIAL: rugido del rey y avalancha
            id: 'rugido', name: 'TORMENTA DEL REY YETI', jp: '雪王「氷河の咆哮」', minPhase: 3, sp: true, sig: true, dur: 320,
            line: '¡¡GROAAAR!! (Eso fue un rugido helado).',
            tick(b, H, t) {
                if (t === 1) H.tint('#aee6ff', 0.14, 300);
                if (t % H.iv(40) === 0) { H.shake(6); H.fan(H.ang, 0.5, H.n(9), H.sp(0.8), 'y_shard', SHARD); }
                if (t % H.iv(58) === 20) H.wave((Math.floor(t / 58) % 2) ? 1 : -1, clamp(H.py + rr(-80, 80), 140, PH() - 140), 150, H.sp(0.55), 'y_flake', FLAKE);
                if (t % H.iv(90) === 50) H.curtain(clamp(H.px + rr(-100, 100), 120, PW() - 120), 130, H.sp(0.6), 'y_icicle', { hit: 6, sc: 3, glow: '#8fe0ff' });
            }
        },
        {   // 6 · ÚLTIMA PALABRA: Cero absoluto (frío = alma AZUL: quieto no duele)
            id: 'cero', name: 'CERO ABSOLUTO', jp: '絶対零度「凍てつく世界」', minPhase: 3, lw: true, soul: true, dur: 300,
            line: 'El frío te vuelve frágil. ¡No te muevas... o sí!',
            tick(b, H, t) {
                if (t === 1) H.tint('#7fc8ff', 0.16, 320);
                if (t % H.iv(30) === 0) H.ring(H.n(16), t * 0.04, H.sp(0.45), 'y_flake', Object.assign({}, FLAKE, { soul: 'blue' }));
                if (t % H.iv(50) === 20) H.fan(H.ang, 0.3, 3, H.sp(0.85), 'y_shard', SHARD);
                if (t % H.iv(70) === 35) H.curtain(clamp(H.px, 90, PW() - 90), 120, H.sp(0.5), 'y_icicle', { hit: 6, sc: 3, glow: '#8fe0ff' });
            }
        }
    ];
    J.register(1, { attacks, base(b, H, t) { if (t % H.iv(60) === 0) H.shot(H.ang, H.sp(0.6), 'y_shard', SHARD); } });
    J.names(1, 'TORMENTA DEL REY YETI');
})();
