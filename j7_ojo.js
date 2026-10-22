/* ===== jefes/j7_ojo.js ===== */
// ============================================================================================
//  NIVEL 7 · OJO GIGANTE / EL OJO CARMESÍ  (Luna Sangrante, exclusivo de Lunático)
//  Identidad: vigía vampírico (referencia Touhou 6: Remilia y Flandre). Lágrimas que dejan charcos de sangre,
//  mirada que te fija, murciélagos, eclipse de lunas carmesí, mar de sangre que sube y cuatro ojos a la vez.
//  El propio ojo se anima: parpadea al cargar, brilla al disparar.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, spr, P, shot, beam, rect, hazard, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill, hurt } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('o_tear', 17, 11, (g) => { P.p(g, [0, 5.5, 9, 1.5, 9, 9.5], '#c01030'); P.c(g, 11, 5.5, 5, '#e01838'); P.c(g, 9.5, 3.8, 1.6, '#ffb0bc'); P.r(g, 12, 7, 2, 1, '#7a0a20'); });
    def('o_eye', 15, 15, (g) => { P.c(g, 7.5, 7.5, 7, '#fff4f4'); P.l(g, 2, 4, 5, 6, '#d02040', 1); P.l(g, 13, 11, 10, 9, '#d02040', 1); P.l(g, 3, 12, 5, 10, '#d02040', 1); });
    def('o_bat', 19, 11, (g, f) => { const u = f ? 2 : 6; P.p(g, [9.5, 3, 7, 0, 4, u - 2, 0, u + 1, 3, 6 + (f ? 0 : -1), 5, 5, 7, 8, 9.5, 9, 12, 8, 14, 5, 16, 6 + (f ? 0 : -1), 19, u + 1, 15, u - 2, 12, 0], '#8a2aa8'); P.c(g, 9.5, 5, 2.6, '#b04ad0'); P.r(g, 8, 4, 1, 1, '#ff3050'); P.r(g, 10, 4, 1, 1, '#ff3050'); }, 2);
    def('o_moon', 19, 19, (g) => { P.c(g, 9.5, 9.5, 8.5, '#ff4a62'); g.globalCompositeOperation = 'destination-out'; P.c(g, 13, 8, 7.5, '#000'); g.globalCompositeOperation = 'source-over'; P.c(g, 4.5, 11, 1.3, '#ffc0c8'); });
    def('o_orb', 11, 11, (g) => { P.c(g, 5.5, 5.5, 5, '#b01028'); P.c(g, 5.5, 5.5, 3.6, '#e82040'); P.c(g, 4, 4, 1.3, '#ffc0c8'); });

    const TEAR = { glow: '#ff3050', hit: 7, sc: 2.5 };
    // pupila viva: mira hacia el jugador
    const eyeExtra = (bb, a) => { const ang = Math.atan2(pcy() - bb.y, pcx() - bb.x), r = 2.6 * (bb.sc || 3); ctx.globalAlpha = a; ctx.fillStyle = '#c01030'; ctx.beginPath(); ctx.arc(bb.x + C(ang) * r, bb.y + S(ang) * r, 3.4 * (bb.sc || 3) / 2.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#10000a'; ctx.beginPath(); ctx.arc(bb.x + C(ang) * (r + 1), bb.y + S(ang) * (r + 1), 1.9 * (bb.sc || 3) / 2.2, 0, TAU); ctx.fill(); };
    const EYEB = { glow: '#ff3050', hit: 8, sc: 2.2, rot: 'none', extra: eyeExtra };
    const puddle = (x, H) => { if (J.hz().filter(h => h.kind === 'rect').length < 5) rect({ x: x - 26, y: PH() - 40, w: 52, h: 40, warn: 14, life: 210, col: '#a0102a' }); };

    const attacks = [
        {   // 1 · lágrimas que dejan charcos
            id: 'lagrimas', name: 'LLUVIA DE LAGRIMAS CARMESI', jp: '血符「紅涙の雨」', minPhase: 1, dur: 250,
            line: 'Lloro... y tú lo pagas.',
            tick(b, H, t) {
                b.eyeCharge = 0; b.eyeBlink = 0.25 + 0.2 * S(t * 0.1);
                if (t % H.iv(14) === 0) {
                    const a = PI / 2 + rr(-1.0, 1.0);
                    H.shot(a, H.sp(0.5), 'o_tear', Object.assign({}, TEAR, { grav: 0.03 * H.K, upd: bb => { if (bb.y > PH() - 14) { if (rnd() < 0.4) puddle(bb.x, H); kill(bb); } } }));
                }
            },
            end(b) { b.eyeBlink = 0; }
        },
        {   // 2 · mirada que se fija y dispara un rayo
            id: 'mirada', name: 'MIRADA SANGRIENTA', jp: '眼符「ブラッディ・ゲイズ」', minPhase: 1, dur: 260,
            line: 'No me mires... ¡te miro yo!',
            tick(b, H, t) {
                const cyc = H.tele + 30 + 16, c = (t - 1) % (cyc + 18);
                b.eyeCharge = c < cyc ? c / cyc : 0; if (c === 0) b.eyeBlink = 0; if (c === cyc) b.eyeFlash = 1;
                if (c === 0 && t < 200) beam({ x: H.cx, y: H.cy, a: H.ang, len: 1500, w: 36, warn: H.tele + 30, on: 22, col: '#ff2848', col2: '#ffe0e4',
                    track: h => { if (h.t < h.warn - 22) h.a = Math.atan2(pcy() - h.y, pcx() - h.x); }, follow: h => { h.x = b.x + b.width / 2; h.y = b.y + b.height / 2; } });
                if (t % H.iv(40) === 12) H.ring(6, t * 0.1, H.sp(0.36), 'o_eye', EYEB);
            }
        },
        {   // 3 · murciélagos que ondulan con un carril en calma
            id: 'murcielagos', name: 'TORMENTA DE MURCIELAGOS', jp: '蝙蝠「紅い夜の群れ」', minPhase: 2, dur: 260,
            line: 'Mis amigos tenían hambre.',
            tick(b, H, t) {
                const dir = (Math.floor(t / 90) % 2) ? -1 : 1, K = H.K, gapY = PH() * 0.6 + S(t * 0.024) * PH() * 0.18;
                if (t % H.iv(8) === 0) {
                    const y = rr(70, PH() - 70);
                    if (Math.abs(y - gapY) > 80) { const ph = rnd() * 6; shot(dir > 0 ? -12 : PW() + 12, y, dir > 0 ? 0 : PI, H.sp(0.5) * rr(0.85, 1.2), 'o_bat', { sc: 2, hit: 7, anim: 6, glow: '#ff3050', upd: bb => { bb.vy = S(bb.age * 0.09 + ph) * 1.6 * K; } }); }
                }
                if (t % H.iv(60) === 30) H.fan(H.ang, 0.3, 3, H.sp(0.75), 'o_orb', { sc: 2.2, hit: 7, glow: '#ff3050' });
            }
        },
        {   // 4 · eclipse: lunas carmesí en espiral
            id: 'eclipse', name: 'ECLIPSE CARMESI', jp: '月符「紅月蝕」', minPhase: 2, dur: 270,
            line: 'La luna sangra por mí.',
            tick(b, H, t) {
                if (t === 1) H.tint('#40000f', 0.22, 280);
                if (t % H.iv(46) === 0) { const n = Math.max(8, H.n(12)), a0 = t * 0.045, dir = (Math.floor(t / 100) % 2) ? -1 : 1; H.ring(n, a0, H.sp(0.44), 'o_moon', { sc: 1.8, hit: 8, rot: 'spin', spin: 0.07, glow: '#ff3050', curve: 0.006 * dir }); }
                if (t % H.iv(30) === 15) H.shot(H.ang, H.sp(0.65), 'o_orb', { sc: 2.2, hit: 7, glow: '#ff3050' });
            }
        },
        {   // 5 · ESPECIAL: llanto + el mar de sangre sube
            id: 'llanto', name: 'LAGRIMA CARMESI', jp: '涙「血の海の慟哭」', minPhase: 3, sp: true, sig: true, dur: 340,
            line: 'Mi llanto... ¡inunda el mundo!',
            tick(b, H, t) {
                if (t === 1) {
                    const mx = 78;
                    hazard({ life: 330, update(h) { h.hh = mx * Math.min(1, h.t / 90) * Math.min(1, (330 - h.t) / 40); if (pcy() > PH() - h.hh) hurt(); },
                        draw(h) { const y = PH() - h.hh; const gr = ctx.createLinearGradient(0, y, 0, PH()); gr.addColorStop(0, 'rgba(255,60,80,0.85)'); gr.addColorStop(1, 'rgba(120,0,20,0.95)'); ctx.save(); ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(0, PH()); for (let x = 0; x <= PW(); x += 12) ctx.lineTo(x, y + S(x * 0.05 + h.t * 0.1) * 3); ctx.lineTo(PW(), PH()); ctx.fill(); ctx.restore(); } });
                    H.tint('#50000f', 0.16, 300);
                }
                b.eyeBlink = 0.3; b.eyeCharge = 0;
                if (t % H.iv(24) === 0) H.curtain(PW() / 2 + S(t * 0.03) * PW() * 0.3, 140, H.sp(0.5), 'o_tear', TEAR, 44);
            },
            end(b) { b.eyeBlink = 0; }
        },
        {   // 6 · ÚLTIMA PALABRA: cuatro ojos a la vez
            id: 'destino', name: 'DESTINO ESCARLATA', jp: '紅魔「スカーレット・デスティニー」', minPhase: 3, lw: true, dur: 340,
            line: 'Cuatro ojos ven más que dos. ¡Y yo tengo cinco!',
            tick(b, H, t) {
                if (t === 1) {
                    const tele = H.tele + 24, pos = [[0.16, 0.3], [0.84, 0.3], [0.16, 0.62], [0.84, 0.62]];
                    pos.forEach(([fx, fy], i) => hazard({ x: PW() * fx, y: PH() * fy, life: 320,
                        update(h) { const c = (h.t + i * 44) % 150; if (c === 0 && h.t > 20 && h.t < 270) { const x = h.x, y = h.y; beam({ x, y, a: Math.atan2(pcy() - y, pcx() - x), len: 1300, w: 26, warn: tele, on: 18, col: '#ff2848', col2: '#ffe0e4', snd: false, track: bm => { if (bm.t < bm.warn - 18) bm.a = Math.atan2(pcy() - bm.y, pcx() - bm.x); } }); } },
                        draw(h) { const a = Math.min(1, h.t / 25) * Math.min(1, (h.life - h.t) / 20), ang = Math.atan2(pcy() - h.y, pcx() - h.x); spr('o_eye', h.x, h.y, 3.4, 0, a); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#c01030'; ctx.beginPath(); ctx.arc(h.x + C(ang) * 9, h.y + S(ang) * 9, 8, 0, TAU); ctx.fill(); ctx.fillStyle = '#10000a'; ctx.beginPath(); ctx.arc(h.x + C(ang) * 11, h.y + S(ang) * 11, 4.5, 0, TAU); ctx.fill(); ctx.restore(); } }));
                }
                if (t % H.iv(50) === 0) H.ring(Math.max(8, H.n(11)), t * 0.06, H.sp(0.4), 'o_bat', { sc: 2, hit: 7, anim: 6, glow: '#ff3050' });
                if (t % H.iv(70) === 35) H.fan(H.ang, 0.3, 3, H.sp(0.7), 'o_tear', TEAR);
            }
        }
    ];
    J.register(6, { attacks, base(b, H, t) { if (t % H.iv(60) === 0) H.shot(H.ang, H.sp(0.55), 'o_tear', TEAR); } });
    J.names(6, 'LAGRIMA CARMESI');
})();
