/* ===== jefes/motor.js ===== */
// ============================================================================================
//  MOTOR DE PODERES ÚNICOS DE JEFES  ·  estilo Touhou 6 (spell cards) + Undertale / Deltarune
// --------------------------------------------------------------------------------------------
//  Se carga DESPUÉS de juego.js / invasor.js / choque.js y NO modifica esos archivos.
//  Reemplaza por completo los ataques de los jefes finales (niveles 1-7). Cada jefe vive en su
//  propio archivo (jefes/j1_kyubi.js ... j7_ojo.js) y se registra con JefesUnicos.register().
//
//  Qué aporta el motor:
//   · SPRITES DE BALAS ÚNICOS por jefe (pixel art generado por código, con contorno).
//   · Balas con física propia: gravedad, aceleración, curva, rebote, congelarse y reanudar,
//     transformarse, dividirse, volver atrás...
//   · "Almas" de Undertale: bala AZUL (solo duele si te mueves) y NARANJA (solo duele si te quedas quieto).
//   · Peligros que no son balas: rayos con aviso, zonas (ralentizar, atraer, dañar, tinta),
//     viento que empuja, charcos/venas, entidades grandes.
//   · Cada ataque es una SPELL CARD con nombre japonés + español y una frase del jefe en un globo
//     de texto estilo Undertale.
//
//  Consola (para probar):   JefesUnicos.dev.list(6)        lista los ataques del jefe del nivel 7
//                           JefesUnicos.dev.force('mareajada')   fuerza un ataque del jefe actual
// ============================================================================================
(function () {
    'use strict';
    if (typeof Boss === 'undefined' || typeof Bullet === 'undefined' || typeof pushEnemyBullet !== 'function') return;
    if (window.JefesUnicos) return;

    const TAU = Math.PI * 2, PI = Math.PI, S = Math.sin, C = Math.cos;
    const OUT = '#140a1c';
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const PW = () => playAreaW, PH = () => playAreaH;
    const pcx = () => player.x + player.width / 2, pcy = () => player.y + player.height / 2;
    const lowFx = () => (typeof performanceMode !== 'undefined' && performanceMode);

    // azar con semilla opcional (el Coloso del Reloj repite el mismo patrón: "bucle temporal")
    let _seed = null;
    function rnd() { if (_seed === null) return Math.random(); _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; }
    const rr = (a, b) => a + rnd() * (b - a);
    const pick = a => a[Math.floor(rnd() * a.length)];
    function seed(n) { _seed = n === null ? null : (n >>> 0) || 1; }

    // ---------------------------------------------------------------- sonido (8 bits, bajito)
    function sfx(f0, f1, dur, type, vol) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
            o.type = type || 'square'; o.connect(g); g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 || f0), t0 + dur);
            g.gain.setValueAtTime(vol || 0.04, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
            o.start(t0); o.stop(t0 + dur + 0.02);
        } catch (e) {}
    }

    // ============================================================================================
    //  SPRITES PROCEDURALES  (se dibujan pequeños con primitivas, se binarizan y se les pone contorno)
    // ============================================================================================
    const SPR = {};
    const P = {      // primitivas para dibujar sprites
        c(g, x, y, r, col) { g.fillStyle = col; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); },
        e(g, x, y, rx, ry, col, rot) { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot || 0, 0, TAU); g.fill(); },
        r(g, x, y, w, h, col) { g.fillStyle = col; g.fillRect(x, y, w, h); },
        p(g, pts, col) { g.fillStyle = col; g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fill(); },
        l(g, x0, y0, x1, y1, col, w) { g.strokeStyle = col; g.lineWidth = w || 1; g.lineCap = 'butt'; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); },
        a(g, x, y, r, a0, a1, col, w) { g.strokeStyle = col; g.lineWidth = w || 1; g.beginPath(); g.arc(x, y, r, a0, a1); g.stroke(); }
    };
    function def(id, w, h, fn, frames) {
        const fs = [];
        for (let f = 0; f < (frames || 1); f++) {
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            const g = c.getContext('2d', { willReadFrequently: true });
            fn(g, f, w, h);
            const im = g.getImageData(0, 0, w, h), d = im.data;
            for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 100 ? 255 : 0;     // alfa binario = pixel art nítido
            g.putImageData(im, 0, 0);
            const sil = document.createElement('canvas'); sil.width = w; sil.height = h;
            const sg = sil.getContext('2d'); sg.drawImage(c, 0, 0);
            sg.globalCompositeOperation = 'source-in'; sg.fillStyle = OUT; sg.fillRect(0, 0, w, h);
            const o = document.createElement('canvas'); o.width = w + 2; o.height = h + 2;
            const og = o.getContext('2d');
            for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) if (dx !== 1 || dy !== 1) og.drawImage(sil, dx, dy);
            og.drawImage(c, 1, 1);
            fs.push(o);
        }
        SPR[id] = { f: fs, w: w + 2, h: h + 2 };
    }
    const GLOWS = {};
    function glowSpr(col, r) {
        const k = col + r; if (GLOWS[k]) return GLOWS[k];
        const c = document.createElement('canvas'); c.width = c.height = r * 2;
        const g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
        gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
        return (GLOWS[k] = c);
    }
    // sprite de letra (Archiliche): se hornea al vuelo
    function letterSpr(ch, col) {
        const id = 'L_' + ch + col;
        if (!SPR[id]) def(id, 11, 12, (g) => { g.fillStyle = col; g.font = 'bold 12px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 5.5, 6.5); });
        return id;
    }

    // ============================================================================================
    //  SEGUIMIENTO DE MOVIMIENTO (almas azul / naranja)
    // ============================================================================================
    const Mv = { lx: null, ly: null, calm: 0, moving: false, still: false, dx: 0, dy: 0 };
    function trackMove() {
        if (Mv.lx === null) { Mv.lx = player.x; Mv.ly = player.y; }
        Mv.dx = player.x - Mv.lx; Mv.dy = player.y - Mv.ly;
        const d = Math.hypot(Mv.dx, Mv.dy);
        if (d > 0.35) Mv.calm = 0; else Mv.calm++;
        Mv.moving = Mv.calm < 4;        // te moviste hace poco
        Mv.still = Mv.calm >= 8;        // llevas un buen rato quieto
    }

    // ============================================================================================
    //  BALAS
    // ============================================================================================
    function fire(b) {
        const p = bossFiring; bossFiring = true;
        try { pushEnemyBullet(b); } finally { bossFiring = p; }
    }
    function kill(b) { b.x = -9999; b.y = -9999; b.vx = b.vy = 0; b.fz = 0; b.upd = null; b.dead = true; }
    // opciones: hit, sc, rot ('vel'|'spin'|'fix'|'none'), spin, a0, roff, glow, grav, acc, vmin, vmax, curve, wind, life,
    //           fz (congelada N cuadros), onThaw, upd, soul ('blue'|'orange'), anim, alpha, bounce, bfloor, icy, extra
    function shot(x, y, a, sp, id, o) {
        o = o || {};
        const b = new Bullet(x, y, true, false, C(a) * sp, S(a) * sp, 'player', 'orb');
        b.ub = id; b.hit = o.hit || 7; b.width = b.height = b.hit;
        b.sc = o.sc || 3; b.rotm = o.rot || 'vel'; b.spin = o.spin || 0; b.a0 = o.a0 || 0; b.roff = o.roff || 0;
        b.glow = o.glow || null; b.grav = o.grav || 0; b.acc = o.acc || 0; b.vmin = o.vmin || 0; b.vmax = o.vmax || 99;
        b.curve = o.curve || 0; b.wind = o.wind || 0; b.life = o.life || 0; b.fz = o.fz || 0; b.onThaw = o.onThaw || null;
        b.upd = o.upd || null; b.soul = o.soul || null; b.anim = o.anim || 0; b.alpha = o.alpha; b.bounce = o.bounce || 0;
        b.bfloor = !!o.bfloor; b.icy = !!o.icy; b.extra = o.extra || null; b.age = 0; b.fromBoss = true;
        b.history = [];
        fire(b);
        return b;
    }
    const _bUpd = Bullet.prototype.update, _bDraw = Bullet.prototype.draw;
    Bullet.prototype.update = function () {
        if (!this.ub) return _bUpd.call(this);
        const b = this; b.age++;
        if (b.fz > 0) { b.fz--; if (b.fz === 0 && b.onThaw) b.onThaw(b); }
        else {
            if (b.acc) { const s = Math.hypot(b.vx, b.vy) || 0.0001, ns = clamp(s + b.acc, b.vmin, b.vmax), k = ns / s; b.vx *= k; b.vy *= k; }
            if (b.curve) { const c = C(b.curve), s = S(b.curve), vx = b.vx * c - b.vy * s, vy = b.vx * s + b.vy * c; b.vx = vx; b.vy = vy; }
            if (b.grav) b.vy += b.grav;
            if (b.wind) b.vx += b.wind;
            b.x += b.vx; b.y += b.vy;
            if (b.bounce > 0) {
                if (b.x < 8) { b.x = 8; b.vx = Math.abs(b.vx); b.bounce--; } else if (b.x > PW() - 8) { b.x = PW() - 8; b.vx = -Math.abs(b.vx); b.bounce--; }
                if (b.bfloor && b.y > PH() - 8) { b.y = PH() - 8; b.vy = -Math.abs(b.vy); b.bounce--; }
                if (b.y < 8 && b.vy < 0) { b.y = 8; b.vy = Math.abs(b.vy); }
            }
        }
        if (b.upd) b.upd(b);
        if (b.life && b.age >= b.life) kill(b);
        if (b.soul) { const dng = b.soul === 'blue' ? Mv.moving : Mv.still; b.width = b.height = dng ? b.hit : -30; }   // ancho negativo = nunca golpea
        if (!isFinite(b.x) || !isFinite(b.y)) kill(b);
    };
    Bullet.prototype.draw = function () {
        if (!this.ub) return _bDraw.call(this);
        try { drawUB(this); } catch (e) {}
    };
    // v40: cuerpo visible de la bala (lo usa bulletHit() de juego.js): elipse del tamaño del sprite dibujado, girada como el sprite.
    const _bHit = Bullet.prototype.hitShape;
    Bullet.prototype.hitShape = function () {
        if (!this.ub) return _bHit ? _bHit.call(this) : null;
        if (this.width < 0) return { never: true };              // alma azul/naranja que ahora no te daña
        const s = SPR[this.ub]; if (!s) return null;
        const c = s.f[0], w = c.width * this.sc, h = c.height * this.sc;
        let rot = 0;
        if (this.rotm === 'vel') rot = Math.atan2(this.vy, this.vx) + this.roff; else if (this.rotm === 'spin') rot = this.age * this.spin + this.a0; else if (this.rotm === 'fix') rot = this.a0;
        return { rx: w / 2, ry: h / 2, rot };
    };
    function drawUB(b) {
        const s = SPR[b.ub]; if (!s || b.dead) return;
        const fr = b.anim ? Math.floor(b.age / b.anim) % s.f.length : 0, c = s.f[fr];
        let a = b.age < 5 ? (b.age + 1) / 6 : 1; if (b.alpha !== undefined) a *= b.alpha;
        if (INK.length && inkAt(b.x, b.y)) a *= 0.55;
        let rot = 0;
        if (b.rotm === 'vel') rot = Math.atan2(b.vy, b.vx) + b.roff; else if (b.rotm === 'spin') rot = b.age * b.spin + b.a0; else if (b.rotm === 'fix') rot = b.a0;
        const w = Math.round(c.width * b.sc), h = Math.round(c.height * b.sc);
        if (!lowFx() && b.glow) {
            const gs = glowSpr(b.glow, Math.round(Math.max(w, h) * 0.8));
            ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 * a;
            ctx.drawImage(gs, b.x - gs.width / 2, b.y - gs.height / 2); ctx.restore();
        }
        ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); if (rot) ctx.rotate(rot);
        ctx.imageSmoothingEnabled = false; ctx.globalAlpha = a;
        ctx.drawImage(c, -w / 2, -h / 2, w, h);
        if (b.icy && b.fz > 0) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.4 * a; ctx.drawImage(c, -w / 2, -h / 2, w, h); }
        ctx.restore();
        if (b.soul) {
            ctx.save(); ctx.globalAlpha = 0.85 * a; ctx.lineWidth = 2; ctx.strokeStyle = b.soul === 'blue' ? '#39a8ff' : '#ffa22e';
            ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(w, h) * 0.5 + 2, 0, TAU); ctx.stroke(); ctx.restore();
        }
        if (b.extra) { ctx.save(); b.extra(b, a); ctx.restore(); }
    }

    // ============================================================================================
    //  PELIGROS QUE NO SON BALAS
    // ============================================================================================
    let HZ = [], INK = [], TINT = null;
    const Fx = { slow: 1, px: 0, py: 0 };
    function hurtP() {
        if (Date.now() <= invulnerableUntil) return false;
        if (typeof bombEffect !== 'undefined' && bombEffect.active) return false;
        if (powerUps.shield > Date.now()) { createExplosion(pcx(), pcy(), '#0ff', 8, true); try { Extras.onHit(); } catch (e) {} return false; }
        createExplosion(pcx(), pcy(), player.color, 30);
        lives -= (typeof shipHitDamage === 'function' ? shipHitDamage() : 1);
        invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50);
        screenShake = Math.max(screenShake, 14);
        if (lives <= 0) gameOver();
        return true;
    }
    function nudge(dx, dy) {
        player.x = clamp(player.x + dx, 0, PW() - player.width);
        player.y = clamp(player.y + dy, 0, PH() - player.height);
    }
    function grazeH(h) {
        if (h.grazed || typeof addGraze !== 'function' || bombStock >= BOMB_MAX) return;
        h.grazed = true; addGraze(1); if (typeof Extras !== 'undefined') Extras.onGraze();
    }
    function segDist(px, py, x0, y0, x1, y1) {
        const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
        const t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
        return Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t));
    }
    function addHz(h) {
        if (HZ.length > 48) HZ.shift();
        h.t = 0; h.life = h.life || 9999; HZ.push(h); return h;
    }
    // dibuja un sprite horneado suelto (entidades, máscaras, jefes pequeños...)
    function spr(id, x, y, sc, rot, alpha, frame) {
        const s = SPR[id]; if (!s) return;
        const c = s.f[(frame || 0) % s.f.length], w = Math.round(c.width * sc), h = Math.round(c.height * sc);
        ctx.save(); ctx.translate(Math.round(x), Math.round(y)); if (rot) ctx.rotate(rot);
        ctx.imageSmoothingEnabled = false; ctx.globalAlpha = alpha === undefined ? 1 : alpha;
        ctx.drawImage(c, -w / 2, -h / 2, w, h); ctx.restore();
    }
    // ---- rayo recto con aviso (estilo Gaster Blaster / láser de Touhou)
    //   x,y origen · a ángulo · len largo · w grosor · warn cuadros de aviso · on cuadros de daño
    //   track(h): se llama durante el aviso para reapuntar · follow(h): reposiciona el origen cada cuadro · rv: giro por cuadro
    function beam(o) {
        const h = Object.assign({ kind: 'beam', len: 1500, w: 34, warn: 55, on: 26, col: '#ff4a4a', col2: '#ffffff', rv: 0, bind: true, snd: true }, o);
        h.fade = 10; h.life = h.warn + h.on + h.fade;
        h.update = function (h) {
            if (h.follow) h.follow(h);
            if (h.t < h.warn && h.track) h.track(h);
            if (h.rv) h.a += h.rv;
            if (h.t === h.warn && h.snd) { sfx(180, 60, 0.25, 'sawtooth', 0.05); screenShake = Math.max(screenShake, 5); }
            if (h.t === h.warn && h.onFire) h.onFire(h);
        };
        h.hit = function (h) {
            if (h.t < h.warn || h.t >= h.warn + h.on) return false;
            const d = segDist(pcx(), pcy(), h.x, h.y, h.x + C(h.a) * h.len, h.y + S(h.a) * h.len);
            if (d < h.w * 0.42 + 2) return true;
            if (d < h.w * 0.5 + 20) grazeH(h);
            return false;
        };
        h.draw = function (h) {
            const x2 = h.x + C(h.a) * h.len, y2 = h.y + S(h.a) * h.len;
            ctx.save(); ctx.lineCap = 'butt';
            if (h.t < h.warn) {
                const k = h.t / h.warn, pulse = 0.35 + 0.35 * S(h.t * 0.5);
                ctx.globalAlpha = (lowFx() ? 0.5 : pulse) * (0.5 + k * 0.5); ctx.strokeStyle = h.col; ctx.lineWidth = 2 + k * 3; ctx.setLineDash([14, 10]);
                ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]);
                ctx.globalAlpha = 0.25 * k; ctx.lineWidth = h.w; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
            } else {
                const on = h.t - h.warn, k = on < 4 ? on / 4 : (on >= h.on ? Math.max(0, 1 - (on - h.on) / h.fade) : 1);
                const w = h.w * k * (1 + 0.08 * S(h.t * 1.7));
                ctx.globalAlpha = 0.55 * k; ctx.strokeStyle = h.col; ctx.lineWidth = w * 1.35; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
                ctx.globalAlpha = 0.95 * k; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
                ctx.strokeStyle = h.col2; ctx.globalAlpha = k; ctx.lineWidth = w * 0.45; ctx.beginPath(); ctx.moveTo(h.x, h.y); ctx.lineTo(x2, y2); ctx.stroke();
            }
            ctx.restore();
            if (h.cap) { ctx.save(); h.cap(h); ctx.restore(); }
        };
        return addHz(h);
    }
    // ---- zona circular: fx = 'slow' | 'pull' | 'hurt' | 'none'
    function zone(o) {
        const h = Object.assign({ kind: 'zone', r: 70, warn: 25, life: 300, fx: 'none', pow: 1, col: '#fff', bind: true }, o);
        h.update = function (h) {
            if (h.follow) h.follow(h);
            if (h.t < h.warn) return;
            const dx = pcx() - h.x, dy = pcy() - h.y, d = Math.hypot(dx, dy);
            if (d > h.r) return;
            if (h.fx === 'slow') Fx.slow = Math.min(Fx.slow, h.pow);
            else if (h.fx === 'pull') { const k = h.pow * (0.35 + 0.65 * (1 - d / h.r)); Fx.px -= dx / (d || 1) * k; Fx.py -= dy / (d || 1) * k; }
            else if (h.fx === 'push') { const k = h.pow * (0.35 + 0.65 * (1 - d / h.r)); Fx.px += dx / (d || 1) * k; Fx.py += dy / (d || 1) * k; }
        };
        h.hit = function (h) { return h.fx === 'hurt' && h.t >= h.warn && Math.hypot(pcx() - h.x, pcy() - h.y) < h.r * 0.85; };
        return addHz(h);
    }
    // ---- rectángulo que daña (charcos de sangre, venas, ola)
    function rect(o) {
        const h = Object.assign({ kind: 'rect', warn: 30, life: 240, col: '#c01030', bind: true, dmg: true }, o);
        h.hit = function (h) { return h.dmg && h.t >= h.warn && pcx() > h.x + 2 && pcx() < h.x + h.w - 2 && pcy() > h.y + 2 && pcy() < h.y + h.h - 2; };
        return addHz(h);
    }
    // ---- viento global que empuja horizontalmente
    function wind(o) {
        const h = Object.assign({ kind: 'wind', dir: 1, f: 1.1, warn: 50, life: 200, bind: true, streaks: [] }, o);
        h.update = function (h) {
            if (h.t >= h.warn) Fx.px += h.dir * h.f;
            if (h.t % 2 === 0 && h.streaks.length < 22) h.streaks.push({ x: h.dir > 0 ? -30 : PW() + 30, y: rnd() * PH(), l: 30 + rnd() * 60, v: 7 + rnd() * 8 });
            for (let i = h.streaks.length - 1; i >= 0; i--) { const s = h.streaks[i]; s.x += s.v * h.dir * (h.t < h.warn ? 0.4 : 1); if (s.x < -90 || s.x > PW() + 90) h.streaks.splice(i, 1); }
        };
        h.draw = function (h) {
            ctx.save(); ctx.strokeStyle = h.col || '#dff4ff'; ctx.lineWidth = 2; ctx.globalAlpha = h.t < h.warn ? 0.18 : 0.4;
            h.streaks.forEach(s => { ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - h.dir * s.l, s.y); ctx.stroke(); });
            // flechas de aviso
            const fl = h.t < h.warn ? (Math.floor(h.t / 8) % 2) : 1; ctx.globalAlpha = h.t < h.warn ? (fl ? 0.9 : 0.35) : 0.6;
            ctx.fillStyle = h.col || '#dff4ff'; ctx.font = '22px "Press Start 2P", monospace'; ctx.textAlign = 'center';
            ctx.fillText(h.dir > 0 ? '>>>' : '<<<', PW() / 2, PH() - 24);
            ctx.restore();
        };
        return addHz(h);
    }
    // ---- peligro libre: hazard({ update, draw, hit, life, bind })
    function hazard(o) { return addHz(Object.assign({ kind: 'custom', bind: true }, o)); }
    function ink(x, y, r, life) { INK.push({ x, y, r, t: 0, life: life || 280 }); if (INK.length > 8) INK.shift(); }
    function inkAt(x, y) { for (let i = 0; i < INK.length; i++) { const k = INK[i], g = Math.min(1, k.t / 20); if (Math.hypot(x - k.x, y - k.y) < k.r * g) return true; } return false; }
    function tint(col, a, frames) { TINT = { col, a, t: 0, len: frames || 120 }; }

    function updateHazards() {
        Fx.slow = 1; Fx.px = 0; Fx.py = 0;
        for (let i = HZ.length - 1; i >= 0; i--) {
            const h = HZ[i]; h.t++;
            if (h.update) h.update(h);
            if (h.hit && h.hit(h)) hurtP();
            if (h.t >= h.life || h.dead) HZ.splice(i, 1);
        }
        for (let i = INK.length - 1; i >= 0; i--) { INK[i].t++; if (INK[i].t > INK[i].life) INK.splice(i, 1); }
        if (TINT && ++TINT.t > TINT.len) TINT = null;
        if (Fx.slow < 1) { player.x = Mv.lx + (player.x - Mv.lx) * Fx.slow; player.y = Mv.ly + (player.y - Mv.ly) * Fx.slow; }
        if (Fx.px || Fx.py) nudge(Fx.px, Fx.py);
        Mv.lx = player.x; Mv.ly = player.y;
    }
    function drawHazards() {
        for (let i = 0; i < HZ.length; i++) {
            const h = HZ[i], bomb = (typeof bombEffect !== 'undefined' && bombEffect.active);
            ctx.save(); if (bomb) ctx.globalAlpha = 0.3;
            try {
                if (h.kind === 'zone') drawZone(h); else if (h.kind === 'rect') drawRect(h);
                if (h.draw) h.draw(h);
            } catch (e) {}
            ctx.restore();
        }
    }
    function drawZone(h) {
        const w = h.t < h.warn, k = Math.min(1, h.t / Math.max(1, h.warn)), fade = Math.min(1, (h.life - h.t) / 20);
        ctx.save(); ctx.globalAlpha = (w ? 0.3 + 0.2 * S(h.t * 0.4) : 0.32) * fade;
        const gr = ctx.createRadialGradient(h.x, h.y, h.r * 0.1, h.x, h.y, h.r);
        gr.addColorStop(0, h.col); gr.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (w ? k : 1), 0, TAU); ctx.fill();
        ctx.globalAlpha = (w ? 0.55 : 0.8) * fade; ctx.strokeStyle = h.col; ctx.lineWidth = 2; ctx.setLineDash(w ? [6, 6] : []);
        ctx.beginPath(); ctx.arc(h.x, h.y, h.r * (w ? k : 1), 0, TAU); ctx.stroke(); ctx.restore();
    }
    function drawRect(h) {
        const w = h.t < h.warn, fade = Math.min(1, (h.life - h.t) / 20);
        ctx.save(); ctx.globalAlpha = (w ? 0.22 + 0.18 * S(h.t * 0.5) : 0.85) * fade;
        ctx.fillStyle = h.col; ctx.fillRect(h.x, h.y, h.w, h.h);
        if (!w) { ctx.globalAlpha = 0.5 * fade; ctx.fillStyle = '#fff'; ctx.fillRect(h.x, h.y, h.w, 2); }
        ctx.restore();
    }

    // ============================================================================================
    //  AYUDANTES PARA LOS ATAQUES (H)
    // ============================================================================================
    function mkH(b, speed) {
        const ds = difficultySettings[currentDiff], cx = b.x + b.width / 2, cy = b.y + b.height / 2, px = pcx(), py = pcy();
        const mark = () => { b._fireT = b.timer; };
        const H = {
            b, speed, K: speed / 4, cx, cy, px, py, W: PW(), Hh: PH(), ds, diff: currentDiff, t: 0,
            ang: Math.atan2(py - cy, px - cx),
            tele: ({ facil: 72, medio: 58, dificil: 48, lunatico: 42 })[currentDiff] || 58,
            n: x => Math.max(3, Math.round(x * ds.bulletDensity)),
            iv: x => Math.max(6, Math.round(x * ds.bulletIntervalMult)),
            sp: f => speed * f,
            aim: (x, y) => Math.atan2(py - y, px - x),
            shot: (a, sp, id, o, x, y) => { mark(); return shot(x === undefined ? cx : x, y === undefined ? cy : y, a, sp, id, o); },
            ring: (n, a0, sp, id, o, x, y) => { mark(); for (let i = 0; i < n; i++) shot(x === undefined ? cx : x, y === undefined ? cy : y, a0 + TAU / n * i, sp, id, o); },
            fan: (c, spread, n, sp, id, o, x, y) => {
                mark(); const st = n > 1 ? (spread * 2) / (n - 1) : 0;
                for (let i = 0; i < n; i++) shot(x === undefined ? cx : x, y === undefined ? cy : y, c - (n > 1 ? spread : 0) + st * i, sp, id, o);
            },
            // fila de balas desde arriba con huecos (gaps = lista de x libres)
            curtain: (gaps, gapW, sp, id, o, step) => {
                mark(); gaps = [].concat(gaps);
                for (let x = 22; x < PW(); x += (step || 46)) { if (gaps.some(g => Math.abs(x - g) < gapW / 2)) continue; shot(x, -8, PI / 2, sp, id, o); }
            },
            // fila lateral con hueco en y
            wave: (dir, gapY, gapH, sp, id, o, step) => {
                mark();
                for (let y = 90; y < PH() - 70; y += (step || 46)) { if (Math.abs(y - gapY) < gapH / 2) continue; shot(dir > 0 ? -8 : PW() + 8, y, dir > 0 ? 0 : PI, sp, id, o); }
            },
            // movimiento del jefe
            dash(spd) { if (H.t === 1 || !b._dir) b._dir = pcx() > b.x + b.width / 2 ? 1 : -1; b.x += b._dir * spd; if (b.x <= 0) { b.x = 0; b._dir = 1; } if (b.x >= PW() - b.width) { b.x = PW() - b.width; b._dir = -1; } b.vx = Math.abs(b.vx || 2) * b._dir; },
            blink() {
                const t = H.t;
                if (t <= 12) b._alpha = 1 - t / 12;
                else if (t === 13) { b.x = (b.x < PW() / 2 ? 0.55 + rnd() * 0.4 : 0.05 + rnd() * 0.4) * (PW() - b.width); b._alpha = 0; }
                else if (t <= 25) b._alpha = (t - 13) / 12; else b._alpha = 1;
            },
            // efectos
            say: (txt, len) => say(b, txt, len), shake: n => { screenShake = Math.max(screenShake, n); }, tint, sfx,
            beam, zone, rect, wind, hazard, ink,
            hint: () => { b._soulHint = 170; }
        };
        return H;
    }

    // ============================================================================================
    //  GLOBO DE TEXTO (Undertale) + CARTEL DE SPELL CARD (Touhou)
    // ============================================================================================
    function say(b, text, len) { b._say = { text, t: 0, len: len || 120 }; }
    function drawBubble(b) {
        const s = b._say; if (!s) return;
        if (++s.t > s.len) { b._say = null; return; }
        const W = PW(), shown = Math.min(s.text.length, Math.floor(s.t * 1.1));
        ctx.save(); ctx.font = '22px "VT323","Press Start 2P",monospace'; ctx.textBaseline = 'alphabetic';
        const maxW = Math.min(290, W - 40), words = s.text.split(' '), lines = []; let cur = '';
        words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
        lines.push(cur);
        const lh = 20, pad = 9; let tw = 0; lines.forEach(l => { tw = Math.max(tw, ctx.measureText(l).width); });
        const bw = tw + pad * 2, bh = lines.length * lh + pad * 2 - 2;
        const cx = b.x + b.width / 2, bx = clamp(cx - bw / 2, 8, W - bw - 8), by = Math.min(b.y + b.height - 4, PH() * 0.46);
        const fade = Math.min(1, s.t / 6) * Math.min(1, (s.len - s.t) / 10);
        ctx.globalAlpha = 0.93 * fade;
        ctx.fillStyle = '#000'; ctx.fillRect(bx - 3, by - 3, bw + 6, bh + 6);
        ctx.fillStyle = '#fff'; ctx.fillRect(bx, by, bw, bh);
        const tx = clamp(cx, bx + 12, bx + bw - 12);
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.moveTo(tx - 9, by - 3); ctx.lineTo(tx, by - 15); ctx.lineTo(tx + 9, by - 3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(tx - 6, by - 1); ctx.lineTo(tx, by - 10); ctx.lineTo(tx + 6, by - 1); ctx.fill();
        ctx.fillStyle = '#000'; let left = shown;
        lines.forEach((l, i) => { const part = l.slice(0, Math.max(0, left)); left -= l.length + 1; ctx.fillText(part, bx + pad, by + pad + 14 + i * lh); });
        if (s.t < s.len - 12 && shown < s.text.length && s.t % 3 === 0) sfx(300 + (s.t % 5) * 14, 280, 0.03, 'square', 0.012);
        ctx.restore();
    }
    function drawLabel(b, accent) {          // rótulo con el nombre en español (el que usan los jefes 1-6 ya lo dibuja criaturas.js)
        const a = b._ab ? b._ab.t : 0, fade = Math.min(1, a / 8) * Math.min(1, (WIND + 75 - a) / 12);
        ctx.save(); ctx.globalAlpha = Math.max(0, fade); ctx.textAlign = 'center'; ctx.font = '11px "Press Start 2P"';
        const w = ctx.measureText(b._abName).width + 26, y = 52;
        ctx.fillStyle = 'rgba(10,0,10,0.7)'; ctx.fillRect(PW() / 2 - w / 2, y, w, 22);
        ctx.strokeStyle = accent; ctx.lineWidth = 2; ctx.strokeRect(PW() / 2 - w / 2, y, w, 22);
        ctx.fillStyle = '#fff'; ctx.fillText(b._abName, PW() / 2, y + 15); ctx.restore();
    }
    function drawOver(b) {
        const accent = (typeof LEVEL_THEMES !== 'undefined' && LEVEL_THEMES[b.levelIdx]) ? LEVEL_THEMES[b.levelIdx].accent : '#fff';
        // tinte de pantalla (parada del tiempo, luna de sangre, escarcha...)
        if (TINT) {
            const k = TINT.t < 12 ? TINT.t / 12 : Math.min(1, (TINT.len - TINT.t) / 20);
            ctx.save(); ctx.globalAlpha = TINT.a * Math.max(0, k); ctx.fillStyle = TINT.col; ctx.fillRect(0, 0, PW(), PH()); ctx.restore();
        }
        // tinta (Kraken)
        for (let i = 0; i < INK.length; i++) {
            const k = INK[i], g = Math.min(1, k.t / 20) * Math.min(1, (k.life - k.t) / 30);
            ctx.save(); ctx.globalAlpha = 0.82 * g;
            const gr = ctx.createRadialGradient(k.x, k.y, k.r * 0.2, k.x, k.y, k.r);
            gr.addColorStop(0, '#0b0414'); gr.addColorStop(0.75, '#1a0a2e'); gr.addColorStop(1, 'rgba(26,10,46,0)');
            ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(k.x, k.y, k.r * Math.min(1, k.t / 20), 0, TAU); ctx.fill(); ctx.restore();
        }
        if (b.levelIdx === 6 && b._abShow && b._abName) drawLabel(b, accent);
        // cartel japonés de la spell card
        if (b._abShow && b._abJp) {
            const a = b._ab ? b._ab.t : 0, fade = Math.min(1, a / 10) * Math.min(1, (WIND + 75 - a) / 14);
            ctx.save(); ctx.globalAlpha = Math.max(0, fade) * 0.95; ctx.textAlign = 'center';
            ctx.font = 'bold 15px "Noto Serif JP","Hiragino Mincho ProN","Yu Mincho",serif';
            ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,0,16,0.85)'; ctx.strokeText(b._abJp, PW() / 2, 92);
            ctx.fillStyle = accent; ctx.fillText(b._abJp, PW() / 2, 92); ctx.restore();
        }
        drawBubble(b);
        if (b._soulHint > 0) {          // leyenda de las almas azul / naranja
            b._soulHint--; const f = Math.min(1, b._soulHint / 20);
            ctx.save(); ctx.globalAlpha = f * 0.95; ctx.textAlign = 'center'; ctx.font = '9px "Press Start 2P", monospace';
            const y = PH() - 10, cx = PW() / 2;
            ctx.fillStyle = '#39a8ff'; ctx.fillText('AZUL: QUIETO', cx - 74, y); ctx.fillStyle = '#ffa22e'; ctx.fillText('NARANJA: MUEVETE', cx + 78, y); ctx.restore();
        }
    }

    // ============================================================================================
    //  CEREBRO: elige y ejecuta spell cards
    // ============================================================================================
    const WIND = 36;                    // cuadros de "carga" antes de cada habilidad (los mismos que criaturas.js)
    const DEFS = {};
    let CUR = { boss: null, last: 0, ab: null };
    function restFrames(b, phase, special) {
        const m = difficultySettings[currentDiff].bulletIntervalMult || 1;
        return Math.round((special ? 60 : [130, 105, 85][phase - 1]) * m * (b.defenseMode ? 0.7 : 1));
    }
    function chooseAttack(b, def, phase, special) {
        const all = def.attacks;
        let cand;
        if (special) {
            if (!b._sigDone) { const sg = all.find(d => d.sig); if (sg) { b._sigDone = true; return sg; } }
            cand = all.filter(d => !d.lw && d !== b._last);
            const w = []; cand.forEach(d => { w.push(d); if (d.sp) w.push(d); });
            cand = w;
        } else if (phase >= 3) {
            cand = all.filter(d => d.lw && d !== b._last); if (!cand.length) cand = all.filter(d => !d.sp && d !== b._last);
        } else cand = all.filter(d => !d.sp && !d.lw && d.minPhase <= phase && d !== b._last);
        if (!cand.length) cand = all.filter(d => !d.lw && !d.sp);
        if (b.defenseMode && rnd() < 0.6) { const st = cand.filter(d => d.sp || d.minPhase >= phase); if (st.length) cand = st; }
        return cand[Math.floor(Math.random() * cand.length)];
    }
    function endAttack(b) {
        for (let i = 0; i < HZ.length; i++) if (HZ[i].bind) HZ[i].life = Math.min(HZ[i].life, HZ[i].t + 14);
        b._alpha = 1; b._say = null;
        if (CUR.ab && CUR.ab.d && CUR.ab.d.end) { try { CUR.ab.d.end(b); } catch (e) {} }
        seed(null);
    }
    function runBrain(b, def, phase, special, speed) {
        if (b._ab) {
            const a = b._ab; a.t++; CUR.ab = a;
            b._abShow = a.t < WIND + 75;
            if (a.t === WIND + 1 && a.d.start) a.d.start(b, mkH(b, speed));
            if (a.t > WIND) { const H = mkH(b, speed); H.t = a.t - WIND; a.d.tick(b, H, H.t, phase); }
            if (a.t >= WIND + a.d.dur) { endAttack(b); b._ab = null; CUR.ab = null; b._cd = restFrames(b, phase, special); b._abShow = false; }
            return;
        }
        if (b._cd === undefined) b._cd = special ? 40 : 110;
        if (--b._cd <= 0) {
            const d = chooseAttack(b, def, phase, special);
            if (d) {
                b._last = d; b._ab = { d, t: 0 }; CUR.ab = b._ab; b._abName = d.name; b._abJp = d.jp || ''; b._abShow = true;
                if (d.line) say(b, d.line, 130);
                if (d.soul) b._soulHint = 190;
                sfx(d.sp || d.lw ? 380 : 560, d.sp || d.lw ? 700 : 900, 0.16, 'square', 0.04);
            } else b._cd = 60;
        }
        if (def.base) def.base(b, mkH(b, speed), b.timer, phase);   // disparo ligero entre spell cards: nunca hay tiempos muertos
    }

    // ============================================================================================
    //  ENGANCHES A LA CLASE Boss
    // ============================================================================================
    const prevSpell = Boss.prototype.runSpellCard, prevSpec = Boss.prototype.runSpecialAttack;
    const prevUpdate = Boss.prototype.update, prevDraw = Boss.prototype.draw;
    Boss.prototype.runSpellCard = function (phase, speed, cx, cy, ang) {
        const def = DEFS[this.levelIdx];
        if (!def) return prevSpell.call(this, phase, speed, cx, cy, ang);
        runBrain(this, def, phase, false, speed);
    };
    Boss.prototype.runSpecialAttack = function (speed, cx, cy, ang) {
        const def = DEFS[this.levelIdx];
        if (!def) return prevSpec.call(this, speed, cx, cy, ang);
        runBrain(this, def, 3, true, speed);
    };
    function resetAll() { HZ = []; INK = []; TINT = null; seed(null); Mv.lx = null; Mv.calm = 0; }
    Boss.prototype.update = function () {
        const b = this, mine = !!DEFS[b.levelIdx];
        if (mine) {
            const now = Date.now();
            if (CUR.boss !== b) { resetAll(); CUR.boss = b; b._sigDone = false; b._last = null; b._say = null; }
            else if (now - CUR.last > 400) { resetAll(); b._ab = null; b._cd = 60; b._abShow = false; b._alpha = 1; b._say = null; }   // hubo un corte (choque de poderes, pestaña en segundo plano)
            CUR.last = now;
            if (b.hp <= 0 || b.state === 'dead') { resetAll(); }
            else {
                trackMove();
                if (CUR.ab && b._ab !== CUR.ab) { endAttack(b); CUR.ab = null; }     // el ataque se cortó desde fuera (aviso del especial)
            }
        }
        const r = prevUpdate.call(this);
        if (mine && b.hp > 0 && b.state !== 'dead' && (b.state === 'active' || b.state === 'specialTelegraph')) updateHazards();
        return r;
    };
    Boss.prototype.draw = function (frame) {
        const mine = !!DEFS[this.levelIdx] && CUR.boss === this && this.state !== 'dead';
        if (mine) drawHazards();
        prevDraw.call(this, frame);
        if (mine) drawOver(this);
    };
    // la capa de ataques "extra" del juego original ya no se aplica a los jefes finales rediseñados
    if (typeof bossExtraAttacks === 'function') {
        const prevExtra = bossExtraAttacks;
        bossExtraAttacks = function (e, speed, cx, cy, ang, tier) {
            if (tier !== 1 && e instanceof Boss && DEFS[e.levelIdx]) return;
            return prevExtra.apply(this, arguments);
        };
    }

    // ============================================================================================
    //  API PÚBLICA
    // ============================================================================================
    function register(levelIdx, def) { DEFS[levelIdx] = def; }
    // v40: añade ataques nuevos a un jefe ya registrado (jefes/dinamicos.js)
    function addAttacks(levelIdx, list) {
        const d = DEFS[levelIdx]; if (!d) return false;
        list.forEach(a => { if (!d.attacks.some(x => x.id === a.id)) d.attacks.push(a); });
        return true;
    }
    function names(levelIdx, specialName) { if (typeof BOSS_SPECIAL_NAMES !== 'undefined' && specialName) BOSS_SPECIAL_NAMES[levelIdx] = specialName; }
    window.JefesUnicos = {
        register, addAttacks, names, def, spr, P, SPR, shot, fire, kill, beam, zone, rect, wind, hazard, ink, tint, say, sfx, hurt: hurtP, nudge,
        mkH, grazeH, addHz,
        rnd, rr, pick, seed, Mv, clamp, lerp, letterSpr, glowSpr, segDist, TAU, PW, PH, pcx, pcy, lowFx, WIND,
        hz: () => HZ,
        dev: {
            list(i) { return (DEFS[i] ? DEFS[i].attacks.map(a => a.id) : []); },
            force(id) {
                const b = activeBoss; if (!b || !DEFS[b.levelIdx]) return 'no hay jefe rediseñado activo';
                const d = DEFS[b.levelIdx].attacks.find(a => a.id === id); if (!d) return 'no existe ese ataque';
                b.state = 'active'; b.introEnded = true; b._ab = { d, t: 0 }; CUR.ab = b._ab; b._abName = d.name; b._abJp = d.jp || ''; b._abShow = true;
                if (d.line) say(b, d.line, 130); if (d.soul) b._soulHint = 190; return 'ok: ' + id;
            }
        }
    };
})();
