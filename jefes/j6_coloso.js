/* ===== jefes/j6_coloso.js ===== */
// ============================================================================================
//  NIVEL 6 · COLOSO DEL RELOJ / EL RELOJERO ETERNO  (Torre del Reloj)
//  Identidad: dueño del tiempo (referencia Touhou 6: Sakuya). Cuchillos que se detienen en el aire, engranajes
//  rebotando, péndulo gigante, manecillas-rayo, rebobinado, PARADA DEL TIEMPO y un bucle que se repite igual.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, spr, P, shot, beam, hazard, tint, say, seed, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('c_knife', 19, 7, (g) => { P.p(g, [0, 3.5, 3, 0.5, 19, 3.5, 3, 6.5], '#dfe6f0'); P.p(g, [3, 3.5, 17, 3.5, 3, 6], '#8ea0b8'); P.r(g, 0, 3, 2, 1, '#fff'); P.r(g, 3, 0, 2, 7, '#c8a040'); });
    def('c_gear', 17, 17, (g) => { for (let i = 0; i < 8; i++) { const a = i * PI / 4; P.p(g, [8.5 + C(a - 0.22) * 6, 8.5 + S(a - 0.22) * 6, 8.5 + C(a - 0.2) * 8.2, 8.5 + S(a - 0.2) * 8.2, 8.5 + C(a + 0.2) * 8.2, 8.5 + S(a + 0.2) * 8.2, 8.5 + C(a + 0.22) * 6, 8.5 + S(a + 0.22) * 6], '#d8a030'); } P.c(g, 8.5, 8.5, 6.4, '#e8b840'); P.c(g, 8.5, 8.5, 2.6, '#5a3a10'); P.c(g, 8.5, 8.5, 1.2, '#e8b840'); });
    def('c_chime', 13, 13, (g) => { P.p(g, [6.5, 1, 11, 9, 2, 9], '#f0c040'); P.r(g, 1, 9, 11, 2, '#c89420'); P.c(g, 6.5, 11.5, 1.4, '#fff2a0'); P.r(g, 5, 2, 2, 5, '#fff2a0'); });
    def('c_bob', 17, 17, (g) => { P.c(g, 8.5, 8.5, 8, '#c89420'); P.c(g, 8.5, 8.5, 6.4, '#f4d060'); P.c(g, 8.5, 8.5, 5, '#fff6d0'); P.l(g, 8.5, 8.5, 8.5, 4, '#3a2a10', 1.2); P.l(g, 8.5, 8.5, 11.5, 9.5, '#3a2a10', 1.2); P.c(g, 8.5, 8.5, 1, '#3a2a10'); });
    const KN = { sc: 2, hit: 6, glow: '#c8d8f0' };
    const GEAR = { sc: 2, hit: 9, rot: 'spin', spin: 0.08, glow: '#f0c040' };
    const CH = { sc: 2, hit: 7, glow: '#f0c040', rot: 'none' };

    const attacks = [
        {   // 1 · cuchillos que se detienen y luego salen hacia donde estabas
            id: 'detenido', name: 'AGUJA DETENIDA', jp: '時符「止まった針」', minPhase: 1, dur: 250,
            line: 'El tiempo es solo... una sugerencia.',
            tick(b, H, t) {
                if (t % H.iv(66) === 1 && t < 200) {
                    const n = Math.max(7, H.n(13)), thaw = H.sp(1.2), px0 = H.px, py0 = H.py;
                    H.tint('#a8b4d0', 0.09, 62);
                    for (let i = 0; i < n; i++) {
                        const a = i * TAU / n, x = H.cx + C(a) * 70, y = H.cy + S(a) * 55;
                        shot(x, y, a, 0.02, 'c_knife', Object.assign({}, KN, { fz: 54 + i, icy: true, onThaw: bb => { const aa = Math.atan2(py0 - bb.y, px0 - bb.x); bb.vx = C(aa) * thaw; bb.vy = S(aa) * thaw; bb.icy = false; } }));
                    }
                }
            }
        },
        {   // 2 · engranajes rebotando
            id: 'engranajes', name: 'MARCHA DE ENGRANAJES', jp: '歯車「噛み合う運命」', minPhase: 1, dur: 270,
            line: 'Cada pieza en su lugar... ¡tú no!',
            tick(b, H, t) {
                if (t % H.iv(56) === 1 && t < 220) for (let k = -1; k <= 1; k++) H.shot(PI / 2 + k * 0.75, H.sp(0.58), 'c_gear', Object.assign({}, GEAR, { bounce: 3, life: 420 }));
            }
        },
        {   // 3 · péndulo gigante
            id: 'pendulo', name: 'PENDULO ETERNO', jp: '振子「刻を刻む大振り子」', minPhase: 2, dur: 290,
            line: 'Tic. Tac. Tic. Tac. Tic...',
            tick(b, H, t) {
                if (t === 1) {
                    const L = Math.min(PH() * 0.72, 440), pv = { x: PW() / 2, y: 0 }, AMP = Math.min(1.05, Math.asin(Math.min(0.95, (PW() / 2 - 22) / L)));
                    shot(pv.x, L, PI / 2, 0, 'c_bob', { sc: 3, hit: 26, rot: 'none', glow: '#f4d060', life: 300,
                        extra: bb => { ctx.globalAlpha = 0.7; ctx.strokeStyle = '#c89420'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pv.x, pv.y); ctx.lineTo(bb.x, bb.y); ctx.stroke(); },
                        upd: bb => {
                            const amp = AMP * Math.min(1, bb.age / 60), th = amp * C(bb.age * 0.03), prev = bb._th;
                            bb.x = pv.x + S(th) * L; bb.y = pv.y + C(th) * L; bb._th = th;
                            bb.width = bb.height = bb.age < 50 ? -30 : 26; bb.alpha = Math.min(1, bb.age / 40);
                            if (prev !== undefined && Math.abs(th) > amp * 0.97 && Math.abs(prev) <= amp * 0.97 && bb.age > 60) { for (let i = 0; i < 7; i++) shot(bb.x, bb.y, i * TAU / 7 + bb.age, H.sp(0.4), 'c_chime', CH); }
                        } });
                }
                if (t % H.iv(44) === 20) H.fan(H.ang, 0.26, 3, H.sp(0.7), 'c_chime', CH);
            }
        },
        {   // 4 · manecillas gigantes (rayos finitos que giran)
            id: 'manecillas', name: 'MANECILLAS', jp: '針符「長針と短針の輪舞」', minPhase: 2, dur: 300,
            line: 'Son las doce... y siempre tarde para ti.',
            tick(b, H, t) {
                if (t === 1) {
                    const cx = PW() / 2, cy = PH() * 0.44, a0 = rnd() * TAU, w = H.tele + 30;
                    beam({ x: cx, y: cy, a: a0, len: 310, w: 16, warn: w, on: 240, rv: 0.0095, col: '#e8b840', col2: '#fff6d0', snd: true });
                    beam({ x: cx, y: cy, a: a0 + PI, len: 215, w: 24, warn: w, on: 240, rv: 0.0012, col: '#c89420', col2: '#fff6d0', snd: false });
                    hazard({ life: w + 260, draw: h => { ctx.save(); ctx.globalAlpha = 0.28; ctx.strokeStyle = '#f0c040'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 312, 0, TAU); ctx.stroke(); for (let i = 0; i < 12; i++) { const a = i * PI / 6; ctx.beginPath(); ctx.moveTo(cx + C(a) * 296, cy + S(a) * 296); ctx.lineTo(cx + C(a) * 312, cy + S(a) * 312); ctx.stroke(); } ctx.restore(); } });
                }
                if (t > H.tele + 30 && t % H.iv(70) === 0) H.ring(H.n(10), t * 0.05, H.sp(0.4), 'c_chime', CH, PW() / 2, PH() * 0.44);
                if (t % H.iv(50) === 25) H.shot(H.ang, H.sp(0.8), 'c_knife', KN);
            }
        },
        {   // 5 · rebobinado: las balas vuelven por donde vinieron
            id: 'rebobinar', name: 'REBOBINADO', jp: '巻戻「刻の逆流」', minPhase: 2, dur: 270,
            line: '¿Eso? No pasó. Lo borré.',
            tick(b, H, t) {
                if (t % H.iv(76) === 1 && t < 210) {
                    const n = Math.max(8, H.n(14)), a0 = rnd() * TAU, sp = H.sp(0.82);
                    for (let i = 0; i < n; i++) shot(H.cx, H.cy, a0 + i * TAU / n, sp, i % 2 ? 'c_knife' : 'c_chime', Object.assign({}, i % 2 ? KN : CH, { upd: bb => { if (bb.age === 46) { bb.vx *= -1; bb.vy *= -1; bb.rotm = 'vel'; } if (bb.age >= 96) kill(bb); } }));
                    H.tint('#c8a060', 0.08, 120);
                }
            }
        },
        {   // 6 · ESPECIAL: el mundo se detiene
            id: 'parada', name: 'EL MUNDO SE DETIENE', jp: '時符「止まった世界」', minPhase: 3, sp: true, sig: true, dur: 350,
            line: 'Za warudo... digo, ¡tiempo!',
            tick(b, H, t) {
                if (t === 1 || t === 175) {
                    tint('#8a92a8', 0.24, 150); J.sfx(220, 60, 0.4, 'sawtooth', 0.05);
                    for (const e of enemyBullets) if (e.ub && e.fz < 90) { e.fz = 96; e.icy = true; }
                    const px0 = H.px, py0 = H.py, sp = H.sp(1.0), n = Math.max(7, H.n(13));
                    [[130, 0], [215, 0.5]].forEach(([R, off], ri) => {
                        for (let i = 0; i < n; i++) {
                            if ((i + ri) % 6 === 0) continue;
                            const a = off + i * TAU / n, x = px0 + C(a) * R, y = py0 + S(a) * R;
                            if (x < 0 || x > PW() || y < 0 || y > PH()) continue;
                            shot(x, y, a + PI, 0.02, 'c_knife', Object.assign({}, KN, { fz: 96 + i, icy: true, onThaw: bb => { const aa = Math.atan2(py0 - bb.y, px0 - bb.x); bb.vx = C(aa) * sp; bb.vy = S(aa) * sp; bb.icy = false; } }));
                        }
                    });
                }
            }
        },
        {   // 7 · ÚLTIMA PALABRA: bucle temporal (el mismo patrón se repite tres veces)
            id: 'bucle', name: 'BUCLE ETERNO', jp: '永遠「エターナル・ループ」', minPhase: 3, lw: true, dur: 330,
            line: 'Ya lo has vivido. ¿O todavía no?',
            tick(b, H, t) {
                const c = (t - 1) % 105, loop = Math.floor((t - 1) / 105) + 1;
                if (c === 0) { seed(4242); say(b, 'Bucle ' + Math.min(3, loop) + ' de 3...', 70); }
                if (c === 8 || c === 30 || c === 52 || c === 74) {
                    if (c === 30 || c === 74) H.curtain(rr(160, PW() - 160), 150, H.sp(0.6), 'c_knife', Object.assign({}, KN, { roff: 0 }), 50);
                    else H.ring(Math.max(10, H.n(14)), rr(0, TAU), H.sp(0.45), 'c_gear', Object.assign({}, GEAR, { sc: 1.6, hit: 7 }));
                }
            }
        }
    ];
    J.register(5, { attacks, base(b, H, t) { if (t % H.iv(60) === 0) H.shot(H.ang, H.sp(0.9), 'c_knife', KN); } });
    J.names(5, 'EL MUNDO SE DETIENE');
})();
