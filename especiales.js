// ============================================================================
// especiales.js — ENEMIGOS ESPECIALES + objetos nuevos (v39)
// ----------------------------------------------------------------------------
//  · Enemigo de ATAQUE (aura roja/naranja y etiqueta "x1.25"): al derrotarlo suelta un potenciador que
//    vuela hacia tu nave. Mientras dura, las balas de TU NAVE hacen x1.25 de daño (los partners NO).
//  · Enemigo de GEMAS (aura celeste y gema flotando encima): al derrotarlo suelta 2-4 gemas para la tienda,
//    estés o no en el Modo Arcoíris.
//  · Moneda de mini jefe: se dibuja aquí (la lógica del desbloqueo de Reimu/Marisa está en Extras, juego.js).
//  · HUD del bonus de ataque (arriba a la izquierda) y aura naranja en la nave mientras está activo.
// Se carga DESPUÉS de juego.js. Todos los números están en CFG. Si quitas el script el juego sigue igual.
// Consola:  Specials.cfg · Specials.grantAtk() · Specials.force('atk' | 'gem')  (el próximo enemigo sale así)
// ============================================================================
const Specials = (function () {
    'use strict';
    const TAU = Math.PI * 2;
    const CFG = {
        CHANCE_ATK: 0.07,        // probabilidad de que un enemigo normal salga "de ataque"
        CHANCE_GEM: 0.07,        // ... y de que salga "de gemas"
        MAX_ALIVE: 3,            // tope de enemigos especiales a la vez en pantalla
        ATK_MUL: 1.25,           // multiplicador de daño de tu nave
        ATK_SECS: 12,            // duración del bonus (se renueva, no se acumula)
        GEMS_MIN: 2, GEMS_MAX: 4 // gemas que suelta un enemigo de gemas
    };
    let atkFrames = 0, atkMax = 1, tFrame = 0, forced = null;
    const floats = [];

    const lite = () => { try { return !!performanceMode; } catch (e) { return false; } };
    const shopLv = id => { try { return (typeof Shop !== 'undefined' && Shop.level) ? Shop.level(id) : 0; } catch (e) { return 0; } };
    const inPractice = () => { try { return !!(Extras.inPractice && Extras.inPractice()); } catch (e) { return false; } };

    // ------------------------------------------------------------------ bonus de ataque
    function atkMul() { return atkFrames > 0 ? CFG.ATK_MUL : 1; }
    function atkSecs() { return CFG.ATK_SECS + 4 * shopLv('buff'); }       // mejora BONUS PROLONGADO de la tienda
    function grantAtk(pt) {
        atkMax = atkSecs() * 60; atkFrames = Math.max(atkFrames, atkMax);
        try { playLevelUpSound(); } catch (e) {}
        if (typeof player !== 'undefined' && player) floats.push({ x: player.x + player.width / 2, y: player.y - 8, t: 0, txt: 'ATAQUE x' + CFG.ATK_MUL, col: '#ffb040' });
    }
    function collectGem(pt) {
        if (inPractice()) return;
        try { Shop.addGems(1); } catch (e) {}
        try { playShootSound(); } catch (e) {}
        floats.push({ x: pt.x, y: pt.y - 6, t: 0, txt: '+1', col: '#7cfcfc' });
    }

    // ------------------------------------------------------------------ elegir enemigos especiales
    function eligible(e) {
        if (typeof currentMode === 'undefined' || currentMode === 'clasico' || !isPlaying) return false;
        if (e.isMinion || e.isFodder || e.fromEvent || e.role || e._sum || e.gone) return false;
        if ((typeof activeBoss !== 'undefined' && activeBoss) || (typeof activeMiniBoss !== 'undefined' && activeMiniBoss)) return false;
        try { if (window.Choque && Choque.active && Choque.active()) return false; } catch (er) {}
        return true;
    }
    function roll(e) {
        e._sp = null;
        if (!eligible(e)) return;
        let alive = 0; for (let i = 0; i < enemies.length; i++) if (enemies[i]._sp) alive++;
        if (alive >= CFG.MAX_ALIVE && !forced) return;
        if (forced) { e._sp = forced; forced = null; return; }
        const r = Math.random();
        if (r < CFG.CHANCE_ATK) e._sp = 'atk';
        else if (r < CFG.CHANCE_ATK + CFG.CHANCE_GEM) e._sp = 'gem';
    }

    // Lo llama juego.js cuando TÚ derrotas a un enemigo (bala, bomba, láser...), no al chocar con él.
    function onKill(e) {
        const cx = e.x + e.width / 2, cy = e.y + e.height / 2;
        if (e._sp === 'atk') {
            const p = new PointItem(cx - 8, cy - 8, 'atkx'); p.magnet = true; p.vy = 1.6; pointItems.push(p);
            try { createExplosion(cx, cy, '#ff7a30', 40); } catch (er) {}
        } else if (e._sp === 'gem') {
            try { createExplosion(cx, cy, '#5fe8ff', 40); } catch (er) {}
            if (inPractice()) return;
            const n = CFG.GEMS_MIN + Math.floor(Math.random() * (CFG.GEMS_MAX - CFG.GEMS_MIN + 1));
            for (let k = 0; k < n; k++) {
                const p = new PointItem(cx + (Math.random() - 0.5) * 36 - 8, cy + (Math.random() - 0.5) * 20 - 8, 'gem');
                p.magnet = true; p.vy = 1.8; pointItems.push(p);
            }
        }
    }

    // ------------------------------------------------------------------ dibujo
    function drawAura(e) {
        const cx = e.x + e.width / 2, cy = e.y + e.height / 2, R = e.width * 0.6;
        const atk = e._sp === 'atk', t = tFrame + (e.phase || 0) * 10;
        const c1 = atk ? '255,90,40' : '60,225,255', c2 = atk ? '255,205,70' : '210,255,255';
        const pul = 0.6 + 0.3 * Math.sin(t * 0.13);
        ctx.save();
        if (!lite()) ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy, R * 0.35, cx, cy, R * 1.2);
        g.addColorStop(0, 'rgba(' + c1 + ',0)'); g.addColorStop(0.65, 'rgba(' + c1 + ',' + (0.3 * pul) + ')'); g.addColorStop(1, 'rgba(' + c1 + ',0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(' + c2 + ',0.85)'; ctx.lineWidth = 2;
        ctx.setLineDash([7, 6]); ctx.lineDashOffset = -t * 0.9;
        ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
        for (let k = 0; k < 3; k++) {                                   // chispas que giran alrededor
            const a = t * 0.07 + k * TAU / 3, rr = R * (1.05 + 0.06 * Math.sin(t * 0.2 + k));
            ctx.fillStyle = 'rgba(' + c2 + ',0.95)'; ctx.fillRect(cx + Math.cos(a) * rr - 2, cy + Math.sin(a) * rr - 2, 4, 4);
        }
        ctx.restore();
        // etiqueta flotante encima
        const by = Math.max(14, e.y - 8 + Math.sin(t * 0.12) * 2);
        ctx.save(); ctx.textAlign = 'center';
        if (atk) {
            const w = 46, h = 15;
            ctx.fillStyle = 'rgba(40,6,0,0.82)'; ctx.fillRect(cx - w / 2, by - h + 2, w, h);
            ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - w / 2, by - h + 2, w, h);
            ctx.fillStyle = '#ffd070'; ctx.font = '8px "Press Start 2P"'; ctx.fillText('x' + CFG.ATK_MUL, cx, by - 2);
        } else {
            gemShape(cx, by - 6, 9, t);
        }
        ctx.restore();
    }
    function gemShape(x, y, r, t) {
        ctx.save(); ctx.translate(x, y);
        if (!lite()) { ctx.shadowColor = '#5fe8ff'; ctx.shadowBlur = 10; }
        ctx.beginPath(); ctx.moveTo(0, -r); ctx.lineTo(r * 0.85, -r * 0.2); ctx.lineTo(0, r); ctx.lineTo(-r * 0.85, -r * 0.2); ctx.closePath();
        const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#2ce8f5'); g.addColorStop(1, '#0077c8');
        ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1; ctx.strokeStyle = '#d8fcff'; ctx.stroke();
        ctx.shadowBlur = 0; ctx.beginPath(); ctx.moveTo(-r * 0.85, -r * 0.2); ctx.lineTo(r * 0.85, -r * 0.2); ctx.moveTo(0, -r); ctx.lineTo(-r * 0.3, -r * 0.2); ctx.lineTo(0, r); ctx.lineTo(r * 0.3, -r * 0.2); ctx.closePath();
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.stroke();
        const s = 0.5 + 0.5 * Math.sin(t * 0.2);                           // destello
        ctx.fillStyle = 'rgba(255,255,255,' + (0.4 + 0.5 * s) + ')'; ctx.fillRect(-r * 0.45, -r * 0.65, 2, 2);
        ctx.restore();
    }

    // Moneda de mini jefe / gema / potenciador x1.25 (llamado desde PointItem.draw)
    function drawItem(pt) {
        const cx = pt.x + pt.width / 2, cy = pt.y + pt.height / 2, t = tFrame * 0.1 + pt.x * 0.03;
        ctx.save();
        if (pt.type === 'coin') {
            const sx = 0.25 + 0.75 * Math.abs(Math.cos(t)), R = 11;
            if (!lite()) { ctx.globalCompositeOperation = 'lighter'; }
            const g0 = ctx.createRadialGradient(cx, cy, 2, cx, cy, R * 2.3);
            g0.addColorStop(0, 'rgba(255,220,90,0.55)'); g0.addColorStop(1, 'rgba(255,200,60,0)');
            ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(cx, cy, R * 2.3, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.translate(cx, cy); ctx.scale(sx, 1);
            const g = ctx.createLinearGradient(-R, -R, R, R); g.addColorStop(0, '#fff6b0'); g.addColorStop(0.5, '#ffc61a'); g.addColorStop(1, '#b87a00');
            ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fillStyle = g; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = '#8a5a00'; ctx.stroke();
            ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,248,200,0.9)'; ctx.beginPath(); ctx.arc(0, 0, R * 0.68, 0, TAU); ctx.stroke();
            ctx.beginPath();                                                  // estrella central
            for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? R * 0.2 : R * 0.48; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
            ctx.closePath(); ctx.fillStyle = '#8a5a00'; ctx.fill();
        } else if (pt.type === 'gem') {
            ctx.globalAlpha = 1; gemShape(cx, cy, 8, tFrame + pt.x);
        } else {                                                              // 'atkx'
            if (!lite()) ctx.globalCompositeOperation = 'lighter';
            const g0 = ctx.createRadialGradient(cx, cy, 2, cx, cy, 20);
            g0.addColorStop(0, 'rgba(255,150,50,0.7)'); g0.addColorStop(1, 'rgba(255,90,20,0)');
            ctx.fillStyle = g0; ctx.beginPath(); ctx.arc(cx, cy, 20, 0, TAU); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
            ctx.beginPath(); ctx.arc(cx, cy, 10, 0, TAU); ctx.fillStyle = '#c43a10'; ctx.fill();
            ctx.lineWidth = 2; ctx.strokeStyle = '#ffd070'; ctx.stroke();
            ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '6px "Press Start 2P"'; ctx.fillText('1.25', cx, cy + 2.5);
        }
        ctx.restore();
        return true;
    }

    function drawHud() {
        const W = (typeof playAreaW !== 'undefined') ? playAreaW : canvas.width;
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
        const x = 8, y = 8, w = Math.min(150, W * 0.4), h = 20, k = Math.max(0, atkFrames / atkMax), pulse = 0.65 + 0.35 * Math.sin(tFrame * 0.2);
        ctx.fillStyle = 'rgba(34,6,0,0.82)'; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,110,40,' + (0.55 + 0.25 * pulse) + ')'; ctx.fillRect(x + 2, y + h - 6, (w - 4) * k, 4);
        ctx.strokeStyle = '#ff9a40'; ctx.lineWidth = 1.5; ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#ffd070';
        ctx.font = Math.max(6, Math.min(8, w * 0.055)) + 'px "Press Start 2P"';
        ctx.fillText('ATK x' + CFG.ATK_MUL + ' ' + Math.ceil(atkFrames / 60) + 's', x + 6, y + 11);
        ctx.restore();
    }
    function drawFloats() {
        if (!floats.length) return;
        ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.textAlign = 'center'; ctx.font = '9px "Press Start 2P"';
        for (let i = floats.length - 1; i >= 0; i--) {
            const f = floats[i]; f.t++; f.y -= 0.7;
            if (f.t > 50) { floats.splice(i, 1); continue; }
            ctx.globalAlpha = Math.min(1, (50 - f.t) / 18);
            ctx.fillStyle = '#000'; ctx.fillText(f.txt, f.x + 1, f.y + 1); ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y);
        }
        ctx.restore();
    }

    // ------------------------------------------------------------------ conexión con el juego
    function install() {
        try {
            const upd = Enemy.prototype.update, drw = Enemy.prototype.draw;
            Enemy.prototype.update = function () { if (this._sp === undefined) roll(this); return upd.apply(this, arguments); };
            Enemy.prototype.draw = function () {
                if (this._sp === undefined) roll(this);
                const r = drw.apply(this, arguments);
                if (this._sp) { try { drawAura(this); } catch (e) {} }
                return r;
            };
            // aura naranja en la nave mientras dura el bonus
            const pd = Player.prototype.draw;
            Player.prototype.draw = function () {
                const r = pd.apply(this, arguments);
                if (atkFrames > 0 && typeof gameStartTimer !== 'undefined') {
                    const cx = this.x + this.width / 2, cy = this.y + this.height / 2, t = tFrame, R = Math.max(this.width, this.height) * 0.78;
                    ctx.save(); if (!lite()) ctx.globalCompositeOperation = 'lighter';
                    const fade = Math.min(1, atkFrames / 40), g = ctx.createRadialGradient(cx, cy, R * 0.3, cx, cy, R * 1.25);
                    g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(0.7, 'rgba(255,120,40,' + (0.28 * fade) + ')'); g.addColorStop(1, 'rgba(255,120,40,0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, TAU); ctx.fill();
                    ctx.fillStyle = 'rgba(255,200,90,' + (0.9 * fade) + ')';
                    for (let k = 0; k < 4; k++) { const a = t * 0.09 + k * TAU / 4; ctx.fillRect(cx + Math.cos(a) * R - 1.5, cy + Math.sin(a) * R - 1.5, 3, 3); }
                    ctx.restore();
                }
                return r;
            };
            const af = Extras.afterFrame, rs = Extras.onRunStart;
            Extras.afterFrame = function () {
                tFrame++;
                if (atkFrames > 0) atkFrames--;
                try { drawHud2(); } catch (e) {}
                return af.apply(this, arguments);        // los avisos (toasts) se dibujan encima
            };
            Extras.onRunStart = function () { atkFrames = 0; floats.length = 0; return rs.apply(this, arguments); };
        } catch (e) { console.warn('especiales.js:', e); }
    }
    function drawHud2() { if (atkFrames > 0) drawHud(); drawFloats(); }

    install();
    return {
        cfg: CFG, atkMul, grantAtk, collectGem, onKill, drawItem,
        force(kind) { forced = kind === 'gem' ? 'gem' : 'atk'; },
        get atkFrames() { return atkFrames; }
    };
})();

window.Specials = Specials;   // los enganches de juego.js lo buscan en window
