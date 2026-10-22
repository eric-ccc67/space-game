/* ===== jefes/dinamicos.js ===== */
// ============================================================================================
//  ATAQUES DINÁMICOS DE LOS JEFES  ·  v40
// --------------------------------------------------------------------------------------------
//  Los jefes de los 7 niveles ganan 3 ataques nuevos cada uno (21 en total), pensados para que la pelea sea más
//  INTERACTIVA: el jefe usa su propio cuerpo, sus extremidades y el escenario, y casi todo reacciona a DÓNDE estás.
//  Se carga después de jefes/j7_ojo.js y añade los ataques con JefesUnicos.addAttacks().
//
//  Piezas nuevas que comparten los ataques:
//    · EMBESTIDA DEL CUERPO: el jefe se alinea con tu posición (con una marca en el suelo), se lanza hacia ti y al caer
//      suelta una onda temática. Se mueve de verdad: puedes dispararle más de cerca mientras esquivas.
//    · TENTÁCULOS / COLAS / VENAS ARTICULADOS: extremidades con curvas que apuntan hacia ti, se fijan y golpean o barren.
//    · ANILLOS QUE SE CIERRAN, OJOS QUE TE FIJAN, CARRILES, GOLPES DIFERIDOS sobre tu posición... (ver cada jefe).
//
//   1 Kyubi   · LATIGO DE LAS NUEVE COLAS · EMBESTIDA DEL ZORRO · ESPEJISMO DE MIL ZORROS
//   2 Yeti    · PUÑO DEL REY · AVALANCHA · GRIETAS DE HIELO
//   3 Kraken  · TENTACULOS CAZADORES · EMBATE DEL LEVIATAN · ABRAZO DEL ABISMO
//   4 Araña   · SALTO DE LA REINA · TIJERAS DE SEDA · EMBOSCADA DE CRIAS
//   5 Liche   · BIBLIOTECA VIVA · SELLO ESTRELLA · ESTANTERIAS
//   6 Coloso  · PISOTON DEL COLOSO · RELOJ DE ARENA · CAMPANADAS
//   7 Ojo     · EJERCITO DE OJOS · PUPILA ABISMAL · VENAS CARMESI
//  (los marcados "lw" de cada jefe solo salen en su última fase: ABRAZO, ESPEJISMO, GRIETAS, EMBOSCADA, ESTANTERIAS, CAMPANADAS, VENAS)
//
//  Consola:  JefesUnicos.dev.list(2)  ->  lista los ataques del jefe 3  ·  JefesUnicos.dev.force('cazadores')
//            JefesDin.cfg.enabled = false  ->  quita los ataques nuevos en la siguiente pelea
// ============================================================================================
(function () {
    'use strict';
    const J = window.JefesUnicos; if (!J || !J.addAttacks || typeof Boss === 'undefined') return;
    const { def, P, shot, beam, zone, hazard, rnd, rr, clamp, TAU, PW, PH, pcx, pcy, kill, sfx, spr, segDist, grazeH, lowFx } = J;
    const PI = Math.PI, S = Math.sin, C = Math.cos;
    const CFG = { enabled: true };
    const angDiff = (a, b) => { let d = b - a; while (d > PI) d -= TAU; while (d < -PI) d += TAU; return d; };
    const aimAt = (x, y) => Math.atan2(pcy() - y, pcx() - x);
    const bossCx = b => b.x + b.width / 2;

    // ============================================================================================
    //  CUERPO DEL JEFE: desplazamiento vertical suave (las embestidas)
    //  El motor recoloca la y del jefe cada cuadro; aquí se le suma b._dy (que se acerca a b._dyT).
    // ============================================================================================
    const _upd = Boss.prototype.update;
    Boss.prototype.update = function () {
        const r = _upd.call(this), b = this;
        if (b._dy === undefined) { b._dy = 0; b._dyT = 0; b._dyApplied = 0; }
        if (b.hp <= 0 || b.state === 'dead') { b._dy = b._dyT = b._dyApplied = 0; return r; }
        if (!b._ab) b._dyT = 0;                                     // sin ataque en curso, vuelve a su sitio
        b._dy += (b._dyT - b._dy) * (b._dyK || 0.18);
        if (b._dyT === 0 && Math.abs(b._dy) < 0.05) b._dy = 0;
        if (b.levelIdx !== 6 && b.state === 'active') { b.y += b._dy; b._dyApplied = b._dy; }   // el motor ya reinició la y: se suma completo
        else { b.y += b._dy - b._dyApplied; b._dyApplied = b._dy; }                                // ojo / otros estados: solo la diferencia
        return r;
    };
    const freezeSide = b => { if (b._vx0 === undefined) b._vx0 = b.vx; b.vx = 0; };       // quieto de lado mientras embiste
    const unfreezeSide = b => { if (b._vx0 !== undefined) { b.vx = b._vx0 || 2; b._vx0 = undefined; } b._dyT = 0; b._dyK = 0.18; };

    // ============================================================================================
    //  EXTREMIDAD ARTICULADA (tentáculo / cola / vena)
    //   o: x,y (base) · a (ángulo) · len · segs · w (grosor en la base) · warn (aviso) · on (cuadros que daña)
    //      col, col2 · curl, curlSpd (cuánto ondula) · suckers · tip · track(h) (apunta durante el aviso)
    //      angFn(h) (ángulo libre) · step(h) (cada cuadro) · follow(h) (reposiciona la base) · onFire(h)
    // ============================================================================================
    function limb(o) {
        const h = Object.assign({ kind: 'limb', len: 300, segs: 13, w: 24, warn: 50, on: 40, col: '#2fd0b8', col2: '#e8fffb', curl: 0.45, curlSpd: 0.12, a: PI / 2, bind: true, pts: [], suckers: false }, o);
        h.life = h.life || (h.warn + h.on + 14);
        h.layout = function (h) {
            const n = h.segs, grow = h.t < h.warn ? 0.3 + 0.08 * S(h.t * 0.3) : Math.min(1, 0.4 + (h.t - h.warn) / 8), step = h.len * grow / n;
            let x = h.x, y = h.y; h.pts[0] = [x, y];
            for (let i = 1; i <= n; i++) {
                const a = h.a + h.curl * S(h.t * h.curlSpd - i * 0.6) * (i / n);
                x += C(a) * step; y += S(a) * step; h.pts[i] = [x, y];
            }
        };
        h.update = function (h) {
            if (h.follow) h.follow(h);
            if (h.t < h.warn && h.track) h.track(h);
            if (h.angFn) h.a = h.angFn(h);
            if (h.step) h.step(h);
            h.layout(h);
            if (h.t === h.warn) { sfx(150, 50, 0.22, 'sawtooth', 0.05); screenShake = Math.max(screenShake, 5); if (h.onFire) h.onFire(h); }
        };
        h.hit = function (h) {
            if (h.t < h.warn || h.t >= h.warn + h.on) return false;
            const px = pcx(), py = pcy(), n = h.pts.length - 1;
            for (let i = 0; i < n; i++) {
                const wd = h.w * (1 - 0.72 * i / n) * 0.5 * 0.85, d = segDist(px, py, h.pts[i][0], h.pts[i][1], h.pts[i + 1][0], h.pts[i + 1][1]);
                if (d < wd + 2.2) return true;
                if (d < wd + 18) grazeH(h);
            }
            return false;
        };
        h.draw = function (h) {
            const pts = h.pts, n = pts.length - 1; if (n < 1) return;
            ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
            const path = () => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i <= n; i++) ctx.lineTo(pts[i][0], pts[i][1]); };
            if (h.t < h.warn) {
                const k = h.t / h.warn;
                ctx.globalAlpha = (lowFx() ? 0.5 : 0.25 + 0.3 * S(h.t * 0.5)) * (0.4 + 0.6 * k); ctx.strokeStyle = h.col; ctx.lineWidth = 3; ctx.setLineDash([10, 9]); path(); ctx.stroke(); ctx.setLineDash([]);
                ctx.globalAlpha = 0.13 * k; ctx.lineWidth = h.w * 0.9; path(); ctx.stroke();
            } else {
                const on = h.t - h.warn, a = Math.min(1, on / 4) * Math.min(1, (h.life - h.t) / 10);
                for (let i = 0; i < n; i++) {
                    const w = h.w * (1 - 0.72 * i / n);
                    ctx.globalAlpha = a; ctx.strokeStyle = h.col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
                }
                ctx.strokeStyle = h.col2;
                for (let i = 0; i < n; i++) {
                    const w = h.w * (1 - 0.72 * i / n);
                    ctx.globalAlpha = a * 0.75; ctx.lineWidth = Math.max(1.5, w * 0.3); ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
                }
                if (h.suckers) {
                    ctx.fillStyle = h.col2; ctx.globalAlpha = a * 0.7;
                    for (let i = 2; i < n; i += 2) { const dx = pts[i + 1][0] - pts[i - 1][0], dy = pts[i + 1][1] - pts[i - 1][1], l = Math.hypot(dx, dy) || 1, w = h.w * (1 - 0.72 * i / n); ctx.beginPath(); ctx.arc(pts[i][0] - dy / l * w * 0.22, pts[i][1] + dx / l * w * 0.22, Math.max(1.5, w * 0.13), 0, TAU); ctx.fill(); }
                }
                ctx.globalAlpha = a; ctx.fillStyle = h.col; ctx.beginPath(); ctx.arc(pts[n][0], pts[n][1], Math.max(3, h.w * 0.22), 0, TAU); ctx.fill();
            }
            ctx.restore();
        };
        const hh = hazard(h);
        hh.layout(hh);
        return hh;
    }

    // ============================================================================================
    //  EMBESTIDA DEL CUERPO (fábrica)
    //   o: id, name, jp, line, minPhase, lw, rounds, col, onImpact(b, H, x, y, phase)
    // ============================================================================================
    const CYC = 150;
    function slam(o) {
        const rounds = o.rounds || 2;
        return {
            id: o.id, name: o.name, jp: o.jp, line: o.line, minPhase: o.minPhase || 1, lw: o.lw, dur: CYC * rounds + 30,
            tick(b, H, t, phase) {
                const round = Math.floor((t - 1) / CYC), c = (t - 1) % CYC;
                if (round >= rounds) { b._dyT = 0; b._dyK = 0.12; return; }
                freezeSide(b);
                if (c === 0) {
                    b._tx = H.px; sfx(220, 520, 0.2, 'triangle', 0.04);
                    hazard({
                        life: 70, bind: true,
                        update(h) { h.x = b._tx; },
                        draw(h) {
                            const k = Math.min(1, h.t / 40), pulse = 0.6 + 0.4 * S(h.t * 0.6);
                            ctx.save(); ctx.globalAlpha = (0.2 + 0.4 * k) * pulse; ctx.strokeStyle = o.col; ctx.lineWidth = 2; ctx.setLineDash([10, 8]);
                            ctx.beginPath(); ctx.moveTo(h.x, 0); ctx.lineTo(h.x, PH()); ctx.stroke(); ctx.setLineDash([]);
                            ctx.globalAlpha = 0.14 + 0.2 * k; ctx.fillStyle = o.col; ctx.beginPath(); ctx.ellipse(h.x, PH() - 18, 28 + 40 * k, 7 + 7 * k, 0, 0, TAU); ctx.fill();
                            ctx.restore();
                        }
                    });
                }
                if (c < 55) {                                                       // se alinea con tu posición (se fija hacia el cuadro 40)
                    if (c < 40) b._tx += (H.px - b._tx) * 0.12;
                    const tx = clamp(b._tx - b.width / 2, 0, PW() - b.width);
                    b.x += (tx - b.x) * 0.18;
                    b._dyT = -16 * S(c / 55 * PI); b._dyK = 0.2;                    // toma impulso hacia arriba
                } else if (c === 55) {
                    const base = b.y - (b._dy || 0);
                    b._dyT = clamp(H.py - 28 - (base + b.height), 90, Math.max(90, PH() - 130 - b.height)); b._dyK = 0.35;
                    sfx(300, 90, 0.18, 'sawtooth', 0.05);
                }
                if (c === 66) {
                    const ix = bossCx(b), iy = b.y + b.height - 6;
                    H.shake(16); sfx(110, 40, 0.3, 'sawtooth', 0.07);
                    o.onImpact(b, H, ix, iy, phase);
                }
                if (c >= 84) { b._dyT = 0; b._dyK = 0.12; }
            },
            end(b) { unfreezeSide(b); }
        };
    }

    // tentáculo decorativo de la bala hacia el cuerpo del jefe
    const tentacleTo = (b, col) => (bb, a) => {
        const x0 = bossCx(b), y0 = b.y + b.height * 0.6, x1 = bb.x, y1 = bb.y, w = S(bb.age * 0.08);
        const mx = (x0 + x1) / 2 + (y1 - y0) * 0.18 * w, my = (y0 + y1) / 2 - (x1 - x0) * 0.18 * w;
        ctx.lineCap = 'round'; ctx.globalAlpha = 0.5 * a; ctx.strokeStyle = col || '#1fb8a8'; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
        ctx.lineWidth = 2; ctx.strokeStyle = '#e8fffb'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(mx, my, x1, y1); ctx.stroke();
    };

    // sprite propio: grano de arena
    def('d_sand', 7, 7, (g) => { P.c(g, 3.5, 3.5, 3.2, '#e8c46a'); P.c(g, 3, 3, 1.4, '#fff0b0'); });

    // ============================================================================================
    //  1 · KYUBI (zorro de nueve colas)
    // ============================================================================================
    const FIRE = { anim: 8, glow: '#7ad0ff', hit: 7, sc: 3, rot: 'none' };
    const FBALL = { glow: '#ff9a3a', hit: 8, sc: 3, rot: 'vel' };
    const kyubi = [
        {   // nueve colas que giran como aspas, cada vez más rápido (tú buscas el hueco entre ellas)
            id: 'colas', name: 'LATIGO DE LAS NUEVE COLAS', jp: '尾符「九本の鞭」', minPhase: 1, dur: 330,
            line: 'Mis nueve colas... ¡bailan solas!',
            tick(b, H, t, phase) {
                if (t !== 1) return;
                const n = 9, dir = rnd() < 0.5 ? -1 : 1, a0 = rnd() * TAU, len = Math.min(PH() * 0.72, 470);
                for (let i = 0; i < n; i++) {
                    const ai = a0 + i * TAU / n;
                    limb({
                        x: H.cx, y: H.cy, a: ai, len, segs: 13, w: 26, warn: H.tele + 22 + i * 3, on: 235, col: '#ff9a3a', col2: '#fff0d0', curl: 0.38, curlSpd: 0.1,
                        follow: h => { h.x = bossCx(b); h.y = b.y + b.height * 0.55; },
                        angFn: h => ai + dir * (0.0035 * h.t + 0.000045 * h.t * h.t),
                        step: h => { if (h.t > h.warn && (h.t + i * 7) % Math.round(52 / Math.min(1.4, H.K)) === 0) { const p = h.pts[h.pts.length - 1], q = h.pts[h.pts.length - 2]; shot(p[0], p[1], Math.atan2(p[1] - q[1], p[0] - q[0]), H.sp(0.42), 'k_fire', FIRE); } }
                    });
                }
            }
        },
        slam({
            id: 'embestida', name: 'EMBESTIDA DEL ZORRO', jp: '突進「狐火の疾走」', line: '¡No corras! ¡Es más divertido así!', minPhase: 2, col: '#ff9a3a',
            onImpact(b, H, x, y) {
                zone({ x, y, r: 74, warn: 0, life: 20, fx: 'hurt', col: '#ff9a3a' });
                H.ring(14, rnd() * TAU, H.sp(0.5), 'k_fire', FIRE, x, y);
                H.fan(Math.atan2(pcy() - y, pcx() - x), 0.5, 5, H.sp(0.85), 'k_fball', FBALL, x, y);
            }
        }),
        {   // máscaras de zorro que te apuntan con rayos (se fijan un instante antes de disparar)
            id: 'espejismo', name: 'ESPEJISMO DE MIL ZORROS', jp: '幻「千の狐面」', minPhase: 3, lw: true, dur: 330,
            line: '¿Cuál es el verdadero? ¡Todos!',
            tick(b, H, t, phase) {
                if (t === 1 || t === 120 || t === 235) {
                    for (let i = 0; i < 3; i++) {
                        const x = clamp(PW() * (0.2 + 0.3 * i) + rr(-30, 30), 40, PW() - 40), y = rr(110, 250), warn = H.tele + 16 + i * 24;
                        beam({
                            x, y, a: aimAt(x, y), len: 1500, w: 26, warn, on: 16, col: '#ff9a3a', col2: '#fff3d0', snd: false,
                            track: h => { if (h.t < h.warn - 16) h.a += angDiff(h.a, aimAt(h.x, h.y)) * 0.14; },
                            onFire: h => { sfx(500, 160, 0.14, 'square', 0.04); for (let k = -1; k <= 1; k++) shot(h.x, h.y, h.a + k * 0.3, H.sp(0.7), 'k_fire', FIRE); },
                            cap: h => { const al = Math.min(1, h.t / 14) * Math.min(1, (h.life - h.t) / 10); spr('k_mask', h.x, h.y, 2.4, 0, al); }
                        });
                    }
                }
            }
        }
    ];

    // ============================================================================================
    //  2 · YETI
    // ============================================================================================
    const SHARD = { glow: '#bff6ff', hit: 6, sc: 2 };
    function slide(y, dir, warn, sp) {                     // bloque de nieve que cruza la pantalla por un carril
        const bw = 190, bh = 54;
        return hazard({
            y, x: dir > 0 ? -bw : PW() + bw, warn, bind: true, life: warn + Math.ceil((PW() + bw * 2) / sp) + 6,
            update(h) { if (h.t >= h.warn) h.x += dir * sp; },
            hit(h) { return h.t >= h.warn && Math.abs(pcy() - h.y) < bh / 2 + 2 && Math.abs(pcx() - h.x) < bw / 2 + 2; },
            draw(h) {
                ctx.save();
                if (h.t < h.warn) {
                    const k = h.t / h.warn, fl = Math.floor(h.t / 6) % 2;
                    ctx.globalAlpha = 0.2 + 0.25 * k; ctx.fillStyle = '#bfe8ff'; ctx.fillRect(0, h.y - bh / 2, PW(), bh);
                    ctx.globalAlpha = fl ? 0.95 : 0.4; ctx.fillStyle = '#ffffff'; ctx.font = '20px "Press Start 2P", monospace'; ctx.textAlign = dir > 0 ? 'left' : 'right';
                    ctx.fillText(dir > 0 ? '>>>' : '<<<', dir > 0 ? 8 : PW() - 8, h.y + 8);
                } else {
                    const g = ctx.createLinearGradient(h.x - bw / 2, 0, h.x + bw / 2, 0);
                    g.addColorStop(dir > 0 ? 0 : 1, 'rgba(220,240,255,0)'); g.addColorStop(dir > 0 ? 0.35 : 0.65, 'rgba(230,246,255,0.9)'); g.addColorStop(dir > 0 ? 1 : 0, '#ffffff');
                    ctx.fillStyle = g; ctx.fillRect(h.x - bw / 2, h.y - bh / 2, bw, bh);
                    ctx.fillStyle = '#9fd8f5'; ctx.globalAlpha = 0.8; ctx.fillRect(h.x - bw / 2, h.y + bh / 2 - 6, bw, 6);
                    if (!lowFx()) { ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.7; for (let i = 0; i < 9; i++) ctx.fillRect(h.x - bw / 2 + ((i * 53 + h.t * 3) % bw), h.y - bh / 2 + (i * 17 % bh), 3, 3); }
                }
                ctx.restore();
            }
        });
    }
    const yeti = [
        slam({
            id: 'punetazo', name: 'PUÑO DEL REY', jp: '拳「氷王の鉄槌」', line: '¡Aplastado como un copo!', minPhase: 1, col: '#9fe6ff',
            onImpact(b, H, x, y) {
                zone({ x, y, r: 78, warn: 0, life: 20, fx: 'hurt', col: '#9fe6ff' });
                for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 3; k++) shot(x + s * 30, y, s > 0 ? 0 : PI, H.sp(0.55 + k * 0.14), 'y_shard', SHARD);
                for (let i = 0; i < 5; i++) {                                         // carámbanos que se sueltan del techo alrededor del golpe
                    const ix = clamp(x + (i - 2) * 74, 20, PW() - 20);
                    shot(ix, -10, PI / 2, 0.1, 'y_icicle', { fz: 26 + i * 5, acc: 0.2 * H.K, vmin: 0.1, vmax: H.sp(1.6), hit: 7, sc: 2, rot: 'vel', glow: '#bff6ff' });
                }
            }
        }),
        {   // bloques de nieve que cruzan la pantalla por carriles (sal del carril: arriba o abajo)
            id: 'avalancha', name: 'AVALANCHA', jp: '雪崩「白き大雪崩」', minPhase: 2, dur: 340,
            line: 'Cuidado con la ladera...',
            tick(b, H, t, phase) {
                if (t === 1 || t === 115 || t === 230) {
                    const lanes = phase >= 3 ? 4 : 3, base = clamp(H.py, 190, PH() - 90), dir = rnd() < 0.5 ? -1 : 1;
                    for (let i = 0; i < lanes; i++) {
                        const y = clamp(base + (i - (lanes - 1) / 2) * rr(104, 122) + rr(-16, 16), 165, PH() - 60);
                        slide(y, dir * (i % 2 ? -1 : 1), H.tele + 14 + i * 10, 8.2 * Math.min(1.35, H.K));
                    }
                    H.fan(Math.PI / 2, 0.7, 5, H.sp(0.4), 'y_flake', { glow: '#a8e8ff', hit: 7, sc: 2, rot: 'spin', spin: 0.05 }, undefined, undefined);
                }
            }
        },
        {   // el hielo revienta bajo tus pies, de a uno, y te va siguiendo (no te quedes quieto)
            id: 'grietas', name: 'GRIETAS DE HIELO', jp: '地割「氷の隆起」', minPhase: 3, lw: true, dur: 340,
            line: 'El suelo también es mío.',
            tick(b, H, t, phase) {
                if (t === 1) H.tint('#9fe6ff', 0.1, 330);
                if (t % Math.round(34 / Math.min(1.3, H.K)) === 1 && t < 300) {
                    const spots = [[H.px + rr(-12, 12), H.py + rr(-12, 12)]];
                    if (phase >= 3) { spots.push([H.px - 95, H.py + rr(-30, 30)]); spots.push([H.px + 95, H.py + rr(-30, 30)]); }
                    spots.forEach(([x, y], i) => {
                        x = clamp(x, 40, PW() - 40); y = clamp(y, 150, PH() - 40);
                        const z = zone({ x, y, r: 50, warn: H.tele - 6 + i * 6, life: H.tele + 24 + i * 6, fx: 'hurt', col: '#9fe6ff' });
                        const u0 = z.update;
                        z.update = h => { u0(h); if (h.t === h.warn) { sfx(700, 200, 0.12, 'triangle', 0.04); for (let k = 0; k < 8; k++) shot(h.x, h.y, k * TAU / 8 + h.warn, H.sp(0.5), 'y_shard', SHARD); } };
                    });
                }
            }
        }
    ];

    // ============================================================================================
    //  3 · KRAKEN
    // ============================================================================================
    const KR = { bub: { glow: '#59e6d0', hit: 8, sc: 3, rot: 'none' }, gf: { anim: 8, glow: '#8ffbe0', hit: 7, sc: 3, rot: 'none' }, wave: { hit: 8, sc: 2, glow: '#8ff5ea' } };
    const kraken = [
        {   // tentáculos que salen del fondo, te apuntan, se fijan y barren
            id: 'cazadores', name: 'TENTACULOS CAZADORES', jp: '触手「追跡する深海の腕」', minPhase: 1, dur: 310,
            line: 'Mis brazos te encontrarán...',
            tick(b, H, t, phase) {
                if (t === 1 || t === 100 || t === 200) {
                    const n = phase >= 2 ? 3 : 2, side = (Math.floor(t / 100) % 2) ? -1 : 1;
                    for (let i = 0; i < n; i++) {
                        const x = clamp(H.px + (i - (n - 1) / 2) * 170 * side + rr(-40, 40), 50, PW() - 50), warn = H.tele + 26 + i * 18, sw = (rnd() < 0.5 ? -1 : 1) * 0.014;
                        limb({
                            x, y: PH() + 8, a: -PI / 2, len: PH() * 0.95, segs: 15, w: 34, warn, on: 34, col: '#1fb8a8', col2: '#e8fffb', curl: 0.55, curlSpd: 0.14, suckers: true,
                            track: h => { if (h.t < h.warn - 18) h.a += angDiff(h.a, aimAt(h.x, h.y)) * 0.09; },
                            step: h => { if (h.t > h.warn) h.a += sw; },
                            onFire: h => { const p = h.pts[h.pts.length - 1]; for (let k = 0; k < 6; k++) shot(p[0], p[1], k * TAU / 6, H.sp(0.4), 'u_bubble', KR.bub); }
                        });
                    }
                }
            }
        },
        slam({
            id: 'embate', name: 'EMBATE DEL LEVIATAN', jp: '突進「リヴァイアサンの体当たり」', line: '¡Desde las profundidades!', minPhase: 1, col: '#2fd0b8',
            onImpact(b, H, x, y) {
                zone({ x, y, r: 80, warn: 0, life: 20, fx: 'hurt', col: '#2fd0b8' });
                for (let s = -1; s <= 1; s += 2) for (let k = 0; k < 2; k++) shot(x + s * 40, y, s > 0 ? 0 : PI, H.sp(0.62 + k * 0.12), 'u_wave', KR.wave);
                H.ring(10, rnd() * TAU, H.sp(0.4), 'u_bubble', KR.bub, x, y);
            }
        }),
        {   // un aro de tentáculos se cierra sobre ti: escapa por el hueco antes de que se cierre
            id: 'abrazo', name: 'ABRAZO DEL ABISMO', jp: '抱擁「深淵の抱擁」', minPhase: 3, lw: true, dur: 340,
            line: 'Ven... déjame abrazarte.',
            tick(b, H, t, phase) {
                b._rings = b._rings || [];
                if (t === 1 || (phase >= 3 && t === 170)) {
                    const warn = H.tele, n = 12, gapA = rnd() * TAU, gapW = 1.05, ring = { x: H.px, y: H.py, rot: 0 };
                    b._rings.push(ring);
                    for (let i = 0; i < n; i++) {
                        const a = gapA + gapW / 2 + (i + 0.5) / n * (TAU - gapW);
                        shot(ring.x + C(a) * 200, ring.y + S(a) * 200, 0, 0, 'u_gf', Object.assign({}, KR.gf, {
                            life: warn + 215, extra: tentacleTo(b),
                            upd: bb => {
                                const k = clamp((bb.age - warn) / 150, 0, 1), e = k * k * (3 - 2 * k), R = 200 + (34 - 200) * e, aa = a + ring.rot;
                                bb.x = ring.x + C(aa) * R; bb.y = ring.y + S(aa) * R;
                                bb.width = bb.height = bb.age < warn ? -30 : bb.hit;
                            }
                        }));
                    }
                    sfx(120, 300, 0.3, 'sine', 0.05);
                }
                b._rings.forEach(r => { r.x += (H.px - r.x) * 0.018; r.y += (H.py - r.y) * 0.018; r.rot += 0.01; });
                b._dyT = 26; b._dyK = 0.1;
            },
            end(b) { b._rings = []; b._dyT = 0; }
        }
    ];

    // ============================================================================================
    //  4 · REINA ARAÑA
    // ============================================================================================
    const VEN = { glow: '#6dff4a', hit: 7, sc: 2 };
    const SILK = { glow: '#d8c8ff', hit: 5, sc: 2 };
    const arana = [
        slam({
            id: 'salto', name: 'SALTO DE LA REINA', jp: '跳躍「女王の急襲」', line: '¡Te tengo!', minPhase: 1, col: '#c050ff',
            onImpact(b, H, x, y) {
                zone({ x, y, r: 70, warn: 0, life: 20, fx: 'hurt', col: '#c050ff' });
                zone({ x, y: Math.min(PH() - 60, y + 60), r: 125, warn: 6, life: 230, fx: 'slow', pow: 0.55, col: '#e0d8ff' });      // telaraña pegajosa donde cae
                H.ring(12, rnd() * TAU, H.sp(0.5), 'a_venom', VEN, x, y);
            }
        }),
        {   // dos hilos de seda barren la pantalla en tijera y se cruzan
            id: 'tijeras', name: 'TIJERAS DE SEDA', jp: '糸「絹の鋏」', minPhase: 2, dur: 320,
            line: 'Snip, snip...',
            tick(b, H, t, phase) {
                if (t === 1) {
                    for (const s of [-1, 1]) {
                        beam({
                            x: H.cx, y: H.cy + 20, a: PI / 2 + s * 1.15, len: 1500, w: 20, warn: H.tele + 24, on: 215, col: '#d8c8ff', col2: '#ffffff', rv: -s * 0.0095,
                            follow: h => { h.x = bossCx(b); h.y = b.y + b.height * 0.7; }
                        });
                    }
                }
                if (t > 40 && t % H.iv(46) === 0) H.fan(H.ang, 0.5, 3, H.sp(0.55), 'a_silk', SILK);
            }
        },
        {   // crías que bajan por un hilo justo donde estás (se mueven en cada caída)
            id: 'emboscada', name: 'EMBOSCADA DE CRIAS', jp: '伏兵「糸を伝う子蜘蛛」', minPhase: 3, lw: true, dur: 340,
            line: 'Mis niñas tienen hambre.',
            tick(b, H, t, phase) {
                if (t % Math.round(34 / Math.min(1.3, H.K)) === 1 && t < 290) {
                    const x = clamp(H.px + rr(-18, 18), 26, PW() - 26), warn = H.tele - 8;
                    beam({ x, y: -10, a: PI / 2, len: PH() + 30, w: 8, warn, on: 14, col: '#e0d8ff', col2: '#ffffff', snd: false });
                    shot(x, 24, PI / 2, 0.1, 'a_spider', { fz: warn, acc: 0.32 * H.K, vmin: 0.1, vmax: H.sp(2.3), hit: 10, sc: 3, rot: 'none', glow: '#c050ff' });
                }
                if (t % H.iv(60) === 30) H.fan(H.ang, 0.4, 3, H.sp(0.5), 'a_venom', VEN);
            }
        }
    ];

    // ============================================================================================
    //  5 · ARCHILICHE
    // ============================================================================================
    const archiliche = [
        {   // libros que te rodean, se quedan quietos (con aviso) y se lanzan hacia donde estabas
            id: 'libros', name: 'BIBLIOTECA VIVA', jp: '書符「生きた図書館」', minPhase: 1, dur: 320,
            line: 'Silencio. Estoy leyendo... en voz alta.',
            tick(b, H, t, phase) {
                if (t === 1 || t === 110 || (phase >= 2 && t === 200)) {
                    const n = phase >= 2 ? 5 : 4, R = 150 + rnd() * 30, a0 = rnd() * TAU, cx = H.px, cy = H.py;
                    for (let i = 0; i < n; i++) {
                        const a = a0 + i * TAU / n, x = clamp(cx + C(a) * R, 24, PW() - 24), y = clamp(cy + S(a) * R, 46, PH() - 24), rel = H.tele + 6 + i * 5;
                        shot(x, y, 0, 0.01, 'r_book', {
                            sc: 3, hit: 12, glow: '#c58aff', rot: 'none', fz: rel,
                            onThaw: bb => { const ang = aimAt(bb.x, bb.y); bb.vx = C(ang) * 0.2; bb.vy = S(ang) * 0.2; bb.acc = 0.16 * H.K; bb.vmin = 0.2; bb.vmax = H.sp(2.0); sfx(420, 160, 0.1, 'square', 0.035); },
                            extra: bb => { if (bb.fz > 0) { ctx.globalAlpha = 0.45; ctx.strokeStyle = '#c58aff'; ctx.lineWidth = 2; ctx.setLineDash([6, 8]); ctx.beginPath(); ctx.moveTo(bb.x, bb.y); ctx.lineTo(pcx(), pcy()); ctx.stroke(); ctx.setLineDash([]); } }
                        });
                    }
                }
            }
        },
        {   // se teletransporta y traza una estrella de rayos que gira
            id: 'sello', name: 'SELLO ESTRELLA', jp: '星符「五芒星の封印」', minPhase: 2, dur: 320,
            line: 'Un círculo bien trazado... no perdona.',
            tick(b, H, t, phase) {
                if (t <= 26) H.blink();
                if (t === 30) {
                    const dir = rnd() < 0.5 ? -1 : 1, a0 = rnd() * TAU;
                    for (let i = 0; i < 10; i++) {
                        beam({
                            x: H.cx, y: H.cy, a: a0 + i * PI / 5, len: 1100, w: 22, warn: H.tele + 10, on: 190, col: '#c58aff', col2: '#ffffff', rv: dir * 0.0072, snd: i === 0,
                            follow: h => { h.x = bossCx(b); h.y = b.y + b.height / 2; }
                        });
                    }
                }
                if (t > 70 && t % H.iv(58) === 0) H.ring(8, rnd() * TAU, H.sp(0.38), 'r_rune', { glow: '#c58aff', hit: 7, sc: 2, anim: 8 });
            }
        },
        {   // estanterías que caen por carriles: solo quedan a salvo dos carriles
            id: 'estanteria', name: 'ESTANTERIAS', jp: '書架「崩れ落ちる本棚」', minPhase: 3, lw: true, dur: 340,
            line: '¡Cuidado con la sección de historia!',
            tick(b, H, t, phase) {
                if (t === 1 || t === 105 || t === 210) {
                    const N = 5, lw = PW() / N, mine = clamp(Math.floor(H.px / lw) + Math.floor(rnd() * 3) - 1, 0, N - 1);
                    let other = Math.floor(rnd() * N); if (other === mine) other = (other + 2) % N;
                    for (let i = 0; i < N; i++) {
                        if (i === mine || i === other) continue;
                        const r = J.rect({ x: i * lw + 2, y: 0, w: lw - 4, h: PH(), warn: H.tele + 8, life: H.tele + 30, col: '#7a2a9a' });
                        r.update = h => { if (h.t === h.warn) { sfx(160, 60, 0.2, 'sawtooth', 0.05); screenShake = Math.max(screenShake, 8); for (let k = 0; k < 3; k++) shot(h.x + h.w / 2 + (k - 1) * 18, 20, PI / 2, H.sp(0.4 + k * 0.08), 'r_page', { glow: '#f4e8c4', hit: 7, sc: 2, anim: 8 }); } };
                    }
                }
            }
        }
    ];

    // ============================================================================================
    //  6 · COLOSO DEL RELOJ
    // ============================================================================================
    const CH = { sc: 2, hit: 7, glow: '#f0c040', rot: 'none' };
    function pile(x, w, maxH, warn, grow, hold) {
        return hazard({
            x, w, warn, bind: true, life: warn + grow + hold,
            hh(h) { return maxH * Math.min(1, Math.max(0, (h.t - h.warn) / grow)); },
            hit(h) { return h.t >= h.warn && pcx() > h.x + 1 && pcx() < h.x + h.w - 1 && pcy() > PH() - h.hh(h) + 2; },
            draw(h) {
                ctx.save();
                if (h.t < h.warn) { ctx.globalAlpha = 0.2 + 0.25 * S(h.t * 0.5); ctx.fillStyle = '#e8c46a'; ctx.fillRect(h.x, PH() - 14, h.w, 14); }
                else {
                    const hh = h.hh(h), fade = Math.min(1, (h.life - h.t) / 20);
                    ctx.globalAlpha = 0.92 * fade; ctx.fillStyle = '#c89a3a'; ctx.beginPath(); ctx.moveTo(h.x - 14, PH()); ctx.lineTo(h.x + h.w / 2, PH() - hh); ctx.lineTo(h.x + h.w + 14, PH()); ctx.closePath(); ctx.fill();
                    ctx.fillStyle = '#f0d078'; ctx.beginPath(); ctx.moveTo(h.x + 6, PH()); ctx.lineTo(h.x + h.w / 2, PH() - hh); ctx.lineTo(h.x + h.w * 0.6, PH()); ctx.closePath(); ctx.fill();
                }
                ctx.restore();
            }
        });
    }
    const coloso = [
        slam({
            id: 'pisoton', name: 'PISOTON DEL COLOSO', jp: '踏潰「時計巨人の足音」', line: 'Tic... tac... ¡PUM!', minPhase: 1, col: '#f0c040',
            onImpact(b, H, x, y) {
                zone({ x, y, r: 80, warn: 0, life: 20, fx: 'hurt', col: '#f0c040' });
                zone({ x, y, r: 135, warn: 4, life: 130, fx: 'slow', pow: 0.6, col: '#c8d8f0' });
                H.ring(14, rnd() * TAU, H.sp(0.55), 'c_chime', CH, x, y);
            }
        }),
        {   // montones de arena que suben desde el suelo y te empujan hacia arriba
            id: 'arena', name: 'RELOJ DE ARENA', jp: '砂符「満ちる砂時計」', minPhase: 2, dur: 340,
            line: 'Cada grano es un segundo menos.',
            tick(b, H, t, phase) {
                if (t === 1) {
                    const n = phase >= 3 ? 4 : 3, slot = PW() / n;
                    for (let i = 0; i < n; i++) {
                        const w = 78 + rnd() * 30, x = clamp(i * slot + rr(8, Math.max(9, slot - w - 8)), 6, PW() - w - 6);
                        pile(x, w, rr(190, 250), H.tele + 10 + i * 12, 150, 110);
                    }
                    H.tint('#c89a3a', 0.07, 330);
                }
                if (t % H.iv(14) === 0 && t < 300) { const x = rr(20, PW() - 20); shot(x, -6, PI / 2 + rr(-0.1, 0.1), H.sp(0.5 + rnd() * 0.3), 'd_sand', { glow: '#e8c46a', hit: 5, sc: 2, rot: 'none' }); }
            }
        },
        {   // once campanadas: cada una lanza un anillo con un hueco hacia donde estás tú (tienes que ir al hueco)
            id: 'campanadas', name: 'CAMPANADAS', jp: '鐘「十二の鐘」', minPhase: 3, lw: true, dur: 345,
            line: '¡Las doce! Es hora.',
            tick(b, H, t, phase) {
                if ((t - 1) % 30 === 0 && t <= 11 * 30) {
                    const n = 20, gapA = H.ang + rr(-0.5, 0.5), gapH = 0.3, sp = H.sp(0.62);
                    for (let i = 0; i < n; i++) { const a = gapA + gapH + (i + 0.5) / n * (TAU - 2 * gapH); shot(H.cx, H.cy, a, sp, 'c_chime', CH); }
                    sfx(520, 380, 0.25, 'sine', 0.06); H.shake(4);
                }
            }
        }
    ];

    // ============================================================================================
    //  7 · OJO CARMESÍ  (no se mueve del sitio: sus ataques vienen de ojos, venas y de su mirada)
    // ============================================================================================
    const ojo = [
        {   // ojillos que aparecen por la pantalla, te siguen con la mirada y disparan un rayo (se fijan antes)
            id: 'ojitos', name: 'EJERCITO DE OJOS', jp: '眼符「千眼の軍勢」', minPhase: 1, dur: 300,
            line: 'Te estamos viendo.',
            tick(b, H, t, phase) {
                const gap = phase >= 2 ? 30 : 36, total = phase >= 2 ? 7 : 6;
                if ((t - 1) % gap === 0 && (t - 1) / gap < total) {
                    const x = rr(40, PW() - 40), y = rr(110, PH() * 0.52), warn = H.tele + 18;
                    beam({
                        x, y, a: aimAt(x, y), len: 1400, w: 24, warn, on: 16, col: '#ff3050', col2: '#fff0f0', snd: false,
                        track: h => { if (h.t < h.warn - 14) h.a += angDiff(h.a, aimAt(h.x, h.y)) * 0.16; },
                        onFire: h => { sfx(600, 180, 0.12, 'square', 0.04); H.fan(h.a, 0.28, 3, H.sp(0.75), 'o_tear', { glow: '#ff3050', hit: 7, sc: 2.5 }, h.x, h.y); },
                        cap: h => {
                            const al = Math.min(1, h.t / 12) * Math.min(1, (h.life - h.t) / 10); spr('o_eye', h.x, h.y, 3.2, 0, al);
                            ctx.save(); ctx.globalAlpha = al; ctx.fillStyle = '#c01030'; ctx.beginPath(); ctx.arc(h.x + C(h.a) * 6, h.y + S(h.a) * 6, 4.5, 0, TAU); ctx.fill(); ctx.restore();
                        }
                    });
                }
            }
        },
        {   // la pupila se abre y te atrae hacia el ojo mientras lanza anillos con hueco
            id: 'pupila', name: 'PUPILA ABISMAL', jp: '瞳「深淵の瞳孔」', minPhase: 2, dur: 300,
            line: 'Acércate. Mírame a los ojos.',
            tick(b, H, t, phase) {
                if (t === 1) {
                    zone({ x: H.cx, y: H.cy, r: 430, warn: 26, life: 270, fx: 'pull', pow: 1.0 * Math.min(1.2, H.K), col: '#7a0a20' });
                    zone({ x: H.cx, y: H.cy, r: 30, warn: 40, life: 270, fx: 'hurt', col: '#200008' });
                    H.tint('#400010', 0.1, 290);
                }
                if (t % H.iv(46) === 20) {
                    const n = 16, gapA = H.ang + rr(-0.6, 0.6), gapH = 0.34;
                    for (let i = 0; i < n; i++) { const a = gapA + gapH + (i + 0.5) / n * (TAU - 2 * gapH); H.shot(a, H.sp(0.42), 'o_orb', { glow: '#ff3050', hit: 8, sc: 2.4, rot: 'none' }); }
                }
            }
        },
        {   // venas del ojo que te apuntan, se fijan y azotan la pantalla
            id: 'venas', name: 'VENAS CARMESI', jp: '血管「紅き視神経」', minPhase: 3, lw: true, dur: 340,
            line: 'Siente cómo late.',
            tick(b, H, t, phase) {
                if (t === 1 || t === 150) {
                    const n = 5;
                    for (let i = 0; i < n; i++) {
                        const warn = H.tele + 16 + i * 9, sw = (i % 2 ? -1 : 1) * 0.013;
                        limb({
                            x: H.cx, y: H.cy, a: PI / 2 + (i - (n - 1) / 2) * 0.55, len: Math.min(PH() * 0.8, 540), segs: 14, w: 28, warn, on: 70, col: '#a0102a', col2: '#ff6a80', curl: 0.5, curlSpd: 0.13,
                            follow: h => { h.x = bossCx(b); h.y = b.y + b.height / 2; },
                            track: h => { if (h.t < h.warn - 16) h.a += angDiff(h.a, aimAt(h.x, h.y) + (i - (n - 1) / 2) * 0.3) * 0.08; },
                            step: h => { if (h.t > h.warn) h.a += sw; },
                            onFire: h => { const p = h.pts[h.pts.length - 1]; for (let k = 0; k < 5; k++) shot(p[0], p[1], k * TAU / 5, H.sp(0.4), 'o_orb', { glow: '#ff3050', hit: 8, sc: 2.2, rot: 'none' }); }
                        });
                    }
                }
            }
        }
    ];

    // ============================================================================================
    //  REGISTRO
    // ============================================================================================
    function install() {
        if (!CFG.enabled) return;
        J.addAttacks(0, kyubi); J.addAttacks(1, yeti); J.addAttacks(2, kraken); J.addAttacks(3, arana);
        J.addAttacks(4, archiliche); J.addAttacks(5, coloso); J.addAttacks(6, ojo);
    }
    install();
    window.JefesDin = { cfg: CFG, limb, slam, groups: { kyubi, yeti, kraken, arana, archiliche, coloso, ojo } };
})();
