/* ===== jefes/j5_archiliche.js ===== */
// ============================================================================================
//  NIVEL 5 · ARCHILICHE BIBLIOTECARIO / LA GRAN ARCHIVISTA  (Biblioteca Arcana)
//  Identidad: mago de grimorios (referencia Touhou 6: Patchouli). Un elemento por libro: fuego, agua, madera,
//  metal, tierra. Páginas que arden, runas, libros que caen y el apocalipsis escrito letra a letra.
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J) return;
    const { def, P, shot, beam, rnd, rr, pick, clamp, TAU, PW, PH, pcx, pcy, kill, letterSpr } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;

    def('r_page', 13, 15, (g) => { P.r(g, 0, 0, 13, 15, '#f4e8c4'); P.r(g, 0, 0, 13, 1, '#b89858'); P.r(g, 0, 14, 13, 1, '#b89858'); for (let y = 3; y < 13; y += 2) P.r(g, 2, y, y % 4 === 3 ? 6 : 9, 1, '#6a4a2a'); P.r(g, 10, 0, 3, 3, '#d8c08a'); });
    def('r_fire', 11, 14, (g, f) => { const t = f ? 1 : 0; P.p(g, [5.5, t, 10, 8, 8.5, 13, 2.5, 13, 1, 8], '#e03a1a'); P.p(g, [5.5, 3 + t, 8.5, 8.5, 7.5, 12, 3.5, 12, 2.5, 8.5], '#ff9a2a'); P.e(g, 5.5, 9.5, 1.8, 2.8, '#fff2a8'); }, 2);
    def('r_drop', 9, 13, (g) => { P.p(g, [4.5, 0, 8.5, 8, 4.5, 12.5, 0.5, 8], '#2a7ae0'); P.e(g, 4.5, 8.5, 4, 4, '#2a7ae0'); P.c(g, 3, 8, 1.4, '#cfeaff'); });
    def('r_leaf', 13, 9, (g) => { P.e(g, 6.5, 4.5, 6, 3.4, '#3ea83a'); P.e(g, 6.5, 4.5, 4, 1.6, '#9ae884'); P.l(g, 0, 4.5, 4, 4.5, '#2a7a2a', 1); });
    def('r_metal', 17, 7, (g) => { P.p(g, [0, 3.5, 4, 0.5, 17, 3.5, 4, 6.5], '#c8d4e0'); P.p(g, [4, 3.5, 15, 3.5, 4, 5.6], '#7a8a9c'); P.r(g, 1, 3, 3, 1, '#ffffff'); });
    def('r_rock', 13, 13, (g) => { P.p(g, [6.5, 0, 13, 5, 10.5, 13, 2.5, 13, 0, 5], '#9a7a4a'); P.p(g, [6.5, 2, 10, 5.5, 6.5, 6], '#d0aa6a'); P.r(g, 4, 9, 4, 1, '#5a4228'); });
    def('r_rune', 13, 13, (g) => { P.a(g, 6.5, 6.5, 5.4, 0, TAU, '#c58aff', 1.6); P.l(g, 6.5, 1.5, 3, 10.5, '#e8d0ff', 1.2); P.l(g, 3, 10.5, 10.5, 4.5, '#e8d0ff', 1.2); P.l(g, 10.5, 4.5, 2.5, 4.5, '#e8d0ff', 1.2); P.l(g, 2.5, 4.5, 10, 10.5, '#e8d0ff', 1.2); P.l(g, 10, 10.5, 6.5, 1.5, '#e8d0ff', 1.2); });
    def('r_book', 23, 19, (g) => { P.r(g, 0, 2, 23, 16, '#6a1a8a'); P.r(g, 1, 3, 21, 14, '#9a3ac8'); P.r(g, 10, 2, 3, 16, '#3a0a50'); P.r(g, 3, 5, 6, 1, '#ffd98a'); P.r(g, 3, 8, 6, 1, '#ffd98a'); P.r(g, 14, 5, 6, 1, '#ffd98a'); P.r(g, 14, 8, 6, 1, '#ffd98a'); P.c(g, 11.5, 12, 2.4, '#ffd98a'); P.r(g, 0, 16, 23, 2, '#f4e8c4'); });
    const ELEM = ['r_fire', 'r_drop', 'r_leaf', 'r_metal', 'r_rock', 'r_page', 'r_rune'];
    const GL = { r_fire: '#ff7a2a', r_drop: '#4a9aff', r_leaf: '#6ae05a', r_metal: '#dfe8f4', r_rock: '#d0aa6a', r_page: '#f4e8c4', r_rune: '#c58aff' };
    const E = id => ({ glow: GL[id], hit: 7, sc: id === 'r_page' ? 2 : 2, anim: 8 });

    const attacks = [
        {   // 1 · páginas que arden
            id: 'fuego', name: 'PAGINAS ARDIENTES', jp: '火符「紅蓮の頁」', minPhase: 1, dur: 240,
            line: 'Hoy toca quemar... un capítulo entero.',
            tick(b, H, t) {
                if (t % H.iv(30) === 0) {
                    const n = Math.max(3, H.n(5));
                    for (let k = 0; k < n; k++) H.shot(H.ang + (k - (n - 1) / 2) * 0.22, H.sp(0.8), 'r_page', { sc: 2, hit: 7, rot: 'spin', spin: 0.18, glow: '#f4e8c4',
                        upd: bb => { if (bb.age === 26) { bb.ub = 'r_fire'; bb.anim = 8; bb.rotm = 'none'; bb.glow = '#ff7a2a'; for (const s of [-0.45, 0.45]) { const a = Math.atan2(bb.vy, bb.vx) + s; shot(bb.x, bb.y, a, H.sp(0.62), 'r_fire', E('r_fire')); } } } });
                }
            }
        },
        {   // 2 · lluvia que revienta en gotitas
            id: 'agua', name: 'GOTA DEL SILENCIO', jp: '水符「静寂の雫」', minPhase: 1, dur: 240,
            line: 'Shhh... la biblioteca está en silencio.',
            tick(b, H, t) {
                if (t % H.iv(11) === 0) {
                    const delay = 34 + Math.floor(rnd() * 34);
                    shot(rr(20, PW() - 20), -8, PI / 2, H.sp(0.5), 'r_drop', { sc: 3, hit: 7, glow: '#4a9aff', upd: bb => { if (bb.age === delay) { for (let i = 0; i < 6; i++) shot(bb.x, bb.y, i * TAU / 6, H.sp(0.38), 'r_drop', { sc: 2, hit: 5, glow: '#4a9aff' }); kill(bb); } } });
                }
            }
        },
        {   // 3 · hojas en espiral con viento
            id: 'madera', name: 'HOJA DEL MILENIO', jp: '木符「千年の葉風」', minPhase: 1, dur: 250,
            line: 'Las hojas también son papel, ¿sabes?',
            tick(b, H, t) {
                b._lf = (b._lf || 0) + 0.11 * ((Math.floor(t / 100) % 2) ? -1 : 1);
                if (t % H.iv(7) === 0) for (let k = 0; k < 2; k++) H.shot(b._lf + k * PI, H.sp(0.5), 'r_leaf', { sc: 2, hit: 7, glow: '#6ae05a', curve: 0.012 * ((Math.floor(t / 100) % 2) ? -1 : 1) });
            }
        },
        {   // 4 · cuchillas de metal con mira
            id: 'metal', name: 'MARCAPAGINAS DE HIERRO', jp: '金符「鉄の栞」', minPhase: 2, dur: 260,
            line: 'Un marcapáginas... afilado.',
            tick(b, H, t) {
                if ([1, 62, 124, 186].includes(t))
                    beam({ x: H.cx, y: H.cy, a: H.ang, len: 1000, w: 5, warn: H.tele, on: 0, col: '#dfe8f4', col2: '#fff', snd: false,
                        track: h => { if (h.t < h.warn - 14) h.a = Math.atan2(pcy() - h.y, pcx() - h.x); },
                        onFire: h => { for (let k = -2; k <= 2; k++) shot(h.x, h.y, h.a + k * 0.1, H.sp(1.45), 'r_metal', { sc: 2, hit: 6, glow: '#dfe8f4' }); J.sfx(900, 400, 0.08, 'sawtooth', 0.03); } });
                if (t % H.iv(40) === 20) H.ring(H.n(8), t * 0.1, H.sp(0.4), 'r_rune', E('r_rune'));
            }
        },
        {   // 5 · libros pesados que caen y levantan roca
            id: 'tierra', name: 'PESO DEL LIBRO PROHIBIDO', jp: '土符「禁書の重石」', minPhase: 2, dur: 290,
            line: 'Tres mil páginas. Todas sobre ti.',
            tick(b, H, t) {
                if (t % H.iv(62) === 1 && t < 250) {
                    shot(clamp(H.px + rr(-50, 50), 30, PW() - 30), 26, PI / 2, 0.1, 'r_book', { fz: H.tele, acc: 0.22 * H.K, vmin: 0.1, vmax: H.sp(1.7), hit: 18, sc: 3, rot: 'none', glow: '#c58aff',
                        extra: bb => { if (bb.fz > 0) { ctx.globalAlpha = 0.5; ctx.strokeStyle = '#c58aff'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(bb.x, bb.y + 28); ctx.lineTo(bb.x, PH() - 40); ctx.stroke(); } },
                        upd: bb => { if (bb.y > PH() - 56) { for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 2; k++) shot(bb.x + s * 20, PH() - 36, s > 0 ? -0.15 - k * 0.5 : PI + 0.15 + k * 0.5, H.sp(0.55), 'r_rock', E('r_rock')); H.shake(8); kill(bb); } } });
                }
            }
        },
        {   // 6 · ESPECIAL: el apocalipsis se escribe letra a letra
            id: 'apocalipsis', name: 'APOCALIPSIS ESCRITO', jp: '禁書「黙示録の一頁」', minPhase: 3, sp: true, sig: true, dur: 340,
            line: 'Y en el principio... estaba tu final.',
            tick(b, H, t) {
                if ([1, 74, 148, 222].includes(t)) {
                    const word = pick(['SILENCIO', 'PROHIBIDO', 'OLVIDA', 'CALLA', 'FIN', 'ARCHIVO']), sp = 31, x0 = clamp(H.px - word.length * sp / 2 + rr(-90, 90), 24, PW() - word.length * sp - 24);
                    for (let i = 0; i < word.length; i++) {
                        const id = letterSpr(word[i], i % 2 ? '#ffd98a' : '#d9a8ff');
                        shot(x0 + i * sp, 34, PI / 2, 0.05, id, { sc: 2.5, hit: 7, rot: 'none', fz: 26 + i * 5, alpha: 0.9, glow: '#c58aff', onThaw: bb => { bb.vx = 0; bb.vy = H.sp(0.5); } });
                    }
                }
                if (t % H.iv(60) === 40) H.fan(H.ang, 0.3, 3, H.sp(0.8), 'r_page', { sc: 2, hit: 7, rot: 'spin', spin: 0.15 });
            }
        },
        {   // 7 · ÚLTIMA PALABRA: grimorio de los siete astros (un elemento tras otro)
            id: 'siete', name: 'GRIMORIO DE LOS SIETE ASTROS', jp: '七曜「七元素の大魔導書」', minPhase: 3, lw: true, dur: 320,
            line: 'Fuego, agua, madera, metal, tierra, sol y luna... ¡todos a la vez!',
            tick(b, H, t) {
                if (t % H.iv(22) === 0) { const i = Math.floor(t / H.iv(22)) % 7, id = ELEM[i]; H.ring(Math.max(10, H.n(15)), t * 0.07 * (i % 2 ? -1 : 1), H.sp(0.42 + (i % 3) * 0.07), id, E(id)); }
                if (t % H.iv(80) === 40) H.fan(H.ang, 0.35, 3, H.sp(0.85), 'r_metal', { sc: 2, hit: 6, glow: '#dfe8f4' });
            }
        }
    ];
    J.register(4, { attacks, base(b, H, t) { if (t % H.iv(60) === 0) H.shot(H.ang, H.sp(0.7), 'r_page', { sc: 2, hit: 7, rot: 'spin', spin: 0.15 }); } });
    J.names(4, 'APOCALIPSIS ESCRITO');
})();
