// ============================================================================
//  hud_telefono.js — v52 · HUD COMPACTO PARA TELÉFONO (vertical y horizontal)
// ----------------------------------------------------------------------------
//  Problemas que resuelve (según los testers): los dedos tapaban el HUD y había demasiada información.
//   · VERTICAL:   el HUD ya no ocupa la franja de abajo (donde están los pulgares). Ahora es una barra fina y
//                 translúcida ARRIBA del todo, y el área de juego usa toda la pantalla.
//   · HORIZONTAL: el panel lateral sigue a la derecha pero con lo esencial agrupado ARRIBA (puntaje, vidas,
//                 nivel y 4 casillas); la mitad de abajo queda libre para los botones A/B.
//   · Menos información (sin récord/continuar/nombre de zona salvo lo necesario) y textos más grandes.
//   · Solo con "Modo teléfono" activado. En PC o modo Clásico no cambia nada.
//  juego.js llama a HudPhone.active()/draw()/enemyPos() desde HUD.draw() y computeLayout().
//  Si quitas este archivo, el HUD vuelve a ser el de siempre.   Consola: HudPhone.cfg.enabled = false
// ============================================================================
(function () {
    'use strict';
    const CFG = { enabled: true };
    let topH = 46;   // alto de la barra superior en vertical (cambia si hay efectos activos)

    function active() { try { return CFG.enabled && optMobile.checked && currentMode !== 'clasico' && !isVerticalMode; } catch (e) { return false; } }
    function enemyPos() { return isPortraitMode ? { x: 12, y: topH + 16 } : { x: 56, y: 22 }; }

    function stats(a) {
        const maxed = powerLevel >= MAX_POWER_LEVEL, ready = !!mPromptActive;
        return [
            { l: 'ATQ', v: maxed ? 'MAX' : 'Lv' + powerLevel, col: a.tierCol(powerLevel), r: maxed ? 1 : enemiesDefeatedForPower / KILLS_PER_LEVEL, p: a.st.lvFx },
            { l: 'PWR', v: String(Math.floor(powerPoints)), col: '#ff6a6a', r: powerPoints / 150, p: 0 },
            { l: 'BOM', v: ready ? 'x' + bombStock : Math.floor(a.clamp(grazePoints / GRAZE_MAX, 0, 1) * 100) + '%', col: ready ? '#ffd92a' : '#4cff6a', r: a.bombFrac(), p: ready ? 0.5 + 0.5 * Math.sin(a.t * 0.012) : 0 },
            { l: 'ALI', v: partners.length + '/6', col: '#33ccff', r: partners.length >= 6 ? 1 : partnerPoints / 150, p: a.st.partnerFx }
        ];
    }
    function hearts(a, rightX, cy, r, step, maxN) {
        const n = Math.min(lives, maxN), danger = lives <= 1, t = a.t;
        for (let i = 0; i < n; i++) {
            const beat = 1 + (danger ? 0.22 : 0.08) * Math.max(0, Math.sin(t * (danger ? 0.014 : 0.006) + i * 0.4));
            a.heart(rightX - (n - 1 - i) * step, cy, r * beat, danger ? '#ff3b3b' : '#ff4f86', '#f36');
        }
        if (lives > maxN) a.txt('+' + (lives - maxN), rightX - n * step + step * 0.2, cy + 3, '#fff', 9, 'right');
        return n * step;
    }
    function effectsRow(a, x, y, maxX) {
        const fx = a.effects(); let ex = x;
        fx.forEach(f => { if (ex < maxX - 60) ex += a.chip(f.label.slice(0, 6) + ' ' + Math.ceil(f.rem), ex, y, f.col, 9, true) + 4; });
        return fx.length;
    }

    // ------------------------------------------------------------ VERTICAL: barra fina arriba
    function top(a) {
        const cw = canvas.width, t = a.t, st = a.st, X0 = 46, X1 = cw - 6;   // deja libre el botón de pausa (arriba-izquierda)
        const info = a.levelInfo(), fx = a.effects(); topH = fx.length ? 62 : 46;
        ctx.save();
        const g = ctx.createLinearGradient(0, 0, 0, topH + 10); g.addColorStop(0, 'rgba(3,6,12,0.82)'); g.addColorStop(0.8, 'rgba(3,6,12,0.55)'); g.addColorStop(1, 'rgba(3,6,12,0)');
        ctx.fillStyle = g; ctx.fillRect(0, 0, cw, topH + 10);
        if (st.shake > 0) ctx.translate((Math.random() - 0.5) * 5 * st.shake, (Math.random() - 0.5) * 3 * st.shake);
        // fila 1: puntaje · nivel/tiempo · (continuar) · vidas
        const sc = 1 + st.pop * 0.1; ctx.save(); ctx.translate(X0, 18); ctx.scale(sc, sc);
        a.txt(a.pad(st.disp, 9), 1, 1, 'rgba(255,0,255,0.55)', 14, 'left'); a.txt(a.pad(st.disp, 9), 0, 0, '#e8ffff', 14, 'left', '#0ff'); ctx.restore();
        if (st.record > 0) a.txt('¡RECORD!', X0 + 9 * 14 + 10, 29, '#ffe94a', 8, 'left');
        const hw = hearts(a, X1 - 7, 12, 6, 15, 6);
        if (continuesLeft > 0) a.txt('◆' + continuesLeft, X1 - hw - 6, 16, '#b78cff', 9, 'right');
        const lvl = info.phase === 'wave' ? 'N' + info.n + ' ' + info.secs + 's' : (info.phase === 'mini' ? '¡MINI!' : '¡JEFE!');
        a.txt(lvl, X0 + 9 * 14 + 10, 17, info.phase === 'wave' ? '#9cf' : (Math.floor(t / 170) % 2 ? '#ff5555' : '#ffaaaa'), 9, 'left');
        // fila 2: 4 casillas (texto + barra)
        const cell = (X1 - X0) / 4, fz = cell >= 82 ? 10 : 9;
        stats(a).forEach((s, i) => {
            const x = X0 + i * cell;
            if (s.p > 0.05) { ctx.globalAlpha = 0.25 * s.p; ctx.fillStyle = s.col; ctx.fillRect(x - 3, 23, cell - 2, 21); ctx.globalAlpha = 1; }
            a.txt(s.l + ' ' + s.v, x, 35, s.col, fz, 'left');
            a.bar(x, 38, cell - 8, 4, Math.max(0, Math.min(1, s.r)), s.col, {});
        });
        // fila 3 (solo si hay efectos activos): escudo, doble disparo...
        if (fx.length) effectsRow(a, X0, 56, X1);
        a.drawFloaters(cw / 2, topH + 50, 10);
        ctx.restore();
    }

    // ------------------------------------------------------------ HORIZONTAL: panel lateral compacto (todo arriba)
    function side(a) {
        const k = 1 / Math.max(0.5, viewScale), X = playAreaW, w = canvas.width - playAreaW, h = canvas.height, t = a.t, st = a.st;
        ctx.save();
        ctx.fillStyle = '#05080f'; ctx.fillRect(X, 0, w, h);
        const bg = ctx.createLinearGradient(X, 0, X + w, h); bg.addColorStop(0, 'rgba(0,60,90,0.28)'); bg.addColorStop(1, 'rgba(90,0,90,0.22)'); ctx.fillStyle = bg; ctx.fillRect(X, 0, w, h);
        ctx.fillStyle = '#0ff'; ctx.fillRect(X, 0, 2, h);
        ctx.translate(X, 0); ctx.scale(k, k);
        if (st.shake > 0) ctx.translate((Math.random() - 0.5) * 5 * st.shake, (Math.random() - 0.5) * 3 * st.shake);
        const W = w / k, P = 9, IW = W - 2 * P, info = a.levelInfo(); let y = 16;
        // puntaje
        a.txt('PUNTAJE', P, y, '#0ff', 8, 'left');
        const fs = Math.min(14, IW / 9), sc = 1 + st.pop * 0.1; ctx.save(); ctx.translate(W - P, y + 19); ctx.scale(sc, sc);
        a.txt(a.pad(st.disp, 9), 1, 1, 'rgba(255,0,255,0.55)', fs, 'right'); a.txt(a.pad(st.disp, 9), 0, 0, '#e8ffff', fs, 'right', '#0ff'); ctx.restore();
        y += 36; a.txt(st.record > 0 ? '¡NUEVO RECORD!' : 'HI ' + a.pad(hiScore, 7), P, y, st.record > 0 ? '#ffe94a' : '#cba', 8, 'left');
        // vidas
        y += 22; const n = hearts(a, W - P - 7, y - 4, 6.5, 16, 7);
        a.txt('VIDAS', P, y, '#ff8fb0', 8, 'left'); if (continuesLeft > 0 && n < 6 * 16) a.txt('◆' + continuesLeft, P + 52, y, '#b78cff', 8, 'left');
        // nivel
        y += 24; a.txt('NIVEL ' + info.n + '/' + info.tot, P, y, '#d8b0ff', 9, 'left');
        a.txt(info.phase === 'wave' ? info.secs + 's' : (info.phase === 'mini' ? '¡MINI JEFE!' : '¡JEFE!'), W - P, y, info.phase === 'wave' ? '#9cf' : (Math.floor(t / 170) % 2 ? '#ff5555' : '#ffaaaa'), 9, 'right');
        y += 13; a.txt((info.name || '').slice(0, 17), P, y, '#7fb8e8', 8, 'left');
        const br = info.phase === 'wave' ? info.ratio : (info.boss && info.boss.maxHp ? info.boss.hp / info.boss.maxHp : 0);
        a.bar(P, y + 5, IW, 4, Math.max(0, Math.min(1, br)), info.phase === 'wave' ? '#9cf' : '#f55', {});
        // 4 casillas 2x2
        y += 20; const cw = (IW - 6) / 2, ch = 38;
        stats(a).forEach((s, i) => {
            const cx = P + (i % 2) * (cw + 6), cy = y + Math.floor(i / 2) * (ch + 5);
            a.panel(cx, cy, cw, ch, s.col, s.p);
            a.txt(s.l, cx + 5, cy + 11, s.col, 8, 'left'); a.txt(s.v, cx + 5, cy + 25, '#fff', 11, 'left');
            a.bar(cx + 5, cy + 30, cw - 10, 4, Math.max(0, Math.min(1, s.r)), s.col, {});
        });
        y += 2 * (ch + 5) + 12;
        if (a.effects().length) effectsRow(a, P, y, W - P);
        a.drawFloaters(W / 2, 150, 10);
        ctx.restore();
    }

    function draw(a) { if (isPortraitMode) top(a); else side(a); }
    window.HudPhone = { cfg: CFG, active, draw, enemyPos };
    try { if (typeof fitGameToScreen === 'function') fitGameToScreen(); } catch (e) {}   // recalcula el layout con el HUD compacto
})();
