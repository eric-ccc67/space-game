/* ===== naves_fx.js ===== */
// ============================================================================================
//  ANIMACIONES DE LAS 7 NAVES  ·  v33
// --------------------------------------------------------------------------------------------
//  Capa de efectos que se dibuja ALREDEDOR de la nave (detrás y delante), sin tocar su sprite ni su hitbox
//  (el punto verde del centro sigue exactamente donde estaba). Cada nave tiene su propio carácter:
//    1 Tanque  → escape doble con chispas y humo pesado que se dispersa
//    2 Sniper  → cintas de energía en las alas, destello de mira en la punta y chispa azul de escape
//    3 Ligera  → líneas de velocidad al moverte, arcos eléctricos entre las alas y escape amarillo
//    4 Omega   → anillo de plasma giratorio con perlas orbitando, núcleo que late y brasas que suben
//    5 Reimu   → pétalos de sakura, destellos rojiblancos y aura roja que respira
//    6 Marisa  → lluvia de estrellitas doradas/moradas y aura mágica
//    7 Goku    → aura de ki con llamas puntiagudas, chispas eléctricas azules y partículas de ki
//  Todas: destello al disparar y escape que crece al moverte. En modo de bajo rendimiento se reduce todo.
//  v34 — POSES DEL CUERPO: la nave se inclina y se estira al moverse, "patea" hacia atrás al disparar (cada nave con su
//  fuerza: el Sniper como un cañón, la Ligera casi nada) y hace un giro completo con onda expansiva al lanzar una bomba.
//  El centro (punto verde del hitbox) no se mueve: todo gira/escala alrededor de él.
//  Desactivar: quita <script src="naves_fx.js"> de index.html. Se carga DESPUÉS de juego.js.
// ============================================================================================
(function () {
    'use strict';
    if (typeof Player === 'undefined') return;
    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
    const low = () => (typeof performanceMode !== 'undefined' && performanceMode);
    const rnd = (a, b) => a + Math.random() * (b - a);

    const PT = [];                                   // partículas
    const F = { t: 0, lx: null, ly: null, vx: 0, vy: 0, flash: 0, ls: 0, type: 0, trailL: [], trailR: [] };
    const GL = {};
    function glow(col, r) {
        const k = col + r; if (GL[k]) return GL[k];
        const cv = document.createElement('canvas'); cv.width = cv.height = r * 2;
        const g = cv.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
        gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
        return (GL[k] = cv);
    }
    function add(o) { if (PT.length > (low() ? 40 : 110)) PT.shift(); o.age = 0; PT.push(o); }
    function spark(x, y, vx, vy, life, col, size, kind) { add({ x, y, vx, vy, life, col, size: size || 3, kind: kind || 'spark', ph: Math.random() * 6 }); }

    // colores por nave
    const COL = { 1: ['#9aff80', '#ffd060'], 2: ['#7ae0ff', '#ffffff'], 3: ['#ffe66a', '#ffffff'], 4: ['#ff7a3a', '#ffd060'], 5: ['#ff8a96', '#ffffff'], 6: ['#ffd83a', '#c07aff'], 7: ['#ffe14a', '#8ad0ff'] };
    const AURA = { 1: null, 2: '#4aa8ff', 3: '#ffe14a', 4: '#ff3a2a', 5: '#ff4a5a', 6: '#a05aff', 7: '#ffcf3a' };

    // ---------------------------------------------------------------- lógica por cuadro
    function step(p, cx, cy) {
        if (F.type !== p.type || F.lx === null || Math.hypot(cx - F.lx, cy - F.ly) > 80) { PT.length = 0; F.trailL = []; F.trailR = []; F.type = p.type; F.lx = cx; F.ly = cy; F.flash = 0; F.ls = p.lastShoot || 0; }
        F.t++;
        F.vx = cx - F.lx; F.vy = cy - F.ly; F.lx = cx; F.ly = cy;
        const sp = Math.hypot(F.vx, F.vy), moving = sp > 0.4, th = Math.max(0.5, p.thrust || 0.6), L = low() ? 2 : 1, t = F.t;
        const col = COL[p.type] || COL[1];
        if ((p.lastShoot || 0) !== F.ls) { F.ls = p.lastShoot || 0; F.flash = 5; }
        if (F.flash > 0) F.flash--;

        switch (p.type) {
            case 1:
                if (t % L === 0) { spark(cx - 9, cy + 20, rnd(-0.4, 0.4), 1.8 + th * 1.8, 20, col[0], 4); spark(cx + 9, cy + 20, rnd(-0.4, 0.4), 1.8 + th * 1.8, 20, col[1], 4); }
                if (t % (4 * L) === 0) { add({ x: cx + (t % 8 ? 9 : -9), y: cy + 20, vx: rnd(-0.25, 0.25), vy: 0.7, life: 44, col: '#9aaa8c', size: 6, kind: 'smoke' }); }
                break;
            case 2:
                if (t % (2 * L) === 0) spark(cx + rnd(-2, 2), cy + 20, rnd(-0.2, 0.2), 2 + th * 1.5, 14, col[t % 4 ? 0 : 1], 3);
                F.trailL.push({ x: cx - 13, y: cy + 8 }); F.trailR.push({ x: cx + 13, y: cy + 8 });
                if (F.trailL.length > 16) { F.trailL.shift(); F.trailR.shift(); }
                break;
            case 3:
                if (t % L === 0) { spark(cx - 8, cy + 19, rnd(-0.3, 0.3), 2.2 + th * 2, 13, col[0], 3); spark(cx + 8, cy + 19, rnd(-0.3, 0.3), 2.2 + th * 2, 13, col[1], 3); }
                if (moving && t % 2 === 0) { for (const s of [-1, 1]) add({ x: cx + s * rnd(10, 20), y: cy + rnd(-8, 12), vx: -F.vx * 0.9, vy: -F.vy * 0.9, life: 10, col: '#fff27a', size: 2, len: 14 + sp * 2, kind: 'streak' }); }
                break;
            case 4:
                if (t % (3 * L) === 0) spark(cx + rnd(-14, 14), cy + rnd(-4, 14), rnd(-0.3, 0.3), -rnd(0.4, 1.0), 30, col[t % 2], 2, 'ember');
                if (t % L === 0) spark(cx + rnd(-4, 4), cy + 20, rnd(-0.4, 0.4), 2 + th * 2, 18, '#ff4a2a', 4);
                break;
            case 5:
                if (t % (4 * L) === 0) add({ x: cx + rnd(-16, 16), y: cy + rnd(-6, 12), vx: rnd(-0.3, 0.3), vy: rnd(0.5, 1.0), life: 80, col: t % 8 ? '#ff9ecb' : '#ffd9ea', size: 5, kind: 'petal' });
                if (t % (11 * L) === 0) spark(cx + rnd(-18, 18), cy + rnd(-16, 14), 0, -0.2, 20, t % 22 ? '#ffffff' : '#ff5a6a', 3, 'diamond');
                if (t % (3 * L) === 0) spark(cx + rnd(-3, 3), cy + 20, rnd(-0.2, 0.2), 1.5 + th, 12, col[t % 4 ? 0 : 1], 2);
                break;
            case 6:
                if (t % (2 * L) === 0) add({ x: cx + rnd(-6, 6), y: cy + 18, vx: rnd(-0.5, 0.5), vy: rnd(0.8, 1.7), life: 40, col: t % 4 ? col[0] : col[1], size: 6, kind: 'star' });
                if (t % (23 * L) === 0) for (let i = 0; i < 5; i++) add({ x: cx, y: cy + 14, vx: rnd(-1.4, 1.4), vy: rnd(0.2, 1.6), life: 30, col: col[i % 2], size: 4, kind: 'star' });
                break;
            case 7:
                if (t % L === 0) spark(cx + rnd(-14, 14), cy + rnd(-2, 18), rnd(-0.2, 0.2), -rnd(0.8, 2.0), 28, col[t % 6 ? 0 : 1], 3, 'ember');
                break;
        }
        for (let i = PT.length - 1; i >= 0; i--) {
            const q = PT[i]; q.age++; q.x += q.vx; q.y += q.vy;
            if (q.kind === 'petal') q.x += S(q.age * 0.15 + q.ph) * 0.7; else if (q.kind === 'smoke') q.size += 0.12; else if (q.kind === 'star') q.vy += 0.03;
            if (q.age > q.life) PT.splice(i, 1);
        }
    }

    // ---------------------------------------------------------------- dibujo
    function drawParticles() {
        ctx.save();
        for (let i = 0; i < PT.length; i++) {
            const q = PT[i], k = 1 - q.age / q.life, x = Math.round(q.x), y = Math.round(q.y), s = Math.max(1, Math.round(q.size * (q.kind === 'smoke' ? 1 : (0.5 + 0.5 * k))));
            if (q.kind === 'smoke') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 0.6 * k; ctx.fillStyle = q.col; ctx.fillRect(x - s / 2, y - s / 2, s, s); continue; }
            if (q.kind === 'petal') { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, k * 1.6); ctx.fillStyle = q.col; ctx.fillRect(x, y, s, s - 1); ctx.fillStyle = '#c0506f'; ctx.fillRect(x, y + s - 1, s, 1); continue; }
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.min(1, k * 1.4); ctx.fillStyle = q.col;
            if (q.kind === 'streak') { ctx.fillRect(x - Math.abs(q.vx) * 1.2 - (q.len || 10) * 0.2, y, Math.max(2, (q.len || 10) * 0.5), 2); }
            else if (q.kind === 'star') { const tw = (Math.floor(q.age / 3) & 1) ? 1 : 0.6; ctx.globalAlpha = Math.min(1, k * 1.5) * tw; ctx.fillRect(x - 1, y - s, 2, s * 2); ctx.fillRect(x - s, y - 1, s * 2, 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - 1, y - 1, 2, 2); }
            else if (q.kind === 'diamond') { ctx.fillRect(x - 1, y - 3, 2, 6); ctx.fillRect(x - 3, y - 1, 6, 2); }
            else ctx.fillRect(x - s / 2, y - s / 2, s, s);
        }
        ctx.restore();
    }
    function drawBehind(p, cx, cy) {
        const t = F.t, ty = p.type, ac = AURA[ty];
        ctx.save();
        if (ac && !low()) {                                   // aura que respira
            const r = 40 + 6 * S(t * 0.09), a = ty === 7 ? 0.95 : 0.6;
            ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * (0.8 + 0.2 * S(t * 0.13));
            ctx.drawImage(glow(ac, 40), cx - r, cy - r + 2, r * 2, r * 2);
        }
        if (ty === 4) {                                       // anillo de plasma + perlas
            ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#ff6a3a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.5; ctx.setLineDash([6, 6]); ctx.lineDashOffset = -t * 0.8;
            ctx.beginPath(); ctx.arc(cx, cy, 31, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            for (let i = 0; i < 4; i++) { const a = t * 0.06 + i * TAU / 4; ctx.globalAlpha = 0.95; ctx.fillStyle = '#ffd060'; ctx.fillRect(Math.round(cx + C(a) * 31) - 2, Math.round(cy + S(a) * 31) - 2, 4, 4); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx + C(a) * 31) - 1, Math.round(cy + S(a) * 31) - 1, 2, 2); }
            if (!low()) { const pr = 14 + 4 * S(t * 0.2); ctx.globalAlpha = 0.55; ctx.drawImage(glow('#ff5a2a', 20), cx - pr, cy + 4 - pr, pr * 2, pr * 2); }
        }
        if (ty === 7 && !low()) {                             // llamas puntiagudas de ki
            ctx.globalCompositeOperation = 'lighter';
            for (let i = 0; i < 9; i++) {
                const a = i * TAU / 9 + S(t * 0.05 + i) * 0.12, len = 36 + 11 * S(t * 0.21 + i * 1.7) + (i % 2) * 9, bx = cx + C(a) * 15, by = cy + S(a) * 15;
                ctx.globalAlpha = 0.42 + 0.14 * S(t * 0.3 + i); ctx.fillStyle = '#ffcf3a';
                ctx.beginPath(); ctx.moveTo(bx + C(a + 1.57) * 6, by + S(a + 1.57) * 6); ctx.lineTo(cx + C(a) * len, cy + S(a) * len); ctx.lineTo(bx + C(a - 1.57) * 6, by + S(a - 1.57) * 6); ctx.fill();
            }
        }
        if (ty === 2 && F.trailL.length > 2) {                // cintas de energía de las alas
            ctx.globalCompositeOperation = 'lighter'; ctx.lineWidth = 3;
            for (const tr of [F.trailL, F.trailR]) for (let i = 1; i < tr.length; i++) { ctx.globalAlpha = i / tr.length * 0.55; ctx.strokeStyle = '#6ad0ff'; ctx.beginPath(); ctx.moveTo(tr[i - 1].x, tr[i - 1].y + (tr.length - i) * 0.9); ctx.lineTo(tr[i].x, tr[i].y + (tr.length - i - 1) * 0.9); ctx.stroke(); }
        }
        ctx.restore();
    }
    function drawFront(p, cx, cy) {
        const t = F.t, ty = p.type;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        if (ty === 2 && t % 130 < 12) {                       // destello de la mira
            const k = (t % 130) / 12, s = 3 + 7 * S(k * Math.PI);
            ctx.globalAlpha = 0.95; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(cx) - 1, Math.round(cy - 25 - s), 2, s * 2); ctx.fillRect(Math.round(cx - s), Math.round(cy - 25) - 1, s * 2, 2);
        }
        if (ty === 3 && t % 44 < 4) {                         // arco eléctrico entre las alas
            ctx.strokeStyle = '#fff6a0'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(cx - 20, cy + 7);
            for (let i = 1; i <= 6; i++) ctx.lineTo(cx - 20 + i * 6.7, cy + 7 + (i % 2 ? -6 : 5) * (i === 6 ? 0 : 1)); ctx.stroke();
        }
        if (ty === 7 && t % 53 < 4) {                         // chispa azul del Super Saiyan
            ctx.strokeStyle = '#8ad8ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.95; const sx = cx + rnd(-16, 16), sy = cy + rnd(-18, 8);
            ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + rnd(-6, 6), sy + 6); ctx.lineTo(sx + rnd(-8, 8), sy + 11); ctx.lineTo(sx + rnd(-8, 8), sy + 17); ctx.stroke();
        }
        if (F.flash > 0 && ty !== 7) {                        // destello de disparo en la punta
            const c = (COL[ty] || COL[1])[1], k = F.flash / 5;
            ctx.globalAlpha = 0.9 * k; ctx.drawImage(glow(c, 16), cx - 16, cy - 30 - 16 * (1 - k), 32, 32);
        }
        ctx.restore();
    }


    // ---------------------------------------------------------------- POSES DEL CUERPO (inclinación, retroceso, giro de bomba)
    const POSE = {            // lean = inclinación por px/cuadro · max = tope · squash = estrechamiento al correr · recoil = patada al disparar · idle = respiración
        1: { lean: 0.030, max: 0.20, squash: 0.014, recoil: 0.16, idle: 0.012 },
        2: { lean: 0.036, max: 0.24, squash: 0.010, recoil: 0.24, idle: 0.008 },
        3: { lean: 0.062, max: 0.42, squash: 0.008, recoil: 0.06, idle: 0.010 },
        4: { lean: 0.026, max: 0.16, squash: 0.016, recoil: 0.13, idle: 0.022 },
        5: { lean: 0.046, max: 0.30, squash: 0.010, recoil: 0.08, idle: 0.014 },
        6: { lean: 0.052, max: 0.34, squash: 0.010, recoil: 0.09, idle: 0.016 },
        7: { lean: 0.044, max: 0.28, squash: 0.011, recoil: 0.11, idle: 0.012 }
    };
    const K = { lean: 0, sy: 1, rec: 0, bombT: 0, bombWas: false, ls: 0, lx: null, ly: null, t: 0, vx: 0, vy: 0, ring: 0 };
    const BOMB_FRAMES = 38;
    function tickPose(p) {
        const cx = p.x, cy = p.y;
        if (K.lx === null || Math.abs(cx - K.lx) + Math.abs(cy - K.ly) > 90) { K.lx = cx; K.ly = cy; K.lean = 0; K.sy = 1; K.rec = 0; K.bombT = 0; }
        K.t++; K.vx = cx - K.lx; K.vy = cy - K.ly; K.lx = cx; K.ly = cy;
        const P = POSE[p.type] || POSE[1];
        K.lean += (Math.max(-P.max, Math.min(P.max, K.vx * P.lean * 4)) - K.lean) * 0.22;
        K.sy += ((1 + Math.max(-0.07, Math.min(0.10, -K.vy * 0.014))) - K.sy) * 0.25;
        if ((p.lastShoot || 0) !== K.ls) { K.ls = p.lastShoot || 0; K.rec = 1; }
        K.rec *= 0.78;
        const bomb = (typeof bombEffect !== 'undefined' && bombEffect && bombEffect.active);
        if (bomb && !K.bombWas) { K.bombT = BOMB_FRAMES; K.ring = 0; }
        K.bombWas = !!bomb; if (K.bombT > 0) { K.bombT--; K.ring++; }
    }
    function poseXform(p) {
        const P = POSE[p.type] || POSE[1], sp = Math.min(1, Math.abs(K.vx) / 4);
        let rot = K.lean * 0.55, sx = 1 - Math.abs(K.vx) * P.squash, sy = K.sy;
        const breath = 1 + P.idle * S(K.t * 0.08); sx *= breath; sy *= breath;
        sy *= 1 - K.rec * P.recoil * 0.55; sx *= 1 + K.rec * P.recoil * 0.4;       // patada al disparar
        if (p.type === 6) rot += S(K.t * 0.07) * 0.035;                              // Marisa se mece sobre su escoba
        if (p.type === 3 && sp > 0.5) rot += S(K.t * 0.9) * 0.02;                    // la Ligera vibra a toda velocidad
        if (K.bombT > 0) {                                                           // giro completo con "pop" al lanzar la bomba
            const k = 1 - K.bombT / BOMB_FRAMES, e = 1 - Math.pow(1 - k, 3);
            rot += e * TAU; const pop = 1 + 0.5 * S(Math.PI * Math.min(1, k * 1.15)); sx *= pop; sy *= pop;
        }
        return { rot, sx: Math.max(0.6, sx), sy: Math.max(0.6, sy) };
    }
    function drawBombRing(p, cx, cy) {
        if (K.bombT <= 0 && K.ring > BOMB_FRAMES) return;
        const k = Math.min(1, K.ring / BOMB_FRAMES), col = (COL[p.type] || COL[1])[1], r = 12 + k * 110;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = (1 - k) * 0.9; ctx.strokeStyle = col; ctx.lineWidth = 4 * (1 - k) + 1; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r * 0.62, 0, TAU); ctx.stroke();
        if (k < 0.45 && !low()) { ctx.globalAlpha = (0.45 - k) * 1.6; ctx.drawImage(glow(col, 36), cx - 36, cy - 36, 72, 72); }
        ctx.restore();
    }

    // ---------------------------------------------------------------- enganche
    const prevDraw = Player.prototype.draw;
    Player.prototype.draw = function () {
        if (typeof currentMode !== 'undefined' && currentMode === 'clasico') return prevDraw.call(this);
        if (typeof Cine !== 'undefined' && Cine.hidesPlayer && Cine.hidesPlayer()) { PT.length = 0; K.lx = null; return prevDraw.call(this); }
        try { tickPose(this); } catch (e) {}
        const blink = Date.now() < invulnerableUntil && Math.floor(Date.now() / 150) % 2 === 0;
        if (blink && K.bombT <= 0) return prevDraw.call(this);                     // parpadeo de invulnerabilidad (salvo durante el giro de la bomba)
        const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
        try { step(this, cx, cy); drawBehind(this, cx, cy); drawParticles(); } catch (e) {}
        let xf = null; try { xf = poseXform(this); } catch (e) {}
        const iu = invulnerableUntil; if (blink) invulnerableUntil = 0;          // la nave se ve entera mientras gira
        ctx.save();
        if (xf) { ctx.translate(cx, cy); ctx.rotate(xf.rot); ctx.scale(xf.sx, xf.sy); ctx.translate(-cx, -cy); }
        try { prevDraw.call(this); } finally { ctx.restore(); invulnerableUntil = iu; }
        try { drawFront(this, cx, cy); drawBombRing(this, cx, cy); } catch (e) {}
    };
    window.NavesFX = { particles: () => PT.length };
})();
