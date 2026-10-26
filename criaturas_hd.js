// ============================================================================
//  criaturas_hd.js — v57 · ENEMIGOS, MINI JEFES Y JEFES EN ALTA DEFINICIÓN (suaves, con animación fluida)
// ----------------------------------------------------------------------------
//  Antes, todas las criaturas se veían como sprites 8-bit de 2 cuadros (shmup_retro.js) o pixelados a 40 colores con tramado
//  (pixelart.js). Este archivo se engancha a PX.draw y dibuja las criaturas vectoriales de cada nivel (criaturas.js) con:
//    · definición alta y bordes suaves (sin paleta reducida ni tramado), con luz arriba-izquierda / sombra abajo-derecha
//    · animación CONTINUA: respiran, flotan, se balancean e inclinan hacia donde se mueven; aparecen con un "pop" elástico
//    · poses más bonitas: carga (se aplastan, tiemblan y brillan + chispas que se juntan), lanzamiento (aura y anillos),
//      rebote elástico al disparar y destello blanco al recibir un golpe, y un resplandor suave del color del nivel
//  Se re-dibuja cada 2-3 cuadros y se reutiliza (casi no gasta). En "modo rendimiento" baja la resolución y los efectos.
//  Botón "ENEMIGOS: HD/RETRO" en el menú de pausa. Consola: CriaturasHD.enabled = false  (vuelve al estilo retro anterior)
// ============================================================================
(function () {
    'use strict';
    if (typeof PX === 'undefined' || typeof PX.draw !== 'function') return;
    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos, clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const KEY = 'sg_hd_creatures';
    const HD = window.CriaturasHD = { enabled: true, stats: { baked: 0 } };
    try { HD.enabled = localStorage.getItem(KEY) !== '0'; } catch (e) {}
    const K = { enemy: { dom: 124, step: 2, res: 1.7 }, mini: { dom: 138, step: 2, res: 1.5 }, boss: { dom: 150, step: 3, res: 1.35 } };
    const low = () => { try { return !!performanceMode; } catch (e) { return false; } };
    const easeBack = x => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

    function bake(ent, fn, o, k, tt, white) {
        const size = o.boxW * k.dom / 100, N = Math.max(32, Math.ceil(size * (low() ? 1.05 : k.res)));
        let b = ent._hdc; if (!b || b.N !== N) { const c = document.createElement('canvas'); c.width = c.height = N; b = ent._hdc = { c, g: c.getContext('2d'), N }; }
        const g = b.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, N, N);
        g.translate(N / 2, N / 2); g.scale(N / k.dom, N / k.dom); g.lineJoin = 'round'; g.imageSmoothingEnabled = true;
        fn.apply(null, [g, tt].concat(o.rest));
        g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-atop';       // luz y volumen
        const gr = g.createLinearGradient(N * 0.1, 0, N * 0.9, N); gr.addColorStop(0, 'rgba(255,255,255,.2)'); gr.addColorStop(0.45, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(12,0,30,.3)');
        g.fillStyle = gr; g.fillRect(0, 0, N, N);
        if (white > 0) { g.fillStyle = 'rgba(255,255,255,' + white + ')'; g.fillRect(0, 0, N, N); }
        g.globalCompositeOperation = 'source-over'; HD.stats.baked++;
        return b;
    }
    function draw(ctx, ent, fn, o) {
        const kind = o.kind, k = K[kind]; if (!k) throw 0;
        const clock = o.clock !== undefined ? o.clock : (ent.timer !== undefined ? ent.timer : (ent.t || 0)), ph = ent.phase || 0, u = o.boxW / 100, big = kind === 'boss' ? 0.6 : 1, lite = low();
        if (ent.hp !== undefined) { if (ent._hdLast !== undefined && ent.hp < ent._hdLast && ent.hp > 0) ent._hdHit = clock + 6; ent._hdLast = ent.hp; }
        let white = (ent._hdHit !== undefined && clock < ent._hdHit) ? 0.75 : 0;
        // --- reposo: respira, flota y se balancea
        let sy = 1 + 0.03 * S(clock * 0.085 + ph), sx = 1 - 0.02 * S(clock * 0.085 + ph), oy = S(clock * 0.055 + ph * 1.3) * 1.7 * u * big, ox = 0, rot = S(clock * 0.04 + ph) * 0.028;
        // --- inclinación hacia donde se mueve (suavizada)
        const dx = ent._hdx === undefined ? 0 : ent.x - ent._hdx; ent._hdx = ent.x; ent._hdt = (ent._hdt || 0) * 0.88 + clamp(dx * 0.06, -0.22, 0.22) * 0.12; rot += ent._hdt * (kind === 'boss' ? 0.4 : 1);
        let gather = -1, aura = false, auraT = 0;
        if (o.charge) {                                                         // enemigos: aviso antes de disparar
            const p = Math.min(1, o.charge / 18); gather = p; sx *= 1 + 0.13 * p; sy *= 1 - 0.13 * p;
            if (o.charge > 7) ox += ((clock >> 1) & 1 ? 1 : -1) * 1.4 * u * p; if (o.charge > 10 && ((clock / 3) | 0) % 2) white = Math.max(white, 0.5);
        } else if (o.pose) {                                                     // mini jefes y jefes
            const q = o.pose;
            if (q.name === 'charge') { gather = q.p; sx *= 1 + 0.06 * q.p; sy *= 1 - 0.06 * q.p; if (q.p > 0.3) ox += ((clock >> 1) & 1 ? 1 : -1) * 1.4 * u * q.p; if (q.p > 0.55 && ((clock / 3) | 0) % 2) white = Math.max(white, 0.5); }
            else if (q.name === 'cast') { aura = true; auraT = q.t; oy -= (0.5 + 0.5 * S(q.t * 0.25)) * 2.6 * u; sy *= 1.03; }
        }
        let fireAge = -1; if (ent._fireT !== undefined) { fireAge = clock - ent._fireT; if (fireAge >= 0 && fireAge < 18) { const e = Math.exp(-fireAge / 5), w = C(fireAge * 0.8); sy *= 1 + 0.17 * e * w; sx *= 1 - 0.12 * e * w; if (fireAge < 3) white = Math.max(white, 0.4); } }
        // --- aparición con "pop" elástico (enemigos)
        let alpha = 1; if (kind === 'enemy' && ent.t !== undefined && ent.t < 16) { const p = clamp(ent.t / 16, 0, 1), e = easeBack(p); sx *= 0.55 + 0.45 * e; sy *= 0.55 + 0.45 * e; alpha = clamp(p * 2.2, 0, 1); }
        // --- horneado (se reutiliza entre cuadros)
        const stp = k.step + ((kind === 'enemy' && typeof enemies !== 'undefined' && enemies.length > 14) ? 1 : 0), tt = Math.floor(o.t / stp) * stp, wq = Math.round(white * 8), key = tt + '|' + wq + '|' + (lite ? 1 : 0);
        let b = ent._hdc; if (!b || ent._hdKey !== key) { b = bake(ent, fn, o, k, tt, wq / 8); ent._hdKey = key; }
        const size = o.boxW * k.dom / 100;
        ctx.save(); if (alpha < 1) ctx.globalAlpha *= alpha;
        // resplandor suave del color del nivel
        if (!lite) { const R = size * 0.52, gr = ctx.createRadialGradient(ox, oy, R * 0.12, ox, oy, R); gr.addColorStop(0, o.accent || '#fee761'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha *= (kind === 'boss' ? 0.1 : 0.14) + 0.04 * S(clock * 0.07 + ph); ctx.fillStyle = gr; ctx.fillRect(ox - R, oy - R, R * 2, R * 2); ctx.restore(); }
        ctx.translate(ox, oy); ctx.rotate(rot); ctx.scale(sx, sy); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(b.c, -size / 2, -size / 2, size, size);
        ctx.restore();
        // --- efectos suaves de carga / lanzamiento / disparo
        if (!lite) {
            const acc = o.accent || '#fee761', R = o.boxW * 0.62; ctx.save(); ctx.globalCompositeOperation = 'lighter';
            if (gather >= 0) for (let i = 0; i < 9; i++) { const a = i * TAU / 9 + clock * 0.09, r = R * (1 - gather * 0.82) + 2; ctx.globalAlpha = 0.45 + 0.5 * gather; ctx.fillStyle = (i & 1) ? '#fff' : acc; ctx.beginPath(); ctx.arc(C(a) * r, S(a) * r * 0.86, 1.6 * u + gather * 1.3 * u, 0, TAU); ctx.fill(); }
            if (aura) { for (let i = 0; i < 6; i++) { const a = auraT * 0.07 + i * TAU / 6; ctx.globalAlpha = 0.8; ctx.fillStyle = (i & 1) ? acc : '#fff'; ctx.beginPath(); ctx.arc(C(a) * R * 0.9, S(a) * R * 0.62, 1.9 * u, 0, TAU); ctx.fill(); } const f = (auraT % 40) / 40; ctx.globalAlpha = 0.5 * (1 - f); ctx.strokeStyle = acc; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, R * (0.5 + 0.7 * f), 0, TAU); ctx.stroke(); }
            if (fireAge >= 0 && fireAge < 12) { const f = fireAge / 12; ctx.globalAlpha = 0.7 * (1 - f); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2 * (1 - f) + 0.6; ctx.beginPath(); ctx.arc(0, 0, o.boxW * (0.32 + 0.3 * f), 0, TAU); ctx.stroke(); }
            ctx.restore();
        }
    }
    const _prev = PX.draw;
    PX.draw = function (ctx, ent, fn, o) {
        if (HD.enabled) { try { return draw(ctx, ent, fn, o); } catch (e) { if (e !== 0 && !HD._w) { HD._w = 1; console.warn('criaturas_hd: usando el estilo anterior', e); } } }
        return _prev.apply(this, arguments);
    };
    // botón en el menú de pausa
    setInterval(() => {
        const po = document.getElementById('pauseOverlay'); if (!po || po.classList.contains('hidden')) return;
        let b = document.getElementById('btnHD'); const q = document.getElementById('btnQuitToMenu'); if (!q) return;
        const label = () => 'ENEMIGOS: ' + (HD.enabled ? 'HD' : 'RETRO');
        if (!b) {
            b = document.createElement('button'); b.id = 'btnHD'; b.type = 'button'; const r = document.getElementById('btnResume'); if (r) b.className = r.className;
            b.onclick = () => { HD.enabled = !HD.enabled; try { localStorage.setItem(KEY, HD.enabled ? '1' : '0'); } catch (e) {} b.textContent = label(); };
            q.parentNode.insertBefore(b, q);
        }
        if (b.textContent !== label()) b.textContent = label();
    }, 600);
})();
