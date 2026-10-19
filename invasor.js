// ==========================================================================================
//  invasor.js  ·  JEFE SECRETO DEL MODO LUNÁTICO  ·  "¡¡EL INVASOR!!"
// ------------------------------------------------------------------------------------------
//  Al vencer al Ojo Gigante (nivel 7, dificultad LUNÁTICO):
//    1) La pantalla se oscurece y empiezan unos CRÉDITOS FALSOS.
//    2) A mitad de los créditos se cuela el sprite del invasor clásico de Space Invaders,
//       se agrieta la pantalla, rompe la cuarta pared y el fondo negro estalla en pedazos.
//    3) Empieza el combate contra el jefe más loco del juego, con barra de vida BLANCA y
//       ataques sacados de los videojuegos de arcade (Space Invaders, Pong, Tetris, Pac-Man,
//       Asteroids...). Si lo vences, se muestra la pantalla de victoria de siempre.
//  Este archivo se carga DESPUÉS de juego.js y no modifica nada de él: engancha
//  triggerGameWin(), Extras.takeover(), Extras.busy() y Extras.afterFrame().
// ==========================================================================================
(function () {
    'use strict';
    if (typeof Extras === 'undefined' || typeof Bullet === 'undefined' || typeof triggerGameWin === 'undefined') return;

    const TAU = Math.PI * 2;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const FONT = s => s + 'px "Press Start 2P", monospace';
    const lowFx = () => (typeof performanceMode !== 'undefined' && performanceMode);

    // ---------------------------------------------------------------------------------- sprites
    const ROWS = {
        crab: [
            ['..#.....#..', '...#...#...', '..#######..', '.##.###.##.', '###########', '#.#######.#', '#.#.....#.#', '...##.##...'],
            ['..#.....#..', '#..#...#..#', '#.#######.#', '###.###.###', '###########', '.#########.', '..#.....#..', '.#.......#.']
        ],
        squid: [
            ['...##...', '..####..', '.######.', '##.##.##', '########', '..#..#..', '.#.##.#.', '#.#..#.#'],
            ['...##...', '..####..', '.######.', '##.##.##', '########', '.#.##.#.', '#......#', '.#....#.']
        ],
        octo: [
            ['....####....', '.##########.', '############', '###..##..###', '############', '...##..##...', '..##.##.##..', '##........##'],
            ['....####....', '.##########.', '############', '###..##..###', '############', '..###..###..', '.##..##..##.', '..##....##..']
        ],
        ufo: [['.....######.....', '...##########...', '..############..', '.##.##.##.##.##.', '################', '..###..##..###..', '...#........#...']]
    };
    const sprCache = {};
    function sprite(name, frame, color) {
        const key = name + (frame % ROWS[name].length) + color;
        if (sprCache[key]) return sprCache[key];
        const rows = ROWS[name][frame % ROWS[name].length];
        const c = document.createElement('canvas'); c.width = rows[0].length; c.height = rows.length;
        const g = c.getContext('2d'); g.fillStyle = color;
        rows.forEach((r, y) => { for (let x = 0; x < r.length; x++) if (r[x] === '#') g.fillRect(x, y, 1, 1); });
        return (sprCache[key] = c);
    }
    function drawSpr(name, frame, x, y, u, color) {
        const c = sprite(name, frame, color || '#fff');
        ctx.save(); ctx.imageSmoothingEnabled = false;
        ctx.drawImage(c, Math.round(x), Math.round(y), Math.round(c.width * u), Math.round(c.height * u));
        ctx.restore();
    }

    // ---------------------------------------------------------------------------------- sonido 8 bits
    function beep(f, d, type, v, slideTo) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = type || 'square'; o.connect(g); g.connect(audioCtx.destination);
            const t = audioCtx.currentTime; d = d || 0.08;
            o.frequency.setValueAtTime(f, t);
            if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + d);
            g.gain.setValueAtTime(v || 0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
            o.start(t); o.stop(t + d + 0.02);
        } catch (e) {}
    }
    const MARCH = [73.4, 69.3, 65.4, 61.7];   // los 4 graves descendentes del Space Invaders original
    let marchI = 0;
    const marchBeep = () => beep(MARCH[marchI++ % 4], 0.09, 'square', 0.035);

    // ---------------------------------------------------------------------------------- utilidades de juego
    function hurt() {          // misma lógica que cualquier golpe recibido en juego.js
        if (!isPlaying || Date.now() <= invulnerableUntil) return false;
        if (powerUps.shield > Date.now()) { createExplosion(player.x + player.width / 2, player.y, '#0ff', 8, true); invulnerableUntil = Date.now() + 500; return false; }
        createExplosion(player.x + player.width / 2, player.y + player.height / 2, player.color, 30);
        lives -= shipHitDamage();
        invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50);
        if (lives <= 0) gameOver();
        return true;
    }
    const pcx = () => player.x + player.width / 2;
    const pcy = () => player.y + player.height / 2;

    function mk(x, y, vx, vy, w) {                // bala enemiga propia (x,y = centro)
        const b = new Bullet(x, y, true, false, vx, vy, 'player', 'orb');
        b.width = w; b.height = w; b.inv = true;
        return b;
    }
    function fire(b) { const prev = bossFiring; bossFiring = true; pushEnemyBullet(b); bossFiring = prev; }
    function clearMyBullets() { for (let i = enemyBullets.length - 1; i >= 0; i--) if (enemyBullets[i].inv) enemyBullets.splice(i, 1); }

    // daño de los disparos del jugador contra un objetivo propio (esbirros, OVNI)
    function takeShots(x, y, w, h, tok) {
        let dmg = 0;
        for (let i = bullets.length - 1; i >= 0; i--) {
            const b = bullets[i];
            if (!(b.x < x + w && b.x + b.width > x && b.y < y + h && b.y + b.height > y)) continue;
            if (b.pierce) { if (b.hitList) { if (b.hitList.includes(tok)) continue; b.hitList.push(tok); } }
            else bullets.splice(i, 1);
            dmg += b.isSuper ? 3 : (b.source === 'partner' ? (0.4 + (window.Combo ? Combo.partnerBonus() : 0)) : 1);
        }
        return dmg;
    }

    // ---------------------------------------------------------------------------------- balas con forma propia
    function squiggle(x, y, vy, t0) {            // el rayo zigzag del Space Invaders
        const b = mk(x, y, 0, vy, 8); b.x0 = x; b._t = t0 || 0;
        b.update = function () { this._t++; this.y += this.vy; this.x = this.x0 + Math.sin(this._t * 0.2) * 18; };
        b.draw = function () {
            ctx.save(); ctx.fillStyle = '#fff';
            for (let k = 0; k < 8; k++) {
                const xx = this.x0 + Math.sin((this._t - k * 2.2) * 0.2) * 18;
                ctx.globalAlpha = 1 - k * 0.09; ctx.fillRect(Math.round(xx) - 2, Math.round(this.y - k * 4) - 2, 4, 4);
            }
            ctx.restore();
        };
        return b;
    }
    function plunger(x, y, vx, vy) {             // la bala en forma de "T" del Space Invaders
        const b = mk(x, y, vx, vy, 9); b._t = 0;
        b.update = function () { this._t++; this.x += this.vx; this.y += this.vy; };
        b.draw = function () {
            ctx.save(); ctx.fillStyle = (this._t >> 2) & 1 ? '#fff' : '#cfe8ff';
            const x = Math.round(this.x), y = Math.round(this.y);
            ctx.fillRect(x - 2, y - 7, 4, 14); ctx.fillRect(x - 5, y - 7, 10, 3);
            ctx.restore();
        };
        return b;
    }
    function pongBall(x, y, vx, vy) {
        const b = mk(x, y, vx, vy, 16); b._bounces = 0; b._trail = [];
        b.update = function () {
            const W = playAreaW, H = playAreaH;
            this._trail.push({ x: this.x, y: this.y }); if (this._trail.length > 7) this._trail.shift();
            this.x += this.vx; this.y += this.vy;
            if (this.x < 10) { this.x = 10; this.vx = Math.abs(this.vx); this._bounces++; beep(480, 0.05, 'square', 0.05); }
            if (this.x > W - 10) { this.x = W - 10; this.vx = -Math.abs(this.vx); this._bounces++; beep(480, 0.05, 'square', 0.05); }
            if (this.y < 52) { this.y = 52; this.vy = Math.abs(this.vy); this._bounces++; beep(360, 0.05, 'square', 0.05); }
            if (this.y > H - 10 && this._bounces < 7) { this.y = H - 10; this.vy = -Math.abs(this.vy); this._bounces++; beep(360, 0.05, 'square', 0.05); }
            if (this._bounces >= 7 && this.vy < 6) this.vy += 0.25;   // al final se escapa por abajo
        };
        b.draw = function () {
            ctx.save(); ctx.fillStyle = '#fff';
            this._trail.forEach((p, i) => { ctx.globalAlpha = (i + 1) / 16; ctx.fillRect(Math.round(p.x) - 8, Math.round(p.y) - 8, 16, 16); });
            ctx.globalAlpha = 0.9;
            const ph = 54, ly = clamp(this.y - ph / 2, 52, playAreaH - ph);   // las dos palas (solo decoración)
            ctx.fillRect(1, ly, 5, ph); ctx.fillRect(playAreaW - 6, ly, 5, ph);
            ctx.globalAlpha = 1; ctx.fillRect(Math.round(this.x) - 8, Math.round(this.y) - 8, 16, 16);
            ctx.restore();
        };
        return b;
    }
    // ---- v30: tres ataques arcade nuevos (GALAGA, SNAKE, FROGGER)
    function galagaBee(x, y, dir) {              // abeja de Galaga: se lanza en picada haciendo un rizo
        const b = mk(x, y, 0, 2.5, 11); b._t = 0; b._dir = dir;
        b.update = function () { this._t++; this.vx = Math.sin(this._t * 0.085) * 2.6 * this._dir; this.x += this.vx; this.y += this.vy; };
        b.draw = function () {
            const x = Math.round(this.x), y = Math.round(this.y), w = (this._t >> 2) & 1;
            ctx.save(); ctx.fillStyle = '#3a5aff'; ctx.fillRect(x - 3, y - 5, 6, 10); ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - 8, y - 4 + w * 2, 5, 4); ctx.fillRect(x + 3, y - 4 + w * 2, 5, 4);
            ctx.fillStyle = '#ff3030'; ctx.fillRect(x - 2, y - 3, 1, 1); ctx.fillRect(x + 1, y - 3, 1, 1); ctx.restore();
        };
        return b;
    }
    // cadena de balas que recorre una trayectoria precalculada (cada segmento lleva su propio reloj: no se congela nunca)
    function pathChain(path, n, lag, w, look) {
        const out = [];
        for (let i = 0; i < n; i++) {
            const b = mk(path[0].x, path[0].y, 0, 0, w); b._t = 0; b._i = i; b._w = w;
            b.update = function () {
                this._t++; const k = this._t - this._i * lag;
                if (k < 0) { this._hid = true; this.width = this.height = -30; return; }
                this._hid = false; this.width = this.height = this._w;
                if (k >= path.length) { this.x = -999; return; }
                this.x = path[k].x; this.y = path[k].y;
            };
            b.draw = function () { if (!this._hid) look(this, this._i); };
            out.push(b);
        }
        return out;
    }
    function snakeChain(x0, speedY) {            // SNAKE: la cabeza zigzaguea y el cuerpo sigue su rastro
        const path = [], W = playAreaW; for (let k = 0; path.length < 900; k++) { const y = 52 + speedY * k; path.push({ x: clamp(x0 + Math.sin(k * 0.055) * W * 0.33, 14, W - 14), y }); if (y > playAreaH + 40) break; }
        return pathChain(path, 9, 6, 13, (b, i) => {
            const x = Math.round(b.x), y = Math.round(b.y), h = i === 0;
            ctx.save(); ctx.fillStyle = h ? '#c8ff6a' : (i % 2 ? '#3ed83e' : '#2ab02a'); ctx.fillRect(x - 7, y - 7, 14, 14);
            if (h) { ctx.fillStyle = '#10300a'; ctx.fillRect(x - 4, y - 3, 3, 3); ctx.fillRect(x + 1, y - 3, 3, 3); }
            ctx.restore();
        });
    }
    // ---- v31: ocho clásicos de los 80 (Donkey Kong, Centipede, Missile Command, Tron, Bomberman, R-Type, Robotron, Q*bert)
    function centipede(dir0, y0, n) {            // CENTIPEDE: recorre filas y baja un escalón al llegar al borde
        const W = playAreaW, path = []; let x = dir0 > 0 ? -12 : W + 12, y = y0, dir = dir0;
        while (y < playAreaH + 40 && path.length < 1400) {
            x += dir * 5.4; path.push({ x, y });
            if ((dir > 0 && x > W - 14) || (dir < 0 && x < 14)) { for (let k = 0; k < 22; k++) { y += 5; path.push({ x, y }); } dir *= -1; }
        }
        return pathChain(path, n, 6, 13, (b, i) => {
            const x = Math.round(b.x), y = Math.round(b.y), h = i === 0, f = (b._t >> 3) & 1;
            ctx.save(); ctx.fillStyle = h ? '#ff4a4a' : '#3ed83e'; ctx.fillRect(x - 7, y - 6, 14, 12);
            ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - 5, y + 6, 2, 3 + f * 2); ctx.fillRect(x + 3, y + 6, 2, 5 - f * 2); ctx.fillRect(x - 5, y - 9, 2, 3 + f * 2); ctx.fillRect(x + 3, y - 9, 2, 5 - f * 2);
            if (h) { ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 3, 3, 3); ctx.fillRect(x + 1, y - 3, 3, 3); }
            ctx.restore();
        });
    }
    function mushroom(x, y) {                    // seta de Centipede: obstáculo fijo un rato
        const b = mk(x, y, 0, 0, 14); b._t = 0;
        b.update = function () { if (++this._t > 380) this.x = -999; };
        b.draw = function () { const xx = Math.round(this.x), yy = Math.round(this.y), a = this._t > 340 ? (380 - this._t) / 40 : 1; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff4a6a'; ctx.fillRect(xx - 8, yy - 8, 16, 9); ctx.fillRect(xx - 5, yy - 11, 10, 3); ctx.fillStyle = '#fff'; ctx.fillRect(xx - 5, yy - 6, 3, 3); ctx.fillRect(xx + 2, yy - 8, 3, 3); ctx.fillStyle = '#ffe9c0'; ctx.fillRect(xx - 3, yy + 1, 6, 7); ctx.restore(); };
        return b;
    }
    function kongBarrel(dir0, y0) {              // DONKEY KONG: barril que rueda por la viga y cae al siguiente piso
        const W = playAreaW, b = mk(dir0 > 0 ? -14 : W + 14, y0, dir0 * 4.0, 0, 16); b._d = dir0; b._fall = 0; b._t = 0;
        b.update = function () {
            this._t++;
            if (this._fall > 0) { this.y += 3.6; this._fall -= 3.6; if (this._fall <= 0) { this._d *= -1; this.vx = this._d * 4.0; } }
            else { this.x += this.vx; if ((this._d > 0 && this.x > W - 14) || (this._d < 0 && this.x < 14)) this._fall = 120; }
        };
        b.draw = function () {
            const x = Math.round(this.x), y = Math.round(this.y), r = (this._t * 0.2 * (this._d || 1)) % (Math.PI * 2);
            ctx.save(); ctx.translate(x, y); ctx.rotate(r); ctx.fillStyle = '#b8601a'; ctx.beginPath(); ctx.arc(0, 0, 11, 0, 6.3); ctx.fill();
            ctx.fillStyle = '#6a3410'; ctx.fillRect(-11, -2, 22, 4); ctx.fillRect(-2, -11, 4, 22); ctx.fillStyle = '#e89a4a'; ctx.fillRect(-7, -7, 4, 4); ctx.restore();
        };
        return b;
    }
    function missile(x0, y0, tx, ty, sp) {       // MISSILE COMMAND: misil con estela que acaba en explosión
        const a = Math.atan2(ty - y0, tx - x0), b = mk(x0, y0, Math.cos(a) * sp, Math.sin(a) * sp, 8); b._o = { x: x0, y: y0 }; b._tx = tx; b._ty = ty; b._boom = 0; b._t = 0; b._R = 40;
        b.update = function () {
            this._t++;
            if (this._boom > 0) {
                const f = ++this._boom, R = this._R, r = f <= 22 ? R * f / 22 : R * (1 - (f - 22) / 26);
                this.width = this.height = Math.max(1, (r - 2.2) / 0.4); if (f > 48) this.x = -999;
            } else { this.x += this.vx; this.y += this.vy; if (this.y >= this._ty) { this._boom = 1; this.vx = this.vy = 0; this.x = this._tx; this.y = this._ty; beep(110, 0.3, 'sawtooth', 0.06, 40); } }
        };
        b.draw = function () {
            ctx.save();
            if (this._boom > 0) {
                const f = this._boom, R = this._R, r = Math.max(1, f <= 22 ? R * f / 22 : R * (1 - (f - 22) / 26)), g = ctx.createRadialGradient(this.x, this.y, 1, this.x, this.y, r);
                g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#ffe14a'); g.addColorStop(1, 'rgba(255,60,30,0.85)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(this.x, this.y, r, 0, 6.3); ctx.fill();
            } else {
                ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this._o.x, this._o.y); ctx.lineTo(this.x, this.y); ctx.stroke();
                ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x) - 3, Math.round(this.y) - 3, 6, 6);
                if ((this._t >> 3) & 1) { ctx.strokeStyle = '#7dff7d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(this._tx - 8, this._ty - 8); ctx.lineTo(this._tx + 8, this._ty + 8); ctx.moveTo(this._tx + 8, this._ty - 8); ctx.lineTo(this._tx - 8, this._ty + 8); ctx.stroke(); }
            }
            ctx.restore();
        };
        return b;
    }
    function tronCell(x, y, col) {               // estela de moto de luz
        const b = mk(x, y, 0, 0, 10); b._t = 0;
        b.update = function () { if (++this._t > 115) this.x = -999; };
        b.draw = function () { const a = this._t > 90 ? (115 - this._t) / 25 : 1; ctx.save(); ctx.globalAlpha = 0.9 * a; ctx.fillStyle = col; ctx.fillRect(Math.round(this.x) - 5, Math.round(this.y) - 5, 10, 10); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x) - 2, Math.round(this.y) - 2, 4, 4); ctx.restore(); };
        return b;
    }
    function tronCycle(x, y, dx, dy, col) {      // TRON: la moto gira en ángulos rectos y deja un muro de luz
        const W = playAreaW, H = playAreaH, b = mk(x, y, dx * 5.0, dy * 5.0, 12); b._t = 0; b._turn = 38 + Math.floor(rnd(0, 18));
        b.update = function () {
            this._t++; this.x += this.vx; this.y += this.vy; if (this._t % 6 === 0) fire(tronCell(this.x, this.y, col));
            const out = this.x < 8 || this.x > W - 8 || this.y < 64 || this.y > H - 8;
            if (this._t >= this._turn || out) {
                this._turn = this._t + 32 + Math.floor(rnd(0, 26));
                if (Math.abs(this.vx) > 0) { const d = this.y < H * 0.5 ? 1 : -1; this.vx = 0; this.vy = d * 5.0; } else { const d = this.x < W * 0.5 ? 1 : -1; this.vy = 0; this.vx = d * 5.0; }
                this.x = clamp(this.x, 8, W - 8); this.y = clamp(this.y, 64, H - 8);
            }
            if (this._t > 175) this.x = -999;
        };
        b.draw = function () { ctx.save(); ctx.fillStyle = col; if (!lowFx()) { ctx.shadowColor = col; ctx.shadowBlur = 14; } ctx.fillRect(Math.round(this.x) - 8, Math.round(this.y) - 8, 16, 16); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x) - 4, Math.round(this.y) - 4, 8, 8); ctx.restore(); };
        return b;
    }
    function fireCell(x, y) {                    // casilla de llamas de Bomberman
        const b = mk(x, y, 0, 0, 24); b._t = 0;
        b.update = function () { if (++this._t > 26) this.x = -999; };
        b.draw = function () { const a = this._t > 18 ? (26 - this._t) / 8 : 1; ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff8a1a'; ctx.fillRect(Math.round(this.x) - 15, Math.round(this.y) - 15, 30, 30); ctx.fillStyle = '#ffe14a'; ctx.fillRect(Math.round(this.x) - 9, Math.round(this.y) - 9, 18, 18); ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(this.x) - 4, Math.round(this.y) - 4, 8, 8); ctx.restore(); };
        return b;
    }
    function bomb(x, y) {                        // BOMBERMAN: mecha de ~1.2 s y explosión en cruz
        const b = mk(x, y, 0, 0, 12); b._t = 0; b.width = b.height = -30;
        b.update = function () {
            this._t++; this.width = this.height = -30;
            if (this._t === 72) {
                const W = playAreaW, H = playAreaH; fire(fireCell(this.x, this.y));
                [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { for (let k = 1; k <= 4; k++) { const xx = this.x + d[0] * k * 32, yy = this.y + d[1] * k * 32; if (xx > 0 && xx < W && yy > 40 && yy < H) fire(fireCell(xx, yy)); } });
                screenShake = Math.max(screenShake, 8); beep(90, 0.35, 'sawtooth', 0.08, 40); this.x = -999;
            }
        };
        b.draw = function () {
            const x = Math.round(this.x), y = Math.round(this.y), blink = (this._t >> (this._t > 48 ? 2 : 3)) & 1;
            ctx.save();
            if (this._t > 30) { ctx.globalAlpha = 0.28; ctx.fillStyle = '#ff8a1a'; ctx.fillRect(x - 15, y - 15, 30, 30); for (const d of [[1, 0], [-1, 0], [0, 1], [0, -1]]) ctx.fillRect(x + d[0] * 16 - (d[0] ? (d[0] > 0 ? 0 : 128) : 15), y + d[1] * 16 - (d[1] ? (d[1] > 0 ? 0 : 128) : 15), d[0] ? 128 : 30, d[1] ? 128 : 30); ctx.globalAlpha = 1; }
            ctx.fillStyle = blink ? '#ffffff' : '#20202c'; ctx.beginPath(); ctx.arc(x, y + 2, 11, 0, 6.3); ctx.fill(); ctx.fillStyle = '#5a5a6a'; ctx.fillRect(x - 6, y - 4, 4, 4);
            ctx.fillStyle = '#8a6a3a'; ctx.fillRect(x + 2, y - 13, 3, 5); ctx.fillStyle = (this._t >> 1) & 1 ? '#ffe14a' : '#ff5a1a'; ctx.fillRect(x + 1, y - 17, 5, 5); ctx.restore();
        };
        return b;
    }
    function bydo(y0) {                          // R-TYPE: orbe Bydo que ondula
        const b = mk(playAreaW + 10, y0, -3.0, 0, 10); b._t = 0; b._y0 = y0;
        b.update = function () { this._t++; this.x += this.vx; this.y = this._y0 + Math.sin(this._t * 0.07) * 42; };
        b.draw = function () { const x = Math.round(this.x), y = Math.round(this.y); ctx.save(); ctx.fillStyle = '#7a2ad8'; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.3); ctx.fill(); ctx.fillStyle = '#ff5ad0'; ctx.beginPath(); ctx.arc(x - 2, y, 5, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 2, 3, 3); ctx.restore(); };
        return b;
    }
    function grunt(x, y, sp) {                   // ROBOTRON: robot que te persigue con giro lento
        const b = mk(x, y, 0, 0, 12); b._t = 0; b._a = Math.atan2(pcy() - y, pcx() - x);
        b.update = function () {
            this._t++; const a = Math.atan2(pcy() - this.y, pcx() - this.x); let d = ((a - this._a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
            this._a += clamp(d, -0.045, 0.045); this.x += Math.cos(this._a) * sp; this.y += Math.sin(this._a) * sp; if (this._t > 270) this.x = -999;
        };
        b.draw = function () {
            const x = Math.round(this.x), y = Math.round(this.y), f = (this._t >> 3) & 1, a = this._t > 235 ? (270 - this._t) / 35 : 1;
            ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#ff3a3a'; ctx.fillRect(x - 6, y - 7, 12, 12); ctx.fillStyle = '#ffe14a'; ctx.fillRect(x - 9, y - 3 + f * 2, 3, 6); ctx.fillRect(x + 6, y - 3 - f * 2, 3, 6);
            ctx.fillRect(x - 5, y + 5, 3, 4 + f * 2); ctx.fillRect(x + 2, y + 5, 3, 6 - f * 2); ctx.fillStyle = '#fff'; ctx.fillRect(x - 4, y - 4, 3, 3); ctx.fillRect(x + 1, y - 4, 3, 3); ctx.restore();
        };
        return b;
    }
    function qball(x) {                          // Q*BERT: bolita naranja que baja saltando en diagonal
        const W = playAreaW, b = mk(x, 56, 0, 0, 13); b._t = 0; b._by = 56; b._d = Math.random() < 0.5 ? 1 : -1;
        b.update = function () {
            const h = this._t % 30; if (h === 0 && this._t > 0) { this._by += 56; this._d = this.x < 40 ? 1 : (this.x > W - 40 ? -1 : (Math.random() < 0.5 ? 1 : -1)); beep(520, 0.04, 'square', 0.03); }
            this._t++; const f = h / 30; this.x += this._d * 46 / 30; this.y = this._by + 56 * f - 28 * Math.sin(Math.PI * f);
        };
        b.draw = function () { const x = Math.round(this.x), y = Math.round(this.y), r = this._d; ctx.save(); ctx.fillStyle = '#ff8a1a'; ctx.beginPath(); ctx.arc(x, y, 11, 0, 6.3); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 6, y - 6, 5, 6); ctx.fillRect(x + 1, y - 6, 5, 6); ctx.fillStyle = '#000'; ctx.fillRect(x - 4 + r, y - 4, 2, 3); ctx.fillRect(x + 3 + r, y - 4, 2, 3); ctx.fillStyle = '#ffb04a'; ctx.fillRect(x + r * 6 - 3, y + 1, 6, 4); ctx.restore(); };
        return b;
    }
    function froggerCar(x, y, vx, col) {         // coche de Frogger: tres cuadrados en fila
        const out = [];
        for (let k = -1; k <= 1; k++) {
            const b = mk(x + k * 13, y, vx, 0, 12);
            b.draw = function () { const xx = Math.round(this.x), yy = Math.round(this.y); ctx.save(); ctx.fillStyle = col; ctx.fillRect(xx - 7, yy - 7, 14, 14); ctx.fillStyle = '#fff'; if (k === (vx > 0 ? 1 : -1)) ctx.fillRect(xx + (vx > 0 ? 2 : -5), yy - 5, 3, 3); ctx.restore(); };
            out.push(b);
        }
        return out;
    }
    const TET = ['#00f0f0', '#f0f000', '#b000f0', '#00f000', '#f00000', '#3050ff', '#ff9a00'];
    function tetCell(x, y, vy, ci) {
        const b = mk(x, y, 0, vy, 22); b._c = TET[ci % 7];
        b.draw = function () {
            const x = Math.round(this.x) - 11, y = Math.round(this.y) - 11;
            ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 24, 24);
            ctx.fillStyle = this._c; ctx.fillRect(x, y, 22, 22);
            ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x, y, 22, 4); ctx.fillRect(x, y, 4, 22);
            ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(x + 18, y, 4, 22); ctx.fillRect(x, y + 18, 22, 4);
        };
        return b;
    }
    function pacBullet(x, y, vx, pac) {
        const b = mk(x, y, vx, 0, 50); b._t = 0; b._pac = pac;
        b.update = function () { this._t++; this.x += this.vx; this._pac.x = this.x; };
        b.draw = function () {
            const open = Math.abs(Math.sin(this._t * 0.35)) * 0.75 + 0.05, face = this.vx > 0 ? 0 : Math.PI;
            ctx.save(); ctx.fillStyle = '#ffe600';
            if (!lowFx()) { ctx.shadowColor = '#ffe600'; ctx.shadowBlur = 16; }
            ctx.beginPath(); ctx.moveTo(this.x, this.y);
            ctx.arc(this.x, this.y, 26, face + open, face + TAU - open); ctx.closePath(); ctx.fill();
            ctx.shadowBlur = 0; ctx.fillStyle = '#000';
            ctx.beginPath(); ctx.arc(this.x - Math.cos(face) * 2, this.y - 12, 3.2, 0, TAU); ctx.fill();
            ctx.restore();
        };
        return b;
    }
    function ghostBullet(x, y, vx, color, phase) {
        const b = mk(x, y, vx, 0, 40); b._t = phase || 0; b._y0 = y; b._c = color;
        b.update = function () { this._t++; this.x += this.vx; this.y = this._y0 + Math.sin(this._t * 0.12) * 18; };
        b.draw = function () {
            const r = 18, x = this.x, y = this.y, w = (this._t >> 3) & 1;
            ctx.save(); ctx.fillStyle = this._c;
            ctx.beginPath(); ctx.arc(x, y - 2, r, Math.PI, 0); ctx.lineTo(x + r, y + r);
            for (let i = 0; i < 4; i++) { const sx = x + r - (i + 1) * (r / 2); ctx.lineTo(sx + r / 4, y + r - (((i + w) & 1) ? 6 : 0)); ctx.lineTo(sx, y + r); }
            ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x - 7, y - 5, 5, 0, TAU); ctx.arc(x + 7, y - 5, 5, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1a3cff'; const d = this.vx > 0 ? 2 : -2;
            ctx.beginPath(); ctx.arc(x - 7 + d, y - 5, 2.5, 0, TAU); ctx.arc(x + 7 + d, y - 5, 2.5, 0, TAU); ctx.fill();
            ctx.restore();
        };
        return b;
    }
    function asteroid(x, y, vx, vy, size) {      // polígono de vectores, como el Asteroids de Atari
        const w = size === 2 ? 46 : 26, b = mk(x, y, vx, vy, w);
        b._r = w / 2; b._rot = rnd(0, TAU); b._vr = rnd(-0.05, 0.05); b._size = size; b._split = rnd(0.42, 0.6);
        b._pts = []; for (let i = 0; i < 10; i++) b._pts.push(rnd(0.72, 1.12));
        b.update = function () {
            this.x += this.vx; this.y += this.vy; this._rot += this._vr;
            if (this._size === 2 && this.y > playAreaH * this._split) {
                for (let s = -1; s <= 1; s += 2) fire(asteroid(this.x, this.y, s * rnd(1.1, 1.9), rnd(1.8, 2.6), 1));
                createExplosion(this.x, this.y, '#fff', 8, true); beep(180, 0.12, 'sawtooth', 0.05, 60);
                this.x = -9999;                      // la bala madre desaparece
            }
        };
        b.draw = function () {
            ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this._rot);
            ctx.lineJoin = 'miter'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath();
            for (let i = 0; i < 10; i++) { const a = i / 10 * TAU, r = this._r * 1.1 * this._pts[i]; ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * r, Math.sin(a) * r); }
            ctx.closePath(); ctx.stroke(); ctx.restore();
        };
        return b;
    }

    // ---------------------------------------------------------------------------------- texto
    function fitText(text, x, y, size, color, maxW, align) {
        ctx.font = FONT(size);
        while (size > 5 && ctx.measureText(text).width > maxW) { size--; ctx.font = FONT(size); }
        ctx.fillStyle = color; ctx.textAlign = align || 'center'; ctx.fillText(text, x, y);
    }
    function bubble(text, cx, y, maxW) {
        ctx.save(); ctx.font = FONT(8); ctx.textBaseline = 'top'; ctx.textAlign = 'left';
        const words = text.split(' '), lines = []; let line = '';
        words.forEach(w => { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > maxW - 16 && line) { lines.push(line); line = w; } else line = t; });
        lines.push(line);
        const lw = Math.max.apply(null, lines.map(l => ctx.measureText(l).width)) + 16, lh = lines.length * 13 + 10;
        const x = clamp(cx - lw / 2, 4, playAreaW - lw - 4);
        ctx.fillStyle = '#000'; ctx.fillRect(x, y, lw, lh);
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x + 1, y + 1, lw - 2, lh - 2);
        ctx.fillStyle = '#fff'; lines.forEach((l, i) => ctx.fillText(l, x + 8, y + 7 + i * 13));
        ctx.restore();
    }

    // ==========================================================================================
    //  EL JEFE
    // ==========================================================================================
    const POOL = {
        1: ['zigzag', 'plunger', 'march', 'zigzag', 'plunger'],
        2: ['zigzag', 'plunger', 'march', 'bunkers', 'ufo', 'pong', 'tetris', 'asteroids', 'snake', 'frogger', 'kong', 'centipede', 'missile', 'qbert'],
        3: ['zigzag', 'plunger', 'pong', 'tetris', 'asteroids', 'pacman', 'curtain', 'spiral', 'laser', 'ufo', 'march', 'galaga', 'snake', 'frogger', 'kong', 'centipede', 'missile', 'qbert', 'tron', 'bomber', 'rtype', 'robotron']
    };
    const TAGS = { zigzag: 'ZIGZAG', plunger: 'PLUNGER', march: '¡INVASIÓN!', bunkers: 'ESCUDOS 1978', ufo: 'OVNI MISTERIOSO', pong: 'PONG', tetris: 'TETRIS', asteroids: 'ASTEROIDS', pacman: 'WAKA WAKA', curtain: 'SPACE INVADERS', spiral: 'INSERT COIN', laser: 'CAÑÓN LÁSER', galaga: 'GALAGA', snake: 'SNAKE', frogger: 'FROGGER', kong: 'DONKEY KONG', centipede: 'CENTIPEDE', missile: 'MISSILE COMMAND', tron: 'TRON', bomber: 'BOMBERMAN', rtype: 'R-TYPE', robotron: 'ROBOTRON', qbert: 'Q*BERT' };
    const ATK_LEN = { zigzag: 110, plunger: 80, march: 20, bunkers: 40, ufo: 30, pong: 110, tetris: 200, asteroids: 130, pacman: 170, curtain: 90, spiral: 210, laser: 190, galaga: 210, snake: 150, frogger: 210, kong: 190, centipede: 150, missile: 200, tron: 200, bomber: 230, rtype: 215, robotron: 250, qbert: 200 };

    class InvaderBoss {
        constructor() {
            const W = playAreaW;
            this.u = Math.max(8, Math.floor(Math.min(260, W * 0.5) / 11));
            this.width = this.u * 11; this.height = this.u * 8;
            this.startY = Math.round(playAreaH * 0.40 - this.height / 2);
            this.x = W / 2 - this.width / 2; this.y = this.startY;
            this.levelIdx = 7;
            this.maxHp = 1700; this.hp = this.maxHp; this.lastHp = this.hp;
            this.state = 'active'; this.timer = 0; this.defenseMult = 0; this.hitsTaken = 0;
            this.mode = 'enter'; this.enterT = 0; this.phase = 1; this.trans = 0; this.lowSaid = false;
            this.dir = 1; this.stepT = 0; this.frame = 0; this.drops = 0;
            this.cool = 70; this.atk = null; this.lastAtk = '';
            this.minions = null; this.mDir = 1; this.mStepT = 0; this.mFrame = 0;
            this.ufo = null; this.bunkers = []; this.beams = []; this.hbeams = []; this.pac = null;
            this.msg = null; this.tag = null; this.popups = []; this.hitFlash = 0; this.trail = 1; this.bits = null; this.deadT = 0;
            this.say('¿CRÉDITOS? ¡SI NI HE EMPEZADO!', 170);
        }
        say(text, len) { this.msg = { text, t: len || 120, len: len || 120 }; }
        pop(x, y, text) { this.popups.push({ x, y, text, t: 50 }); }
        get cx() { return this.x + this.width / 2; }
        get bottom() { return this.y + this.height; }

        // ------------------------------------------------------------------ lógica
        update() {
            if (this.state === 'dead') { this.updateDead(); return; }
            this.timer++;
            const W = playAreaW, ratio = this.hp / this.maxHp;
            if (this.hp < this.lastHp) this.hitFlash = 3;
            this.lastHp = this.hp; if (this.hitFlash > 0) this.hitFlash--;
            if (this.msg && --this.msg.t <= 0) this.msg = null;
            if (this.tag && --this.tag.t <= 0) this.tag = null;
            this.defenseMult = (this.mode === 'enter' || this.trans > 0) ? 0 : 1;

            if (this.mode === 'enter') {            // baja de "pantalla completa" a su sitio
                this.enterT++;
                const e = 1 - Math.pow(1 - Math.min(1, this.enterT / 110), 3);
                this.y = lerp(this.startY, 64, e);
                if (this.enterT === 110) { this.mode = 'fight'; this.say('¡VAMOS A JUGAR, PILOTO!', 100); screenShake = 16; playExplosionSound(); }
                this.updateSystems(); return;
            }
            const ph = ratio > 0.66 ? 1 : (ratio > 0.33 ? 2 : 3);
            if (ph > this.phase) { this.phase = ph; this.beginTransition(); }
            if (ratio < 0.15 && !this.lowSaid) { this.lowSaid = true; this.say('¡NO! ¡ME QUEDA UNA SOLA VIDA!', 140); }
            if (this.trans > 0) { this.trans--; this.updateSystems(); return; }

            // marcha a pasos, como el original: cuanto menos vida, más rápido
            const slow = (this.atk && this.atk.id === 'laser') ? 3 : 1;
            const interval = Math.max(4, Math.round(5 + 28 * ratio)) * slow;
            if (++this.stepT >= interval) {
                this.stepT = 0; this.frame ^= 1; marchBeep();
                this.x += this.u * 0.9 * this.dir;
                if (this.x < 4 || this.x > W - this.width - 4) {
                    this.x = clamp(this.x, 4, W - this.width - 4); this.dir *= -1;
                    if (this.drops < 3) { this.y += 10; this.drops++; } else { this.y = 64; this.drops = 0; }
                }
            }
            if (this.atk) this.tickAttack(); else if (--this.cool <= 0) this.pickAttack();
            this.updateSystems();
        }

        beginTransition() {
            this.trans = 100; this.atk = null; this.tractor = null; this.hbeams = []; this.cool = 40; clearMyBullets();
            screenShake = 22; playExplosionSound();
            if (this.phase === 2) { this.say('¡INSERTA MONEDA PARA CONTINUAR!', 120); this.tag = { text: 'NIVEL 2', t: 100 }; }
            else { this.say('¡MODO DIFÍCIL! ¡DOBLE VELOCIDAD!', 120); this.tag = { text: 'NIVEL 3 · ¡DIFÍCIL!', t: 100 }; }
            for (let i = 0; i < 5; i++) beep(300 + i * 140, 0.09, 'square', 0.05);
        }

        pickAttack() {
            const pool = POOL[this.phase].filter(id => id !== this.lastAtk &&
                !(id === 'march' && this.minions) && !(id === 'bunkers' && this.bunkers.length) && !(id === 'ufo' && this.ufo));
            const id = pool[Math.floor(Math.random() * pool.length)] || 'zigzag';
            this.lastAtk = id; this.atk = { id, t: 0, len: ATK_LEN[id] };
            this.tag = { text: '▶ ' + TAGS[id], t: 70 };
            if (id === 'march') this.spawnMinions();
            if (id === 'bunkers') this.spawnBunkers();
            if (id === 'ufo') this.spawnUfo();
            if (id === 'pacman') { const y = clamp(pcy(), playAreaH * 0.5, playAreaH - 50); this.pac = { y, dir: Math.random() < 0.5 ? 1 : -1, x: -200, t: 0 }; }
        }

        tickAttack() {
            const a = this.atk, W = playAreaW, t = a.t++, ph = this.phase, sx = () => rnd(this.x + 10, this.x + this.width - 10), by = this.bottom - 4;
            switch (a.id) {
                case 'zigzag':
                    if (t % 11 === 0) { fire(squiggle(sx(), by, 3.1, t)); if (ph >= 2) fire(squiggle(sx(), by, 3.1, t + 9)); }
                    break;
                case 'plunger':
                    if (t % 13 === 0 && t < 13 * (3 + ph)) {
                        const x = sx(), tx = clamp(pcx() + rnd(-50, 50), 0, W), vy = 4.1, tt = Math.max(30, (pcy() - by) / vy);
                        fire(plunger(x, by, clamp((tx - x) / tt, -2.2, 2.2), vy));
                    }
                    break;
                case 'tetris':
                    if (t % 55 === 0 && t < 165) {
                        const n = Math.ceil(W / 24), gap = 4 + (ph < 3 ? 1 : 0), g0 = Math.floor(rnd(1, n - gap - 1)), ci = Math.floor(rnd(0, 7));
                        for (let i = 0; i < n; i++) if (i < g0 || i >= g0 + gap) fire(tetCell(i * 24 + 12, -12, 2.4, ci));
                        beep(220, 0.1, 'square', 0.05, 110);
                    }
                    break;
                case 'pong':
                    if (t === 45) {
                        fire(pongBall(this.cx, by, (Math.random() < 0.5 ? -1 : 1) * 3.4, 3.2));
                        if (ph >= 3) fire(pongBall(this.cx, by, (Math.random() < 0.5 ? -1 : 1) * 3.8, 3.0));
                        beep(520, 0.08, 'square', 0.06);
                    }
                    if (t < 45 && t % 15 === 0) beep(300 + (t / 15) * 60, 0.06, 'square', 0.04);
                    break;
                case 'asteroids':
                    if (t % 26 === 0 && t < 104) { fire(asteroid(rnd(40, W - 40), -30, rnd(-1.1, 1.1), rnd(1.6, 2.3), 2)); beep(120, 0.15, 'sawtooth', 0.04, 70); }
                    break;
                case 'curtain':
                    if (t === 0) {
                        const sp = 16, copies = (W >= 640 && ph >= 3) ? 2 : 1;
                        for (let k = 0; k < copies; k++) {
                            const fw = 11 * sp, x0 = clamp(copies === 1 ? pcx() - fw / 2 : (k ? W * 0.68 : W * 0.32) - fw / 2, 8, W - fw - 8), y0 = this.bottom + 6;
                            ROWS.crab[0].forEach((row, r) => { for (let c = 0; c < 11; c++) if (row[c] === '#') fire(mk(x0 + c * sp + sp / 2, y0 + r * sp, 0, 1.9, 9)); });
                        }
                        beep(600, 0.25, 'square', 0.05, 200);
                    }
                    break;
                case 'spiral':
                    if (t % 3 === 0) {
                        const ang = t * 0.31;
                        for (let k = 0; k < 2; k++) { const aa = ang + k * Math.PI; fire(mk(this.cx, this.y + this.height * 0.5, Math.cos(aa) * 2.7, Math.sin(aa) * 2.7, 7)); }
                    }
                    if (t % 60 === 30) { const a0 = rnd(0, TAU); for (let k = 0; k < 14; k++) { const aa = a0 + k / 14 * TAU; fire(mk(this.cx, this.y + this.height * 0.5, Math.cos(aa) * 2.3, Math.sin(aa) * 2.3, 8)); } beep(700, 0.1, 'square', 0.05, 300); }
                    break;
                case 'laser':
                    if (t === 0 || t === 40 || t === 80) { this.beams.push({ x: clamp(pcx() + (t ? rnd(-60, 60) : 0), 20, W - 20), t: 0, warn: 55, on: 22 }); beep(900, 0.4, 'sawtooth', 0.03, 1400); }
                    break;
                case 'galaga': {                       // rayo tractor + abejas en picada
                    if (t === 0) { this.tractor = { x: clamp(pcx() + rnd(-80, 80), 90, W - 90), t: 0 }; beep(300, 0.7, 'sawtooth', 0.04, 900); this.say('¡TE CAPTURO LA NAVE!', 90); }
                    const T = this.tractor;
                    if (T) {
                        T.t++; T.x += (pcx() - T.x) * 0.012;
                        if (T.t > 50 && T.t < 175) {
                            const hw = 20 + clamp((pcy() - this.bottom) / Math.max(1, playAreaH - this.bottom), 0, 1) * 58;
                            if (Math.abs(pcx() - T.x) < hw && pcy() > this.bottom) {
                                player.y = Math.max(0, player.y - 1.25);
                                if (player.y < this.bottom + 6) { hurt(); player.y = Math.min(playAreaH - player.height, this.bottom + 90); }
                            }
                        }
                        if (T.t > 176) this.tractor = null;
                    }
                    if (t % 24 === 0 && t > 20 && t < 150) fire(galagaBee(sx(), by, Math.random() < 0.5 ? 1 : -1));
                    break;
                }
                case 'snake':
                    if (t === 0) { snakeChain(clamp(pcx() + rnd(-60, 60), 80, W - 80), 2.3).forEach(fire); if (ph >= 3) snakeChain(W - clamp(pcx(), 80, W - 80), 2.0).forEach(fire); beep(200, 0.2, 'square', 0.05, 400); }
                    break;
                case 'frogger':
                    if (t % 36 === 0 && t < 150) {
                        for (let lane = 0; lane < 4; lane++) {
                            if (Math.random() < 0.4) continue;
                            const dir = lane % 2 ? -1 : 1, y = this.bottom + 70 + lane * 52, cols = ['#ff5a5a', '#ffd23a', '#4ad0ff', '#c07aff'];
                            froggerCar(dir > 0 ? -20 : W + 20, y, dir * (2.6 + lane * 0.5), cols[lane]).forEach(fire);
                        }
                        beep(160, 0.08, 'square', 0.04);
                    }
                    break;
                case 'kong':
                    if (t === 0) this.say('¡TOMA ESTOS BARRILES!', 80);
                    if (t % 38 === 0 && t < 150) { const row = Math.floor(t / 38) % 3; fire(kongBarrel((t / 38) % 2 ? -1 : 1, by + 40 + row * 100)); beep(150, 0.08, 'square', 0.04, 90); }
                    break;
                case 'centipede':
                    if (t === 0) {
                        centipede(Math.random() < 0.5 ? 1 : -1, by + 36, 12).forEach(fire); if (ph >= 3) centipede(-1, by + 150, 9).forEach(fire);
                        for (let i = 0; i < 5; i++) fire(mushroom(rnd(40, W - 40), rnd(playAreaH * 0.35, playAreaH * 0.75)));
                        beep(180, 0.2, 'square', 0.05, 360);
                    }
                    break;
                case 'missile':
                    if (t === 0) this.say('¡LLUEVEN MISILES!', 80);
                    if (t % 26 === 0 && t < 156) {
                        const k = t / 26, tx = k % 3 === 2 ? clamp(pcx(), 30, W - 30) : rnd(30, W - 30), ty = playAreaH - rnd(40, 90);
                        fire(missile(sx(), by, tx, ty, 2.6 + (ph - 1) * 0.35)); beep(700, 0.08, 'sawtooth', 0.03, 300);
                    }
                    break;
                case 'tron':
                    if (t === 0) {
                        const ya = clamp(pcy() - 110, 90, playAreaH - 60), yb = clamp(pcy() + 110, 90, playAreaH - 60);
                        fire(tronCycle(10, ya, 1, 0, '#2ad8ff')); fire(tronCycle(W - 10, yb, -1, 0, '#ff9a1a'));
                        if (ph >= 3) fire(tronCycle(W / 2, 70, 0, 1, '#ff3adf'));
                        this.say('FIN DE LÍNEA.', 80); beep(260, 0.3, 'sawtooth', 0.05, 520);
                    }
                    break;
                case 'bomber':
                    if (t === 0) this.say('¡BOMBA PUESTA!', 70);
                    if (t % 52 === 0 && t < 170) { fire(bomb(clamp(pcx() + (t ? rnd(-50, 50) : 0), 40, W - 40), clamp(pcy(), 90, playAreaH - 40))); beep(330, 0.06, 'square', 0.04); }
                    break;
                case 'rtype':
                    if (t === 0 || t === 72 || t === 144) {
                        this.hbeams.push({ y: clamp(pcy(), 90, playAreaH - 40), t: 0, warn: 70, on: 22, h: 44 });
                        if (t === 0) this.say('CARGANDO RAYO ONDA...', 90);
                    }
                    if (t % 24 === 0 && t < 190) fire(bydo(rnd(playAreaH * 0.3, playAreaH * 0.85)));
                    break;
                case 'robotron':
                    if (t === 0) this.say('¡LOS ROBOTS VAN A POR TI!', 90);
                    if (t % 36 === 0 && t < 180) {
                        let x, y, tries = 0; do { const side = Math.floor(rnd(0, 4)); x = side === 0 ? 10 : side === 1 ? W - 10 : rnd(20, W - 20); y = side === 2 ? by + 20 : side === 3 ? playAreaH - 10 : rnd(by + 20, playAreaH - 10); } while (Math.hypot(x - pcx(), y - pcy()) < 170 && ++tries < 8);
                        fire(grunt(x, y, 1.45 + (ph - 1) * 0.3)); fire(grunt(W - x, y, 1.45 + (ph - 1) * 0.3));
                        beep(200, 0.08, 'square', 0.04, 120);
                    }
                    break;
                case 'qbert':
                    if (t === 0) this.say('¡@!#$%&!', 70);
                    if (t % 44 === 0 && t < 135) { fire(qball(rnd(60, W - 60))); if (ph >= 3) fire(qball(rnd(60, W - 60))); }
                    break;
                case 'pacman':
                    if (this.pac) {
                        const P = this.pac; P.t++;
                        if (t === 60) { fire(pacBullet(P.dir > 0 ? -40 : W + 40, P.y, P.dir * 7.2, P)); }
                        if (t === 80 || t === 100 || t === 120) {
                            const cols = ['#ff2a2a', '#ffb8ff', '#00ffff', '#ffb852'], i = (t - 80) / 20, off = (i - 1) * 62;
                            fire(ghostBullet(P.dir > 0 ? -40 : W + 40, clamp(P.y + off, 80, playAreaH - 30), P.dir * 4.6, cols[i], i * 20));
                        }
                        if (t % 20 === 0 && t < 60) beep(494, 0.07, 'square', 0.05);
                    }
                    break;
            }
            if (t >= a.len) { this.atk = null; this.cool = this.phase === 1 ? 70 : (this.phase === 2 ? 52 : 36); }
        }

        // ------------------------------------------------------------------ esbirros, OVNI, escudos, rayos
        spawnMinions() {
            const W = playAreaW, sz = clamp(Math.round(W / 17), 22, 38), gx = sz * 1.55, gy = sz * 1.25;
            const cols = Math.max(3, Math.min(7, Math.floor((W - 70) / gx))), rows = playAreaH >= 620 ? 3 : 2;
            const x0 = W / 2 - (cols * gx) / 2 + (gx - sz) / 2, y0 = this.bottom + 16;
            this.minions = []; this.mDir = 1; this.mStepT = 0;
            for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                const type = ['squid', 'crab', 'octo'][r % 3];
                this.minions.push({ x: x0 + c * gx, y: y0 + r * gy, w: sz, h: Math.round(sz * 0.8), type, hp: 2, flash: 0 });
            }
            this.say('¡MIS HERMANOS! ¡A LA INVASIÓN!', 110);
        }
        spawnBunkers() {
            const W = playAreaW, n = 4, cell = 4, cols = 14, rows = 10, y = playAreaH - 190;
            for (let i = 0; i < n; i++) {
                const cells = [];
                for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
                    let alive = true;
                    if (r < 3 && (c < 3 - r || c >= cols - (3 - r))) alive = false;
                    if (r >= 7 && c >= 4 && c < cols - 4) alive = false;
                    cells.push(alive ? 1 : 0);
                }
                this.bunkers.push({ x: Math.round((i + 0.5) * W / n - cols * cell / 2), y, cell, cols, rows, cells, life: 1500 });
            }
            this.say('TOMA, UNOS ESCUDOS... ¡DE 1978!', 120);
        }
        spawnUfo() {
            const left = Math.random() < 0.5;
            this.ufo = { x: left ? -50 : playAreaW + 50, y: Math.round(playAreaH * 0.5), vx: left ? 2.6 : -2.6, hp: 5, bomb: 20, flash: 0, t: 0 };
        }
        updateSystems() {
            const W = playAreaW, H = playAreaH;
            // --- esbirros
            if (this.minions) {
                const M = this.minions, alive = M.length;
                const interval = Math.max(7, 8 + alive * 1.6);
                if (this.mode === 'fight' && ++this.mStepT >= interval) {
                    this.mStepT = 0; this.mFrame ^= 1;
                    let edge = false; M.forEach(m => { m.x += 8 * this.mDir; if (m.x < 6 || m.x + m.w > W - 6) edge = true; });
                    if (edge) { this.mDir *= -1; M.forEach(m => { m.x += 8 * this.mDir; m.y += 14; }); }
                    if (Math.random() < 0.55 && this.trans === 0) {
                        const m = M[Math.floor(Math.random() * M.length)];
                        fire(plunger(m.x + m.w / 2, m.y + m.h, 0, 3.0));
                    }
                }
                for (let i = M.length - 1; i >= 0; i--) {
                    const m = M[i];
                    const d = takeShots(m.x, m.y, m.w, m.h, m);
                    if (d > 0) { m.hp -= d; m.flash = 3; }
                    if (m.flash > 0) m.flash--;
                    let gone = false;
                    if (m.hp <= 0) { createExplosion(m.x + m.w / 2, m.y + m.h / 2, '#fff', 14); score += 120; beep(200, 0.1, 'square', 0.05, 60); try { Extras.onKill(); } catch (e) {} gone = true; }
                    else if (m.y > H * 0.78) { createExplosion(m.x + m.w / 2, m.y + m.h / 2, '#ff6', 10); gone = true; }
                    else if (Date.now() > invulnerableUntil && player.x < m.x + m.w && player.x + player.width > m.x && player.y < m.y + m.h && player.y + player.height > m.y) { hurt(); gone = true; }
                    if (gone) M.splice(i, 1);
                }
                if (!M.length) { this.minions = null; score += 500; this.pop(this.cx, this.bottom + 20, '+500'); if (this.state === 'active') this.say('¡MIS HERMANOS! ¡NOOO!', 80); }
            }
            // --- OVNI misterioso
            const U = this.ufo;
            if (U) {
                U.t++; U.x += U.vx; if (U.flash > 0) U.flash--;
                if (--U.bomb <= 0 && this.trans === 0) { U.bomb = 30; fire(mk(U.x + 24, U.y + 18, 0, 3.2, 10)); }
                const d = takeShots(U.x, U.y, 48, 22, U);
                if (d > 0) { U.hp -= d; U.flash = 3; }
                if (U.hp <= 0) {
                    createExplosion(U.x + 24, U.y + 11, '#f4f', 30); score += 300; this.pop(U.x, U.y, '+300'); beep(900, 0.3, 'square', 0.06, 100);
                    try { items.push(new Item(U.x + 24, U.y + 11)); } catch (e) {}
                    this.ufo = null;
                } else if (U.x < -70 || U.x > W + 70) this.ufo = null;
            }
            // --- escudos (absorben balas del jefe; tus disparos los atraviesan)
            for (let k = this.bunkers.length - 1; k >= 0; k--) {
                const B = this.bunkers[k]; B.life--;
                const bw = B.cols * B.cell, bh = B.rows * B.cell;
                for (let i = enemyBullets.length - 1; i >= 0; i--) {
                    const b = enemyBullets[i]; if (!b.inv) continue;
                    if (b.x < B.x - 4 || b.x > B.x + bw + 4 || b.y < B.y - 4 || b.y > B.y + bh + 4) continue;
                    const c = Math.floor((b.x - B.x) / B.cell), r = Math.floor((b.y - B.y) / B.cell);
                    const rad = Math.max(1.6, b.width / 7);
                    let hit = false;
                    for (let rr = Math.floor(r - rad); rr <= r + rad; rr++) for (let cc = Math.floor(c - rad); cc <= c + rad; cc++) {
                        if (rr < 0 || cc < 0 || rr >= B.rows || cc >= B.cols) continue;
                        if (B.cells[rr * B.cols + cc] && Math.hypot(rr - r, cc - c) <= rad) { B.cells[rr * B.cols + cc] = 0; hit = true; }
                    }
                    if (hit && b.width <= 14) { createExplosion(b.x, b.y, '#4f6', 3, true); enemyBullets.splice(i, 1); }
                }
                if (B.life <= 0 || !B.cells.some(v => v)) this.bunkers.splice(k, 1);
            }
            // --- rayos del cañón láser
            for (let i = this.beams.length - 1; i >= 0; i--) {
                const L = this.beams[i]; L.t++;
                if (L.t === L.warn) { screenShake = Math.max(screenShake, 8); beep(110, 0.35, 'sawtooth', 0.08, 40); }
                if (L.t >= L.warn && L.t < L.warn + L.on && Math.abs(pcx() - L.x) < 19) hurt();
                if (L.t >= L.warn + L.on) this.beams.splice(i, 1);
            }
            // --- rayo onda de R-Type (horizontal): sigue tu altura y se queda fijo justo antes de disparar
            for (let i = (this.hbeams || []).length - 1; i >= 0; i--) {
                const L = this.hbeams[i]; L.t++;
                if (L.t < L.warn - 18) L.y += (pcy() - L.y) * 0.1;
                if (L.t === L.warn) { screenShake = Math.max(screenShake, 8); beep(90, 0.4, 'sawtooth', 0.08, 40); }
                if (L.t >= L.warn && L.t < L.warn + L.on && Math.abs(pcy() - L.y) < L.h / 2 - 3) hurt();
                if (L.t >= L.warn + L.on) this.hbeams.splice(i, 1);
            }
            if (this.pac && !this.atk && !enemyBullets.some(b => b.inv && b._pac)) this.pac = null;
            this.popups = this.popups.filter(p => --p.t > 0);
        }

        updateDead() {
            if (!this.bits) {
                this.bits = []; clearMyBullets();
                this.minions = null; this.ufo = null; this.bunkers = []; this.beams = []; this.hbeams = []; this.tractor = null; this.pac = null; this.atk = null; this.msg = null; this.tag = null;
                ROWS.crab[this.frame].forEach((row, r) => { for (let c = 0; c < 11; c++) if (row[c] === '#') this.bits.push({ x: this.x + c * this.u, y: this.y + r * this.u, vx: (c - 5) * 0.55 + rnd(-1, 1), vy: rnd(-5, 0), a: 1 }); });
            }
            this.deadT++;
            if (this.deadT < 30 && this.deadT % 6 === 0) beep(rnd(150, 500), 0.1, 'sawtooth', 0.05, 40);
            if (this.deadT === 40) beep(440, 0.5, 'square', 0.06, 55);
            if (this.deadT > 22) this.bits.forEach(b => { b.x += b.vx; b.y += b.vy; b.vy += 0.22; if (this.deadT > 60) b.a = Math.max(0, b.a - 0.02); });
        }

        // ------------------------------------------------------------------ dibujo
        draw() {
            const u = this.u, W = playAreaW, H = playAreaH;
            ctx.save();
            if (this.state === 'dead') { this.drawDead(); ctx.restore(); return; }
            // telegrafías
            this.beams.forEach(L => {
                if (L.t < L.warn) {
                    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(L.t * 0.7); ctx.fillStyle = '#fff';
                    for (let y = this.bottom; y < H; y += 24) ctx.fillRect(L.x - 2, y, 4, 12);
                    ctx.globalAlpha = 1; ctx.font = FONT(14); ctx.textAlign = 'center'; ctx.fillText('!', L.x, this.bottom + 18);
                } else {
                    const f = Math.random() * 6;
                    ctx.fillStyle = '#fff'; if (!lowFx()) { ctx.shadowColor = '#9cf'; ctx.shadowBlur = 20; }
                    ctx.fillRect(L.x - 17 - f / 2, this.bottom, 34 + f, H - this.bottom);
                    ctx.fillStyle = '#9cf'; ctx.fillRect(L.x - 6, this.bottom, 12, H - this.bottom); ctx.shadowBlur = 0;
                }
            });
            (this.hbeams || []).forEach(L => {
                ctx.save();
                if (L.t < L.warn) {
                    const k = L.t / L.warn; ctx.globalAlpha = 0.45 + 0.35 * Math.sin(L.t * 0.6); ctx.fillStyle = '#7ad0ff';
                    for (let x = 0; x < W; x += 28) ctx.fillRect(x, L.y - 1, 14, 3);
                    ctx.globalAlpha = 0.9; ctx.fillStyle = '#10182c'; ctx.fillRect(6, L.y - 8, 90, 16); ctx.strokeStyle = '#7ad0ff'; ctx.strokeRect(6, L.y - 8, 90, 16); ctx.fillStyle = k > 0.85 ? '#ffffff' : '#ff9a1a'; ctx.fillRect(8, L.y - 6, 86 * k, 12);
                } else {
                    const on = L.t - L.warn, a = on < 3 ? on / 3 : (on > L.on - 5 ? Math.max(0, (L.on - on) / 5) : 1), f = Math.random() * 6;
                    ctx.globalAlpha = a; if (!lowFx()) { ctx.shadowColor = '#7ad0ff'; ctx.shadowBlur = 24; }
                    ctx.fillStyle = '#7a4aff'; ctx.fillRect(0, L.y - L.h / 2 - f / 2, W, L.h + f); ctx.fillStyle = '#7ad0ff'; ctx.fillRect(0, L.y - L.h / 3, W, L.h * 0.66); ctx.fillStyle = '#fff'; ctx.fillRect(0, L.y - 5, W, 10); ctx.shadowBlur = 0;
                }
                ctx.restore();
            });
            if (this.tractor && this.tractor.t > 8) {          // rayo tractor de Galaga
                const T = this.tractor, on = T.t > 50, f = on ? 0.4 + 0.25 * Math.sin(T.t * 0.6) : 0.15 + 0.1 * Math.sin(T.t * 0.8);
                ctx.save(); ctx.globalAlpha = Math.min(1, T.t / 15) * f; ctx.fillStyle = on ? '#8ad0ff' : '#ffffff';
                ctx.beginPath(); ctx.moveTo(T.x - 20, this.bottom); ctx.lineTo(T.x + 20, this.bottom); ctx.lineTo(T.x + 78, H); ctx.lineTo(T.x - 78, H); ctx.closePath(); ctx.fill();
                ctx.globalAlpha = Math.min(1, T.t / 15) * (on ? 0.7 : 0.3); ctx.fillStyle = '#fff';
                for (let k = 0; k < 6; k++) { const yy = this.bottom + ((T.t * 3 + k * 70) % (H - this.bottom)), hw2 = 20 + (yy - this.bottom) / (H - this.bottom) * 58; ctx.fillRect(T.x - hw2, yy, hw2 * 2, 2); }
                ctx.restore();
            }
            if (this.pac) {
                const P = this.pac;
                if (this.atk && this.atk.id === 'pacman' || P.x > -100) {
                    ctx.fillStyle = '#ffd9a0';
                    for (let x = 14; x < W; x += 30) { const ahead = P.x < -100 || (P.dir > 0 ? x > P.x : x < P.x); if (ahead) ctx.fillRect(x - 2, P.y - 2, 4, 4); }
                }
            }
            // escudos
            this.bunkers.forEach(B => {
                ctx.globalAlpha = B.life < 120 ? (B.life % 10 < 5 ? 0.4 : 1) : 1; ctx.fillStyle = '#3f6';
                for (let r = 0; r < B.rows; r++) for (let c = 0; c < B.cols; c++) if (B.cells[r * B.cols + c]) ctx.fillRect(B.x + c * B.cell, B.y + r * B.cell, B.cell, B.cell);
                ctx.globalAlpha = 1;
            });
            // esbirros
            if (this.minions) this.minions.forEach(m => {
                const name = m.type, spr = ROWS[name][0], uu = m.w / ((name === 'squid') ? 8 : (name === 'crab' ? 11 : 12)) * (name === 'squid' ? 0.75 : 1);
                drawSpr(name, this.mFrame, m.x + (m.w - spr[0].length * uu) / 2, m.y, uu, m.flash ? '#f66' : '#fff');
            });
            if (this.ufo) drawSpr('ufo', 0, this.ufo.x, this.ufo.y, 3, this.ufo.flash ? '#fff' : '#ff3df2');
            // jefe
            const wob = this.trans > 0 ? Math.sin(this.timer * 1.2) * 3 : 0;
            if (!lowFx()) { ctx.shadowColor = this.phase >= 3 ? '#f33' : '#fff'; ctx.shadowBlur = 16; }
            drawSpr('crab', this.frame, this.x + wob, this.y, u, this.hitFlash ? '#ff7070' : '#fff');
            ctx.shadowBlur = 0;
            // pupilas que siguen a la nave
            const dx = clamp((pcx() - this.cx) / W * u * 0.8, -u * 0.22, u * 0.22);
            ctx.fillStyle = this.phase >= 3 ? '#ff2a2a' : '#fff';
            [3.5, 7.5].forEach(c => ctx.fillRect(Math.round(this.x + wob + c * u - u * 0.2 + dx), Math.round(this.y + 3.5 * u - u * 0.15), Math.round(u * 0.4), Math.round(u * 0.4)));
            // rótulo del ataque
            if (this.tag) {
                ctx.globalAlpha = Math.min(1, this.tag.t / 14); ctx.textAlign = 'center';
                fitText(this.tag.text, W / 2, 56, 9, '#fff', W - 20, 'center'); ctx.globalAlpha = 1;
            }
            this.popups.forEach(p => { ctx.globalAlpha = Math.min(1, p.t / 20); fitText(p.text, p.x, p.y - (50 - p.t) * 0.6, 9, '#ffe27a', 80, 'center'); ctx.globalAlpha = 1; });
            if (this.msg) bubble(this.msg.text, this.cx, this.bottom + 8, Math.min(W - 16, 330));
            this.drawBar();
            ctx.restore();
        }

        drawBar() {
            const W = playAreaW, bw = Math.min(W - 24, 520), x0 = Math.round(W / 2 - bw / 2), y0 = 8;
            const shown = this.mode === 'enter' ? Math.min(1, this.enterT / 90) : clamp(this.hp / this.maxHp, 0, 1);
            if (shown < this.trail) this.trail = Math.max(shown, this.trail - 0.004); else this.trail = shown;
            drawSpr('crab', 0, x0, y0 + 2, 2, '#fff');
            ctx.font = FONT(8); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = '#fff';
            ctx.fillText('INVASOR', x0 + 30, y0 + 9);
            ctx.textAlign = 'right'; ctx.fillText(Math.ceil(shown * 100) + '%', x0 + bw, y0 + 9);
            const bx = x0 + 30, by = y0 + 14, w = bw - 30, h = 14;
            ctx.fillStyle = '#000'; ctx.fillRect(bx, by, w, h);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.strokeRect(bx + 1.5, by + 1.5, w - 3, h - 3);
            const n = Math.floor((w - 10) / 8), full = Math.ceil(shown * n - 0.0001), tr = Math.ceil(this.trail * n - 0.0001);
            const blink = shown < 0.2 && shown > 0 && (this.timer >> 3) & 1;
            for (let i = 0; i < n; i++) {
                if (i < full) ctx.fillStyle = blink ? '#aaa' : '#fff'; else if (i < tr) ctx.fillStyle = '#777'; else continue;
                ctx.fillRect(bx + 5 + i * 8, by + 5, 6, h - 10);
            }
        }

        drawDead() {
            const W = playAreaW, H = playAreaH;
            if (this.deadT <= 22) {
                const sh = (22 - this.deadT) * 0.25;
                if (this.deadT % 2) drawSpr('crab', this.frame, this.x + rnd(-sh, sh) * 4, this.y + rnd(-sh, sh) * 4, this.u, '#fff');
            } else if (this.bits) {
                this.bits.forEach(b => { if (b.a <= 0) return; ctx.globalAlpha = b.a; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(b.x), Math.round(b.y), Math.ceil(this.u), Math.ceil(this.u)); });
                ctx.globalAlpha = 1;
            }
            if (this.deadT > 36) {
                ctx.font = FONT(Math.max(14, Math.min(28, W / 16))); ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
                if ((this.deadT >> 3) & 1) ctx.fillText('GAME OVER', W / 2, H * 0.4);
                ctx.font = FONT(8); ctx.fillStyle = '#9cf'; ctx.fillText('(PARA EL INVASOR)', W / 2, H * 0.4 + 26);
            }
        }
    }

    // ==========================================================================================
    //  CRÉDITOS FALSOS + ROMPER LA CUARTA PARED
    // ==========================================================================================
    const INV = { c: null, shards: null, flash: 0 };

    function buildLines() {
        const L = [];
        const add = (t, s, h) => L.push({ t, s, h });
        add('big', 'FIN', 60); add('gap', '', 24);
        add('role', 'DIRECCIÓN', 22); add('name', 'UN DESARROLLADOR SIN SUEÑO', 30); add('gap', '', 22);
        add('role', 'PROGRAMACIÓN', 22); add('name', 'MUCHO CAFÉ Y CERO TESTS', 30); add('gap', '', 22);
        add('role', 'ARTE', 22); add('name', 'PÍXELES. MUCHOS PÍXELES.', 30); add('gap', '', 22);
        add('role', 'MÚSICA', 22); add('name', 'ARCHIVO3.MP3 Y ARCHIVO5.MP3', 30); add('gap', '', 22);
        add('role', 'JEFE FINAL', 22); add('name', 'EL OJO (1 OJO, 0 AMIGOS)', 30); add('gap', '', 22);
        add('role', 'PUNTAJE FINAL', 22); add('name', pad(score, 9), 30); add('gap', '', 22);
        add('role', 'AGRADECIMIENTOS ESPECIALES', 22); add('name', 'A TU DEDO ÍNDICE', 26); add('name', '(SE LO DEBEMOS)', 30); add('gap', '', 30);
        add('small', 'NINGÚN INVASOR RESULTÓ HERIDO', 26); add('hit', 'DURANTE ESTE JUEGO', 40);
        add('name', '*** ... EXCEPTO UNO ***', 30);
        add('gap', '', 200);
        return L;
    }
    function startCredits() {
        stopMusic(); enemyBullets.length = 0; bullets.length = 0;
        try { loadTrack('invasor.mp3'); } catch (e) {}   // precarga la música del jefe durante los créditos
        const lines = buildLines(); let off = 0; lines.forEach(l => { l.off = off; off += l.h; });
        INV.c = { t: 0, scroll: 0, tI: -1, eye: activeBoss, lines, cracks: null, cn: 0 };
        INV.flash = 0;
    }
    function creditsValid() { return isPlaying && INV.c && activeBoss === INV.c.eye; }

    function makeCracks(cx, cy) {
        const CW = canvas.width, CH = canvas.height, R = [];
        for (let i = 0; i < 18; i++) {
            let a = (i / 18) * TAU + rnd(-0.2, 0.2), x = cx, y = cy; const pts = [{ x, y }];
            for (let s = 0; s < 40 && x > -40 && x < CW + 40 && y > -40 && y < CH + 40; s++) {
                a += rnd(-0.35, 0.35); const d = rnd(18, 42); x += Math.cos(a) * d; y += Math.sin(a) * d; pts.push({ x, y });
            }
            R.push(pts);
            if (Math.random() < 0.7) {             // ramificación
                const k = Math.floor(pts.length * rnd(0.3, 0.6)), b = [{ x: pts[k].x, y: pts[k].y }];
                let aa = a + (Math.random() < 0.5 ? 1 : -1) * rnd(0.5, 1.0), bx = b[0].x, by = b[0].y;
                for (let s = 0; s < 12; s++) { aa += rnd(-0.4, 0.4); bx += Math.cos(aa) * rnd(14, 30); by += Math.sin(aa) * rnd(14, 30); b.push({ x: bx, y: by }); }
                R.push(b);
            }
        }
        return R;
    }

    function creditsFrame() {
        const C = INV.c, CW = canvas.width, CH = canvas.height, W = playAreaW, H = playAreaH;
        C.t++;
        // 1) la pantalla se oscurece poco a poco
        if (C.t <= 70) {
            ctx.save(); ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(0, 0, CW, CH);
            if (C.t === 70) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH); }
            ctx.restore(); return;
        }
        const BU = Math.max(8, Math.floor(Math.min(260, W * 0.5) / 11)), cy = Math.round(H * 0.40);
        const hit = C.lines.find(l => l.t === 'hit');
        // 2) créditos que suben
        const ti = C.tI < 0 ? -1 : C.t - C.tI;
        const speed = ti < 0 ? 1.5 : Math.max(0, 1.5 * (1 - ti / 40));
        C.scroll += speed;
        if (C.tI < 0 && H + 30 + hit.off - C.scroll <= H * 0.42) C.tI = C.t;

        ctx.save();
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, CW, CH);
        const shake = ti < 60 ? 0 : Math.min(9, (ti - 60) / 12);
        if (shake) ctx.translate(rnd(-shake, shake), rnd(-shake, shake));
        const dim = ti < 50 ? 1 : clamp(1 - (ti - 50) / 50, 0.12, 1);
        ctx.globalAlpha = dim; ctx.textBaseline = 'alphabetic';
        C.lines.forEach(l => {
            const y = H + 30 + l.off - C.scroll;
            if (y < -40 || y > H + 40 || !l.s) return;
            const gl = ti >= 0 && ti < 30 && Math.random() < 0.15 ? rnd(-6, 6) : 0;
            if (l.t === 'big') fitText(l.s, W / 2 + gl, y, 28, '#fff', W - 30);
            else if (l.t === 'role') fitText(l.s, W / 2 + gl, y, 8, '#ff4d6d', W - 24);
            else if (l.t === 'hit') fitText(l.s, W / 2 + gl, y, 10, (ti >= 0 && (C.t >> 2) & 1) ? '#f33' : '#fff', W - 24);
            else if (l.t === 'small') fitText(l.s, W / 2 + gl, y, 9, '#bbb', W - 24);
            else fitText(l.s, W / 2 + gl, y, 10, '#fff', W - 24);
        });
        ctx.globalAlpha = 1;

        // 3) el invasor se cuela
        if (ti >= 30) {
            let u;
            if (ti < 50) u = 2; else if (ti < 60) u = 4; else if (ti < 70) u = 6; else if (ti < 80) u = 9;
            else u = lerp(9, BU, 1 - Math.pow(1 - clamp((ti - 80) / 60, 0, 1), 3));
            if (ti >= 150) u = BU + Math.sin(ti * 0.9) * 0.6;
            if (ti < 80 && (ti === 30 || ti === 50 || ti === 60 || ti === 70)) beep(300 + ti * 6, 0.1, 'square', 0.07);
            if (ti === 80) { beep(90, 0.5, 'sawtooth', 0.08, 400); }
            const visible = !(ti < 48 && ((ti >> 1) & 1));
            if (visible) { if (!lowFx()) { ctx.shadowColor = '#fff'; ctx.shadowBlur = 18; } drawSpr('crab', (C.t >> 4) & 1, W / 2 - 5.5 * u, cy - 4 * u, u, '#fff'); ctx.shadowBlur = 0; }
        }
        // diálogo con efecto de escritura
        const say = (txt, t0, spd) => { const n = Math.floor((ti - t0) / spd); if (n > 0) bubble(txt.slice(0, n), W / 2, cy + 4 * BU + 22, Math.min(W - 16, 340)); };
        if (ti >= 95 && ti < 140) { say('¿CRÉDITOS? ¿YA? ¡ESPERA UN MOMENTO!', 95, 1.1); if (ti % 3 === 0) beep(rnd(400, 600), 0.03, 'square', 0.03); }
        else if (ti >= 140 && ti < 190) say('48 AÑOS ESPERANDO MI TURNO COMO JEFE...', 140, 1.0);
        else if (ti >= 190) say('¡HASTA LUEGO, CUARTA PARED!', 190, 0.9);
        // grietas
        if (ti >= 150) {
            if (!C.cracks) C.cracks = makeCracks(W / 2, cy);
            const p = clamp((ti - 150) / 70, 0, 1);
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.lineJoin = 'round';
            if (!lowFx()) { ctx.shadowColor = '#9cf'; ctx.shadowBlur = 8; }
            let drawn = 0;
            C.cracks.forEach(pts => {
                const n = Math.floor(pts.length * p); if (n < 2) return; drawn += n;
                ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < n; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke();
            });
            ctx.shadowBlur = 0;
            if (drawn > C.cn + 25) { C.cn = drawn; beep(rnd(900, 2200), 0.05, 'sawtooth', 0.04); }
        }
        // 4) glitch de líneas y estática sobre todo
        if (ti >= 0) {
            const g = Math.min(1, ti / 30) * (0.5 + Math.min(1, ti / 200));
            if (Math.random() < 0.6 * g) {
                for (let k = 0; k < 2 + Math.floor(g * 4); k++) {
                    const sy = Math.floor(rnd(0, CH - 30)), sh = Math.floor(rnd(4, 26)), dx = Math.floor(rnd(-40, 40) * g);
                    ctx.drawImage(canvas, 0, sy, CW, sh, dx, sy, CW, sh);
                }
            }
            ctx.fillStyle = '#fff';
            for (let k = 0; k < 14 * g; k++) { ctx.globalAlpha = rnd(0.1, 0.6); ctx.fillRect(rnd(0, CW), rnd(0, CH), rnd(1, 4), rnd(1, 4)); }
            ctx.globalAlpha = 1;
        }
        ctx.restore();

        // 5) ¡ROMPE LA PANTALLA!
        if (ti >= 225) breakWall(BU);
    }

    function makeShards() {
        const CW = canvas.width, CH = canvas.height, cols = 9, rows = 7, cw = CW / cols, rh = CH / rows, S = [];
        const V = []; for (let r = 0; r <= rows; r++) { V.push([]); for (let c = 0; c <= cols; c++) {
            const edge = r === 0 || c === 0 || r === rows || c === cols;
            V[r].push({ x: c * cw + (c > 0 && c < cols ? rnd(-0.3, 0.3) * cw : 0), y: r * rh + (r > 0 && r < rows ? rnd(-0.3, 0.3) * rh : 0) });
        } }
        const mx = CW / 2, my = playAreaH * 0.40;
        const push = pts => {
            const cx = (pts[0].x + pts[1].x + pts[2].x) / 3, cy = (pts[0].y + pts[1].y + pts[2].y) / 3, d = Math.hypot(cx - mx, cy - my);
            S.push({ pts: pts.map(p => ({ x: p.x - cx, y: p.y - cy })), cx, cy, ox: 0, oy: 0, rot: 0, vx: (cx - mx) * 0.012 + rnd(-1, 1), vy: rnd(-3.5, -0.5), vr: rnd(-0.08, 0.08), delay: Math.floor(d * 0.07) + 8 });
        };
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
            const a = V[r][c], b = V[r][c + 1], d = V[r + 1][c], e = V[r + 1][c + 1];
            if (Math.random() < 0.5) { push([a, b, e]); push([a, e, d]); } else { push([a, b, d]); push([b, e, d]); }
        }
        return { t: 0, S };
    }
    function breakWall(BU) {
        const eyeRef = INV.c.eye; INV.c = null;
        const boss = new InvaderBoss();
        activeBoss = boss; levelPhase = 'boss'; enemies = []; enemyBullets = [];
        invulnerableUntil = Date.now() + 4500;       // tiempo para reubicarte
        screenShake = 34; playExplosionSound();
        for (let i = 0; i < 6; i++) beep(rnd(80, 200), 0.3, 'sawtooth', 0.07, 30);
        INV.shards = makeShards(); INV.flash = 16;
    }
    function drawShards() {
        const SH = INV.shards, CW = canvas.width, CH = canvas.height; SH.t++;
        ctx.save();
        let alive = 0;
        SH.S.forEach(s => {
            if (SH.t > s.delay) { s.vy += 0.4; s.ox += s.vx; s.oy += s.vy; s.rot += s.vr; }
            if (s.cy + s.oy > CH + 160) return;
            alive++;
            ctx.save(); ctx.translate(s.cx + s.ox, s.cy + s.oy); ctx.rotate(s.rot);
            ctx.beginPath(); ctx.moveTo(s.pts[0].x, s.pts[0].y); ctx.lineTo(s.pts[1].x, s.pts[1].y); ctx.lineTo(s.pts[2].x, s.pts[2].y); ctx.closePath();
            ctx.fillStyle = '#000'; ctx.fill(); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
        });
        if (INV.flash > 0) { ctx.fillStyle = 'rgba(255,255,255,' + (INV.flash / 16) + ')'; ctx.fillRect(0, 0, CW, CH); INV.flash--; }
        ctx.restore();
        if (!alive || SH.t > 260) INV.shards = null;
    }

    // ==========================================================================================
    //  ENGANCHES (no se toca juego.js)
    // ==========================================================================================
    const _take = Extras.takeover, _busy = Extras.busy, _after = Extras.afterFrame, _win = window.triggerGameWin;
    Extras.takeover = function () {
        if (INV.c) { if (creditsValid()) { creditsFrame(); return true; } INV.c = null; }   // partida cerrada: se cancela
        return _take.apply(Extras, arguments);
    };
    Extras.busy = function () { return !!INV.c || _busy.apply(Extras, arguments); };
    Extras.afterFrame = function () { const r = _after.apply(Extras, arguments); if (INV.shards) drawShards(); return r; };
    window.triggerGameWin = function () {
        // el ojo cae -> créditos falsos -> jefe invasor; cuando cae el invasor se muestra la victoria de siempre
        if (isLunaticFinalLevel() && !(activeBoss instanceof InvaderBoss) && !INV.c) { startCredits(); return; }
        INV.shards = null;
        return _win.apply(this, arguments);
    };
    window.InvaderBoss = InvaderBoss;
})();
