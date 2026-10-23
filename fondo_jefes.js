/* ===== fondo_jefes.js (v46) =====
   Cuando aparece un MINI JEFE o un JEFE, el fondo del nivel se transforma (como en Touhou 6):
   una onda de color se expande desde el centro y deja un escenario propio de cada nivel:
   círculo mágico giratorio, anillos que laten, rayos y adornos flotando.
   · Mini jefe: versión más suave y simple.   · Jefe: más intensa, con capas extra que giran en sentido contrario.
   Al morir el jefe, el escenario se encoge hacia el centro y vuelve el fondo normal.
   Se dibuja desde el bucle principal (juego.js) justo después de drawThemeBackground(). */
(function () {
    'use strict';
    const TAU = Math.PI * 2;

    // Paleta por nivel: a = oscuro, b = medio, c = brillo del dibujo, d = destello
    const PAL = [
        { a: '#2a0a24', b: '#7a1d4a', c: '#ff8fc0', d: '#ffe0ee' },   // 1 Campos de Sakura
        { a: '#04122a', b: '#134a82', c: '#8fd8ff', d: '#e8fbff' },   // 2 Picos Helados
        { a: '#021a1c', b: '#0b5a5a', c: '#4be8d0', d: '#d6fff6' },   // 3 Lago Espectral
        { a: '#04180a', b: '#1a5a22', c: '#9dff7a', d: '#f0ffd0' },   // 4 Bosque Encantado
        { a: '#241405', b: '#6a4414', c: '#ffd27a', d: '#fff2d0' },   // 5 Biblioteca Arcana
        { a: '#1a1204', b: '#5a3c0a', c: '#ffd24a', d: '#fff6c8' },   // 6 Torre del Reloj
        { a: '#1a0004', b: '#580010', c: '#ff3a4a', d: '#ffc8c8' }    // 7 Luna Sangrante
    ];
    const rgb = h => [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16));
    PAL.forEach(p => { p.A = rgb(p.a); p.B = rgb(p.b); p.C = rgb(p.c); p.D = rgb(p.d); });
    const rgba = (a, al) => 'rgba(' + a[0] + ',' + a[1] + ',' + a[2] + ',' + al.toFixed(3) + ')';

    const S = {
        f: 0,            // 0 = fondo normal · 1 = escenario de jefe completo
        kind: 'boss',    // 'boss' | 'mini' (el último que se vio, para el desvanecido)
        idx: 0, t: 0,
        cache: null, cW: 0, cH: 0, cIdx: -1,
        parts: null, pIdx: -1
    };

    // ---------- estado actual: ¿hay jefe o mini jefe? ----------
    function target() {
        try {
            if (typeof activeBoss !== 'undefined' && activeBoss && activeBoss.state !== 'dead') return 'boss';
            if (typeof activeMiniBoss !== 'undefined' && activeMiniBoss && activeMiniBoss.state !== 'dead') return 'mini';
        } catch (e) {}
        return null;
    }
    function levelIdx() {
        try { return Math.max(0, Math.min(PAL.length - 1, LEVEL_THEMES.indexOf(currentTheme))); } catch (e) { return 0; }
    }

    // ---------- base estática (degradado + resplandor + viñeta), una vez por nivel/tamaño ----------
    function buildBase(idx, W, H) {
        const P = PAL[idx], cv = document.createElement('canvas');
        cv.width = W; cv.height = H;
        const g = cv.getContext('2d');
        const lg = g.createLinearGradient(0, 0, 0, H);
        lg.addColorStop(0, rgba(P.A, 1)); lg.addColorStop(0.55, rgba(P.B, 1)); lg.addColorStop(1, rgba(P.A, 1));
        g.fillStyle = lg; g.fillRect(0, 0, W, H);
        const rg = g.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, Math.max(W, H) * 0.7);
        rg.addColorStop(0, rgba(P.C, 0.30)); rg.addColorStop(0.45, rgba(P.B, 0.10)); rg.addColorStop(1, rgba(P.A, 0));
        g.fillStyle = rg; g.fillRect(0, 0, W, H);
        const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.8);
        vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
        g.fillStyle = vg; g.fillRect(0, 0, W, H);
        return cv;
    }

    // ---------- adornos flotantes ----------
    function seed(idx, W, H) {
        const n = 26, a = [];
        for (let i = 0; i < n; i++) a.push({ x: Math.random() * W, y: Math.random() * H, v: 0.4 + Math.random() * 1.1, s: 4 + Math.random() * 9, p: Math.random() * TAU, w: 0.01 + Math.random() * 0.03 });
        return a;
    }
    function drawPart(g, idx, p, P, al) {
        g.save(); g.translate(p.x, p.y);
        switch (idx) {
            case 0: g.rotate(p.p); g.fillStyle = rgba(P.C, al); g.beginPath(); g.ellipse(0, 0, p.s, p.s * 0.5, 0, 0, TAU); g.fill(); break;            // pétalo
            case 1: g.rotate(p.p); g.strokeStyle = rgba(P.D, al); g.lineWidth = 1.5; g.beginPath(); g.moveTo(-p.s, 0); g.lineTo(p.s, 0); g.moveTo(0, -p.s); g.lineTo(0, p.s); g.stroke(); break; // copo
            case 2: g.strokeStyle = rgba(P.D, al); g.lineWidth = 1.5; g.beginPath(); g.arc(0, 0, p.s * 0.7, 0, TAU); g.stroke(); break;                 // burbuja
            case 3: g.rotate(p.p); g.fillStyle = rgba(P.C, al); g.beginPath(); g.ellipse(0, 0, p.s * 0.8, p.s * 0.35, 0, 0, TAU); g.fill(); break;     // hoja
            case 4: g.rotate(p.p); g.fillStyle = rgba(P.D, al * 0.8); g.fillRect(-p.s * 0.6, -p.s * 0.8, p.s * 1.2, p.s * 1.6); g.fillStyle = rgba(P.A, al); g.fillRect(-p.s * 0.4, -p.s * 0.45, p.s * 0.8, 1.5); g.fillRect(-p.s * 0.4, -p.s * 0.05, p.s * 0.8, 1.5); break; // página
            case 5: g.fillStyle = rgba(P.C, al); g.fillRect(-p.s * 0.2, -p.s * 0.2, p.s * 0.4, p.s * 0.4); break;                                       // chispa
            default: g.fillStyle = rgba(P.C, al); g.beginPath(); g.moveTo(0, -p.s); g.quadraticCurveTo(p.s * 0.7, 0, 0, p.s * 0.7); g.quadraticCurveTo(-p.s * 0.7, 0, 0, -p.s); g.fill(); // gota
        }
        g.restore();
    }
    function updateParts(idx, W, H, k) {
        const up = (idx === 2 || idx === 5);        // burbujas y chispas suben; el resto cae
        S.parts.forEach(p => {
            p.p += p.w;
            p.y += (up ? -p.v : p.v) * (0.8 + k * 0.5);
            p.x += Math.sin(p.p * 3) * 0.5 + (idx === 0 ? 0.4 : 0);
            if (p.y > H + 20) { p.y = -20; p.x = Math.random() * W; }
            if (p.y < -20) { p.y = H + 20; p.x = Math.random() * W; }
            if (p.x > W + 20) p.x = -20;
        });
    }

    // ---------- figuras base ----------
    function ring(g, r, w, col, al) { g.strokeStyle = rgba(col, al); g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke(); }
    function star(g, n, step, r, rot) {          // polígono estrellado {n/step}
        g.beginPath();
        for (let i = 0; i <= n; i++) {
            const a = rot + (i * step % n) * TAU / n - Math.PI / 2;
            const x = Math.cos(a) * r, y = Math.sin(a) * r;
            if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        }
        g.closePath(); g.stroke();
    }
    function rays(g, n, rot, R, col, al) {
        g.fillStyle = rgba(col, al);
        for (let i = 0; i < n; i++) {
            const a = rot + i * TAU / n, w = TAU / n * 0.28;
            g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a - w) * R, Math.sin(a - w) * R); g.lineTo(Math.cos(a + w) * R, Math.sin(a + w) * R); g.closePath(); g.fill();
        }
    }

    // ---------- dibujo por nivel (centro ya en el origen) ----------
    function scene(g, idx, P, t, R, boss, perf) {
        const k = boss ? 1 : 0.6;
        const pulse = 1 + Math.sin(t * 0.04) * 0.03;
        // rayos de fondo
        rays(g, boss ? 14 : 8, t * 0.003, R * 2.2, P.C, 0.07 * k + 0.02);

        switch (idx) {
            case 0: { // Sakura: rosetón de pétalos
                for (let i = 0; i < 8; i++) {
                    g.save(); g.rotate(t * 0.006 + i * TAU / 8);
                    g.fillStyle = rgba(P.C, 0.10 * k + 0.03); g.strokeStyle = rgba(P.D, 0.35 * k); g.lineWidth = 2;
                    g.beginPath(); g.ellipse(R * 0.52, 0, R * 0.34, R * 0.11, 0, 0, TAU); g.fill(); g.stroke();
                    g.restore();
                }
                ring(g, R * 0.95 * pulse, 3, P.D, 0.35 * k); ring(g, R * 0.22, 2, P.D, 0.4 * k);
                if (boss) { g.strokeStyle = rgba(P.D, 0.3); g.lineWidth = 2; star(g, 8, 3, R * 0.9, -t * 0.008); }
                break;
            }
            case 1: { // Picos Helados: copo de nieve de 6 brazos + hexagrama
                g.save(); g.rotate(t * 0.004); g.strokeStyle = rgba(P.D, 0.5 * k + 0.1); g.lineWidth = 2.5;
                for (let i = 0; i < 6; i++) {
                    g.save(); g.rotate(i * TAU / 6);
                    g.beginPath(); g.moveTo(0, 0); g.lineTo(R, 0);
                    for (let b = 0.35; b < 0.95; b += 0.2) { g.moveTo(R * b, 0); g.lineTo(R * (b + 0.12), R * 0.12); g.moveTo(R * b, 0); g.lineTo(R * (b + 0.12), -R * 0.12); }
                    g.stroke(); g.restore();
                }
                g.restore();
                g.strokeStyle = rgba(P.C, 0.45 * k); g.lineWidth = 2; star(g, 6, 2, R * 0.8, -t * 0.007);
                ring(g, R * pulse, 3, P.D, 0.3 * k);
                if (boss) ring(g, R * 0.5, 2, P.D, 0.35);
                break;
            }
            case 2: { // Lago: ondas que se expanden + puntos orbitando
                const n = boss ? 6 : 4;
                for (let i = 0; i < n; i++) { const ph = ((t * 0.006 + i / n) % 1); ring(g, R * 1.25 * ph, 3 * (1 - ph) + 1, P.D, (1 - ph) * 0.5 * k + 0.05); }
                for (let i = 0; i < 12; i++) { const a = t * 0.01 + i * TAU / 12; g.fillStyle = rgba(P.D, 0.55 * k); g.beginPath(); g.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, 4, 0, TAU); g.fill(); }
                g.strokeStyle = rgba(P.C, 0.4 * k); g.lineWidth = 2; star(g, 8, 3, R * 0.62, t * 0.005);
                if (boss) { ring(g, R * 0.32, 2, P.D, 0.4); for (let i = 0; i < 6; i++) { const a = -t * 0.015 + i * TAU / 6; g.beginPath(); g.arc(Math.cos(a) * R * 0.32, Math.sin(a) * R * 0.32, 3, 0, TAU); g.fillStyle = rgba(P.D, 0.6); g.fill(); } }
                break;
            }
            case 3: { // Bosque: espiral de hojas
                const arms = boss ? 6 : 4;
                for (let a = 0; a < arms; a++) {
                    const a0 = a * TAU / arms + t * 0.006;
                    g.strokeStyle = rgba(P.C, 0.4 * k + 0.05); g.lineWidth = 2; g.beginPath();
                    for (let r = 8; r < R; r += 8) { const an = a0 + r * 0.011; const x = Math.cos(an) * r, y = Math.sin(an) * r; if (r === 8) g.moveTo(x, y); else g.lineTo(x, y); }
                    g.stroke();
                    for (let r = 40; r < R; r += 46) { const an = a0 + r * 0.011; g.save(); g.translate(Math.cos(an) * r, Math.sin(an) * r); g.rotate(an + 1.2); g.fillStyle = rgba(P.D, 0.35 * k); g.beginPath(); g.ellipse(0, 0, 11, 4.5, 0, 0, TAU); g.fill(); g.restore(); }
                }
                ring(g, R * 0.98 * pulse, 3, P.D, 0.3 * k);
                if (boss) { g.strokeStyle = rgba(P.D, 0.3); g.lineWidth = 2; star(g, 5, 2, R * 0.45, -t * 0.01); }
                break;
            }
            case 4: { // Biblioteca: círculo rúnico con cuadrados
                g.strokeStyle = rgba(P.C, 0.5 * k + 0.05); g.lineWidth = 2.5;
                g.save(); g.rotate(t * 0.005); g.strokeRect(-R * 0.62, -R * 0.62, R * 1.24, R * 1.24); g.restore();
                g.save(); g.rotate(-t * 0.005 + Math.PI / 4); g.strokeRect(-R * 0.62, -R * 0.62, R * 1.24, R * 1.24); g.restore();
                ring(g, R * 0.88, 3, P.D, 0.35 * k); ring(g, R * 0.72, 1.5, P.D, 0.3 * k);
                g.save(); g.rotate(t * 0.003);
                for (let i = 0; i < 36; i++) { g.rotate(TAU / 36); g.fillStyle = rgba(P.D, 0.4 * k); g.fillRect(R * 0.74, -2, (i % 3 === 0) ? 14 : 7, 3); }
                g.restore();
                if (boss) { g.strokeStyle = rgba(P.D, 0.3); star(g, 6, 2, R * 0.5, t * 0.008); }
                break;
            }
            case 5: { // Torre del Reloj: esfera con manecillas + engranaje
                ring(g, R * 0.9, 4, P.D, 0.4 * k); ring(g, R * 0.78, 2, P.C, 0.35 * k);
                for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.strokeStyle = rgba(P.D, 0.55 * k); g.lineWidth = (i % 3 === 0) ? 5 : 2.5; g.beginPath(); g.moveTo(Math.cos(a) * R * 0.7, Math.sin(a) * R * 0.7); g.lineTo(Math.cos(a) * R * 0.84, Math.sin(a) * R * 0.84); g.stroke(); }
                g.lineCap = 'round'; g.strokeStyle = rgba(P.D, 0.6 * k + 0.1);
                g.lineWidth = 7; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(t * 0.004 - 1.57) * R * 0.45, Math.sin(t * 0.004 - 1.57) * R * 0.45); g.stroke();
                g.lineWidth = 4; g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(t * 0.048 - 1.57) * R * 0.68, Math.sin(t * 0.048 - 1.57) * R * 0.68); g.stroke();
                g.lineCap = 'butt';
                g.save(); g.rotate(-t * 0.008); g.fillStyle = rgba(P.C, 0.22 * k + 0.04);
                for (let i = 0; i < 16; i++) { g.rotate(TAU / 16); g.fillRect(R * 0.98, -6, 16, 12); }
                g.restore();
                if (boss) { g.strokeStyle = rgba(P.D, 0.25); g.lineWidth = 2; star(g, 12, 5, R * 0.9, t * 0.003); }
                break;
            }
            default: { // Luna Sangrante: pentagrama y doble anillo bajo la luna roja
                const mg = g.createRadialGradient(0, -R * 0.05, R * 0.05, 0, -R * 0.05, R * 0.5);
                mg.addColorStop(0, rgba(P.D, 0.55 * k + 0.1)); mg.addColorStop(0.6, rgba(P.C, 0.28 * k)); mg.addColorStop(1, rgba(P.C, 0));
                g.fillStyle = mg; g.beginPath(); g.arc(0, -R * 0.05, R * 0.5, 0, TAU); g.fill();
                g.strokeStyle = rgba(P.C, 0.65 * k + 0.1); g.lineWidth = 3; star(g, 5, 2, R * 0.82, t * 0.006);
                ring(g, R * 0.86 * pulse, 4, P.C, 0.5 * k); ring(g, R * 0.98, 2, P.D, 0.35 * k);
                if (boss) { g.lineWidth = 2; g.strokeStyle = rgba(P.D, 0.35); star(g, 5, 2, R * 0.82, -t * 0.006 + Math.PI / 5); ring(g, R * 0.3, 2, P.C, 0.45); }
            }
        }
    }

    // ---------- punto de entrada ----------
    S.draw = function () {
        if (typeof ctx === 'undefined' || typeof playAreaW === 'undefined') return;
        const tg = target();
        if (tg) { S.kind = tg; S.f = Math.min(1, S.f + 0.018); } else S.f = Math.max(0, S.f - 0.03);
        if (S.f <= 0) { S.parts = null; return; }

        const W = playAreaW | 0, H = playAreaH | 0, idx = levelIdx(), P = PAL[idx];
        const boss = S.kind === 'boss', perf = (typeof performanceMode !== 'undefined' && performanceMode);
        if (!S.cache || S.cW !== W || S.cH !== H || S.cIdx !== idx) { S.cache = buildBase(idx, W, H); S.cW = W; S.cH = H; S.cIdx = idx; }
        if (!S.parts || S.pIdx !== idx) { S.parts = seed(idx, W, H); S.pIdx = idx; }
        S.t++;

        // onda que se abre desde el centro (ease-out); al terminar cubre todo el campo
        const e = 1 - Math.pow(1 - S.f, 3);
        const cx = W / 2, cy = H * 0.42, maxR = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 4;
        const rad = maxR * e, cover = boss ? 0.93 : 0.8;

        ctx.save();
        ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
        if (S.f < 1) { ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rad), 0, TAU); ctx.clip(); }
        ctx.globalAlpha = cover; ctx.drawImage(S.cache, 0, 0); ctx.globalAlpha = 1;

        // adornos que caen/suben
        updateParts(idx, W, H, boss ? 1 : 0.6);
        const pa = (boss ? 0.6 : 0.4);
        for (let i = 0, n = perf ? 10 : S.parts.length; i < n; i++) drawPart(ctx, idx, S.parts[i], P, pa);

        // figura principal
        ctx.save(); ctx.translate(cx, cy);
        const R = Math.min(W, H) * (boss ? 0.62 : 0.5);
        scene(ctx, idx, P, S.t, R, boss, perf);
        ctx.restore();
        ctx.restore();

        // borde brillante de la onda mientras se abre / se cierra
        if (S.f > 0 && S.f < 1) {
            ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
            ctx.strokeStyle = rgba(P.D, 0.7 * (1 - Math.abs(S.f - 0.5) * 1.2)); ctx.lineWidth = 6;
            ctx.beginPath(); ctx.arc(cx, cy, Math.max(1, rad), 0, TAU); ctx.stroke();
            ctx.restore();
        }
    };

    window.FondoJefes = S;
})();
