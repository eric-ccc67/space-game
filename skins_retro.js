// ============================================================================
// skins_retro.js — SKINS RETRO 70s/80s PARA LAS 4 NAVES PRINCIPALES (v44)
// ----------------------------------------------------------------------------
//  Cada nave principal tiene UNA skin retro propia: otro dibujo de la nave, otro disparo y otro sonido.
//
//    NAVE 1 · TANQUE  → CAÑON INVASOR 78   (homenaje a Space Invaders)   fósforo verde + disparo en zigzag
//    NAVE 2 · SNIPER  → VECTOR ROCA 79     (homenaje a Asteroids)        nave vectorial + punto / lanza vectorial
//    NAVE 3 · LIGERA  → CAZA ESTELAR 81    (homenaje a Galaga)           caza blanco/rojo/azul + disparo doble
//    NAVE 4 · OMEGA   → COMECOCOS 80       (homenaje a Pac-Man)          disco amarillo + bala que se come las balas
//
//  · Solo cambia el ASPECTO y el SONIDO: daño, cadencia y hitboxes son exactamente los de cada nave.
//  · Se compran en la TIENDA ESTELAR (pestaña RETRO 70s/80s) con gemas y se equipan/quitan por nave.
//  · Se guarda en localStorage (sg_retro_skins_v1). Consola:  RetroSkins.dev.unlockAll()  ·  RetroSkins.dev.reset()
//  · Se carga DESPUÉS de juego.js y skins_fx.js. No se aplica en el modo CLASICO.
// ============================================================================
const RetroSkins = (function () {
    'use strict';
    const KEY = 'sg_retro_skins_v1';
    const TAU = Math.PI * 2;
    const OUTC = '#181425';
    const lite = () => { try { return !!performanceMode; } catch (e) { return false; } };

    // ------------------------------------------------------------------ catálogo
    const SKINS = {
        invader: { id: 'invader', ship: 1, name: 'CAÑON INVASOR 78', game: 'Space Invaders · 1978', price: 400, glow: '#3cff6a',
            desc: 'Cañón de fósforo verde con orugas. Dispara el zigzag de los invasores.' },
        vector:  { id: 'vector',  ship: 2, name: 'VECTOR ROCA 79',   game: 'Asteroids · 1979',     price: 450, glow: '#bfe6ff',
            desc: 'Nave de líneas vectoriales. Punto brillante y, al cargar, lanza vectorial.' },
        galaga:  { id: 'galaga',  ship: 3, name: 'CAZA ESTELAR 81',  game: 'Galaga · 1981',        price: 500, glow: '#7ad0ff',
            desc: 'Caza blanco, rojo y azul. Dispara rayos gemelos de punta roja.' },
        pacman:  { id: 'pacman',  ship: 4, name: 'COMECOCOS 80',     game: 'Pac-Man · 1980',       price: 600, glow: '#ffe040',
            desc: 'Disco amarillo con escape de fantasmas. Su bala es un comecocos.' }
    };
    const BY_SHIP = { 1: 'invader', 2: 'vector', 3: 'galaga', 4: 'pacman' };

    // ------------------------------------------------------------------ estado guardado
    const lsGet = () => { try { const v = localStorage.getItem(KEY); return v ? JSON.parse(v) : null; } catch (e) { return null; } };
    const lsSet = v => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} };
    let st = Object.assign({ owned: [], eq: {} }, lsGet() || {});
    if (!Array.isArray(st.owned)) st.owned = [];
    if (!st.eq || typeof st.eq !== 'object') st.eq = {};
    const save = () => lsSet({ owned: st.owned, eq: st.eq });
    const owned = id => st.owned.indexOf(id) >= 0;

    // skin retro activa para la nave del jugador (o null)
    function curSkin() {
        try {
            if (typeof player === 'undefined' || !player) return null;
            if (typeof currentMode !== 'undefined' && currentMode === 'clasico') return null;
            const id = st.eq[player.type];
            return (id && owned(id) && SKINS[id] && SKINS[id].ship === player.type) ? SKINS[id] : null;
        } catch (e) { return null; }
    }

    // ------------------------------------------------------------------ sprites en pixel-art (filas completas de 15 px)
    const SPR = {};
    function bakeRows(key, rows, pal, scan) {
        if (SPR[key]) return SPR[key];
        const W = rows[0].length, H = rows.length, c = document.createElement('canvas'); c.width = W; c.height = H;
        const x = c.getContext('2d');
        rows.forEach((r, y) => { for (let i = 0; i < W; i++) { const ch = r[i]; if (ch === '.' || !pal[ch]) continue; x.fillStyle = pal[ch]; x.fillRect(i, y, 1, 1); } });
        if (scan) { x.globalCompositeOperation = 'source-atop'; x.fillStyle = scan; for (let y = 1; y < H; y += 2) x.fillRect(0, y, W, 1); }   // líneas de barrido CRT
        return (SPR[key] = c);
    }

    // --- 1 · CAÑON INVASOR (fósforo verde, orugas animadas)
    const INV_PAL = { k: '#0a2a14', G: '#3cff6a', g: '#1fa347', w: '#e6ffea', T: '#7dff9a' };
    const INV_ROWS = [
        '.......k.......',
        '......kwk......',
        '......kGk......',
        '......kGk......',
        '.....kkGkk.....',
        '....kGGGGGk....',
        '..kkGGwGwGGkk..',
        '.kGGGGGGGGGGGk.',
        '.kGGwGGGGGwGGk.',
        '.kGGGGGGGGGGGk.',
        '.kgggggggggggk.',
        'kkkkkkkkkkkkkkk',
        'kTkTkTkTkTkTkTk',
        '.kkkkkkkkkkkkk.'
    ];
    const INV_ROWS_B = INV_ROWS.slice(); INV_ROWS_B[12] = 'TkTkTkTkTkTkTkT'; INV_ROWS_B[1] = '......kGk......';
    const invFrames = () => [bakeRows('inv0', INV_ROWS, INV_PAL, 'rgba(0,24,6,0.28)'), bakeRows('inv1', INV_ROWS_B, INV_PAL, 'rgba(0,24,6,0.28)')];

    // --- 3 · CAZA ESTELAR (blanco, rojo y azul)
    const GAL_PAL = { k: OUTC, w: '#ffffff', g: '#b8c4e0', R: '#ff3a3a', b: '#3a6aff', c: '#9fe0ff' };
    const GAL_ROWS = [
        '.......k.......',
        '......kwk......',
        '......kwk......',
        '..k...kwk...k..',
        '.kbk..kwk..kbk.',
        '.kbk.kkwkk.kbk.',
        '.kwk.kwwwk.kwk.',
        '.kwkkkwRwkkkwk.',
        '.kwwwwwRwwwwwk.',
        'kkwRRwwRwwRRwkk',
        'kwwwRRwwwRRwwwk',
        'kwwgwwkwkwwgwwk',
        '.kkkkkkwkkkkkk.',
        '......kbk......',
        '......kkk......'
    ];
    const GAL_ROWS_B = GAL_ROWS.slice(); GAL_ROWS_B[13] = '......kck......'; GAL_ROWS_B[3] = '..k...kwk...k..'; GAL_ROWS_B[4] = '.kck..kwk..kck.';
    const galFrames = () => [bakeRows('gal0', GAL_ROWS, GAL_PAL), bakeRows('gal1', GAL_ROWS_B, GAL_PAL)];

    // --- 4 · COMECOCOS (disco amarillo con la boca abierta hacia arriba, vainas azules y escape de 4 fantasmas)
    function pacFrame(open, shift) {
        const key = 'pac' + open + shift; if (SPR[key]) return SPR[key];
        const W = 15, H = 15, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
        const px = (i, j, col) => { x.fillStyle = col; x.fillRect(i, j, 1, 1); };
        const cx = 7, cy = 6, R = 6.3;
        for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
            const dx = i - cx, dy = j - cy, d = Math.hypot(dx, dy); if (d > R) continue;
            const ang = Math.abs(Math.atan2(dx, -dy));                 // 0 = hacia arriba
            if (d > 0.9 && ang < open) continue;                       // boca abierta
            const edge = d > R - 1.05 || (d > 0.9 && Math.abs(ang - open) < 0.22);
            px(i, j, edge ? '#8a6a00' : (d < 3.2 && dy < 0 ? '#fff6a0' : '#ffe040'));
        }
        px(9, 3, OUTC); px(10, 3, OUTC); px(9, 4, OUTC); px(10, 4, OUTC); px(9, 3, '#ffffff');   // ojo
        // vainas azules (paredes del laberinto)
        for (let j = 7; j <= 12; j++) { px(0, j, '#2a3cff'); px(1, j, '#7ab0ff'); px(13, j, '#7ab0ff'); px(14, j, '#2a3cff'); }
        px(0, 6, '#2a3cff'); px(14, 6, '#2a3cff'); px(1, 6, '#2a3cff'); px(13, 6, '#2a3cff');
        // escape: los 4 fantasmas (rojo, rosa, cian, naranja); el cuadro b los desplaza un píxel
        const gh = ['#ff2a2a', '#ffb8de', '#00ffff', '#ffb852'];
        gh.forEach((col, k) => { const gx = 4 + k * 2; px(gx, 13 + shift, col); px(gx, 14 + shift, col); if (shift === 0) px(gx, 14, '#ffffff'); });
        return (SPR[key] = c);
    }
    const pacFrames = () => [pacFrame(0.5, 0), pacFrame(0.12, 1)];

    // ------------------------------------------------------------------ dibujo de las naves (c = contexto; sirve también para la vista previa de la tienda)
    function drawPixShip(c, frames, cx, cy, tt, glow, flame) {
        const f = frames[(Math.floor(tt / 8) & 1)], ps = 3, w = f.width * ps, h = f.height * ps;
        const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
        c.save(); c.imageSmoothingEnabled = false;
        if (flame) flame(c, cx, y, w, h, tt);
        if (glow && !lite()) { c.shadowColor = glow; c.shadowBlur = 9; }
        c.drawImage(f, x, y, w, h);
        c.restore();
    }
    function galFlame(c, cx, y, w, h, tt) {      // llama azul-blanca en bloques
        const fl = (Math.floor(tt / 3) & 1), len = 2 + fl + 1, fx = Math.round(cx / 3) * 3;
        for (let i = 0; i < len; i++) {
            c.fillStyle = OUTC; c.fillRect(fx - 4, y + h - 3 + i * 3, 8, 3);
            c.fillStyle = i === 0 ? '#ffffff' : (i < len - 1 ? '#7ad0ff' : '#3a6aff'); c.fillRect(fx - 3 + (i > 1 ? 1 : 0), y + h - 3 + i * 3, 6 - (i > 1 ? 2 : 0), 3);
        }
    }
    const SHIPS = {
        invader(c, cx, cy, tt) { drawPixShip(c, invFrames(), cx, cy, tt, SKINS.invader.glow, null); },
        galaga(c, cx, cy, tt)  { drawPixShip(c, galFrames(), cx, cy, tt, SKINS.galaga.glow, galFlame); },
        pacman(c, cx, cy, tt)  { drawPixShip(c, pacFrames(), cx, cy, tt, SKINS.pacman.glow, null); },
        vector(c, cx, cy, tt) {                   // Asteroids: nave de líneas
            c.save(); c.translate(cx, cy); c.lineJoin = 'round'; c.lineCap = 'round';
            if (!lite()) { c.shadowColor = '#bfe6ff'; c.shadowBlur = 10; }
            c.beginPath(); c.moveTo(0, -22); c.lineTo(12, 16); c.lineTo(6, 10); c.lineTo(-6, 10); c.lineTo(-12, 16); c.closePath();
            c.fillStyle = 'rgba(6,10,22,0.8)'; c.fill();
            c.strokeStyle = '#ffffff'; c.lineWidth = 2.4; c.stroke();
            const len = 7 + ((tt % 6) < 3 ? 7 : 2);                                  // llama que parpadea
            c.lineWidth = 1.8; c.beginPath(); c.moveTo(-4.5, 11); c.lineTo(0, 11 + len); c.lineTo(4.5, 11); c.stroke();
            c.restore();
        }
    };

    // ------------------------------------------------------------------ dibujo de los disparos (centro cx,cy · h = alto de la bala · big = carga perforante)
    const ZZ = [['.#.', '#..', '.#.', '..#', '.#.', '#..', '.#.', '..#'], ['.#.', '..#', '.#.', '#..', '.#.', '..#', '.#.', '#..']];
    function zzSprite(f) {
        const key = 'zz' + f; if (SPR[key]) return SPR[key];
        const c = document.createElement('canvas'); c.width = 3; c.height = 8; const x = c.getContext('2d');
        ZZ[f].forEach((r, j) => { for (let i = 0; i < 3; i++) if (r[i] === '#') { x.fillStyle = '#eaffea'; x.fillRect(i, j, 1, 1); } });
        return (SPR[key] = c);
    }
    const BULLETS = {
        invader(c, cx, cy, h, big, t) {             // zigzag de fósforo
            const f = Math.floor(t / 70) & 1, s = zzSprite(f), ps = 2, w = 3 * ps, hh = 8 * ps;
            c.save(); c.imageSmoothingEnabled = false;
            if (!lite()) { c.shadowColor = '#3cff6a'; c.shadowBlur = 8; }
            c.fillStyle = 'rgba(60,255,106,0.45)'; c.fillRect(Math.round(cx) - 1, Math.round(cy + hh / 2), 2, 4); c.fillStyle = 'rgba(60,255,106,0.22)'; c.fillRect(Math.round(cx) - 1, Math.round(cy + hh / 2) + 4, 2, 4);   // estela
            c.drawImage(s, Math.round(cx - w / 2), Math.round(cy - hh / 2), w, hh);
            c.restore();
        },
        vector(c, cx, cy, h, big, t) {              // punto vectorial / lanza vectorial
            c.save(); c.lineCap = 'round'; c.lineJoin = 'round';
            if (!lite()) { c.shadowColor = '#bfe6ff'; c.shadowBlur = big ? 12 : 9; }
            c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff';
            if (!big) {
                c.beginPath(); c.arc(cx, cy - 1, 3.5, 0, TAU); c.fill();
                c.globalAlpha = 0.55; c.lineWidth = 1.6; c.beginPath(); c.moveTo(cx, cy + 3); c.lineTo(cx, cy + 12); c.stroke();
            } else {
                const top = cy - h / 2 - 5, bot = cy + h / 2;
                c.lineWidth = 2.2; c.beginPath(); c.moveTo(cx, top); c.lineTo(cx, bot); c.stroke();
                c.beginPath(); c.moveTo(cx - 6, top + 10); c.lineTo(cx, top); c.lineTo(cx + 6, top + 10); c.stroke();
                c.lineWidth = 1.5; const off = (t / 40) % 10;
                for (let y = top + 14 + off; y < bot - 2; y += 10) { c.beginPath(); c.moveTo(cx - 4, y); c.lineTo(cx + 4, y); c.stroke(); }
            }
            c.restore();
        },
        galaga(c, cx, cy, h, big, t) {              // rayos gemelos: punta roja, cuerpo blanco, cola azul
            const y = Math.round(cy - h / 2), hh = Math.round(h);
            c.save();
            if (!lite()) { c.shadowColor = '#7ad0ff'; c.shadowBlur = 6; }
            [-4, 4].forEach(s => {
                const bx = Math.round(cx + s);
                c.fillStyle = OUTC; c.fillRect(bx - 2, y - 1, 4, hh + 2);
                c.fillStyle = '#ffffff'; c.fillRect(bx - 1, y, 2, hh);
                c.fillStyle = '#ff3a3a'; c.fillRect(bx - 1, y, 2, 4);
                c.fillStyle = '#4a6aff'; c.fillRect(bx - 1, y + hh - 4, 2, 4);
            });
            c.restore();
        },
        pacman(c, cx, cy, h, big, t) {              // comecocos que mastica + rastro de bolitas
            const u = 2, R = 5, X = Math.round(cx / u) * u, Y = Math.round(cy / u) * u;
            const open = 0.1 + 0.5 * (0.5 + 0.5 * Math.sin(t / 85));
            c.save();
            [[19, 4, 0.9], [33, 3, 0.55], [47, 2, 0.3]].forEach(p => { c.globalAlpha = p[2]; c.fillStyle = '#ffffff'; c.fillRect(X - p[1] / 2, Y + p[0], p[1], p[1]); });
            c.globalAlpha = 1;
            if (!lite()) { c.shadowColor = '#ffe040'; c.shadowBlur = 10; }
            for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) {
                const d = Math.hypot(i, j); if (d > R + 0.45) continue;
                const ang = Math.abs(Math.atan2(i, -j));
                if (d > 0.8 && ang < open) continue;
                c.fillStyle = (d > R - 0.55 || (d > 0.8 && Math.abs(ang - open) < 0.25)) ? '#b88a00' : '#ffe040';
                c.fillRect(X + i * u, Y + j * u, u, u);
            }
            c.shadowBlur = 0; c.fillStyle = OUTC; c.fillRect(X + 2 * u, Y - 2 * u, u, u * 2);                                       // ojo
            c.restore();
        }
    };

    // ------------------------------------------------------------------ sonidos propios (WebAudio, mismo volumen que el disparo normal)
    function tone(type, f0, f1, dur, vol, delay) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const t0 = audioCtx.currentTime + (delay || 0), o = audioCtx.createOscillator(), g = audioCtx.createGain();
        o.type = type; o.connect(g); g.connect(audioCtx.destination);
        o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        o.start(t0); o.stop(t0 + dur + 0.01);
    }
    let noiseBuf = null;
    function noise(dur, vol, hz) {
        if (!noiseBuf) { noiseBuf = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.3, audioCtx.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
        const s = audioCtx.createBufferSource(), f = audioCtx.createBiquadFilter(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
        s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hz || 1200; s.connect(f); f.connect(g); g.connect(audioCtx.destination);
        g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur); s.start(t0); s.stop(t0 + dur + 0.01);
    }
    let wakaFlip = false, chargedNow = false;
    const SOUNDS = {
        invader() { tone('square', 1150, 140, 0.1, 0.045); tone('square', 640, 90, 0.07, 0.03, 0.015); },
        vector()  { if (chargedNow) { tone('sawtooth', 700, 60, 0.3, 0.06); noise(0.22, 0.05, 500); } else { tone('sawtooth', 1900, 240, 0.1, 0.035); noise(0.09, 0.05, 1500); } },
        galaga()  { tone('square', 1500, 620, 0.09, 0.04); tone('triangle', 2100, 820, 0.09, 0.03, 0.025); },
        pacman()  { wakaFlip = !wakaFlip; if (wakaFlip) tone('triangle', 250, 560, 0.11, 0.08); else tone('triangle', 560, 250, 0.11, 0.08); }
    };

    // ------------------------------------------------------------------ enganches con el juego
    function hook() {
        // 1) la nave
        const pd = Player.prototype.draw;
        Player.prototype.draw = function () {
            const sk = curSkin();
            if (!sk) return pd.apply(this, arguments);
            try {
                if (typeof Cine !== 'undefined' && Cine.hidesPlayer && Cine.hidesPlayer()) return;
                if (Date.now() < invulnerableUntil && Math.floor(Date.now() / 150) % 2 === 0) return;
                const cx = this.x + this.width / 2, cy = this.y + this.height / 2;
                SHIPS[sk.id](ctx, cx, cy, this.animT | 0);
                const hx = Math.round(cx), hy = Math.round(cy);                       // punto de hitbox (igual que el de las demás naves)
                ctx.fillStyle = '#0f0'; ctx.fillRect(hx - 2, hy - 2, 4, 4);
                ctx.fillStyle = '#fff'; ctx.fillRect(hx - 1, hy - 1, 2, 2);
            } catch (e) { return pd.apply(this, arguments); }
        };
        // 2) las balas de tu nave
        const bd = Bullet.prototype.draw;
        Bullet.prototype.draw = function () {
            if (this.rsk && !this.isEnemy && BULLETS[this.rsk] && !(typeof currentMode !== 'undefined' && currentMode === 'clasico')) {
                try { return BULLETS[this.rsk](ctx, this.x + this.width / 2, this.y + this.height / 2, this.height, !!this.pierce, Date.now()); } catch (e) {}
            }
            return bd.apply(this, arguments);
        };
        // 3) marcar las balas nuevas con la skin (shoot y la liberación de carga del Sniper)
        const tagFrom = n0 => {
            const sk = curSkin(); if (!sk) return;
            for (let i = n0; i < bullets.length; i++) { const b = bullets[i]; if (b && !b.isEnemy && b.source === 'player' && !b.rsk) b.rsk = sk.id; }
        };
        ['shoot', 'stopShoot'].forEach(name => {
            const f = window[name]; if (typeof f !== 'function') return;
            window[name] = function () {
                const n0 = bullets.length, r = f.apply(this, arguments);
                try { tagFrom(n0); } catch (e) {}
                return r;
            };
        });
        const ss = window.stopShoot;                                   // el sonido de la carga del Sniper es distinto
        if (typeof ss === 'function') window.stopShoot = function () { chargedNow = true; try { return ss.apply(this, arguments); } finally { chargedNow = false; } };
        // 4) el sonido del disparo
        const ps = window.playShootSound;
        if (typeof ps === 'function') window.playShootSound = function () {
            const sk = curSkin();
            if (sk && SOUNDS[sk.id]) { try { return SOUNDS[sk.id](); } catch (e) {} }
            return ps.apply(this, arguments);
        };
    }

    // ------------------------------------------------------------------ pestaña RETRO de la tienda (la llama Shop.renderShop)
    let pvTimer = 0;
    function preview(cv, id, tick) {
        const c = cv.getContext('2d'), W = cv.width, H = cv.height;
        c.fillStyle = '#02060c'; c.fillRect(0, 0, W, H);
        c.fillStyle = 'rgba(255,255,255,0.05)'; for (let y = 0; y < H; y += 4) c.fillRect(0, y, W, 1);
        const sx = W * 0.3, sy = H * 0.55;
        SHIPS[id](c, sx, sy, tick);
        const t = Date.now(), big = id === 'vector';
        for (let k = 0; k < 2; k++) {
            const yy = H - ((t / 7 + k * 54) % (H + 30));
            BULLETS[id](c, W * 0.7, yy, id === 'galaga' ? 17 : 17, false, t);
        }
        if (id === 'vector') { const yy = H - ((t / 5 + 20) % (H + 60)); BULLETS.vector(c, W * 0.86, yy, 35, true, t); }
    }
    function startPreview(grid) {
        if (pvTimer) { cancelAnimationFrame(pvTimer); pvTimer = 0; }
        let n = 0;
        const loop = () => {
            const cvs = grid.querySelectorAll('canvas[data-pv]');
            if (!cvs.length || !grid.isConnected) { pvTimer = 0; return; }
            n++; cvs.forEach(cv => { try { preview(cv, cv.getAttribute('data-pv'), n); } catch (e) {} });
            pvTimer = requestAnimationFrame(loop);
        };
        pvTimer = requestAnimationFrame(loop);
    }
    const SHIP_NAME = { 1: 'NAVE 1 · TANQUE', 2: 'NAVE 2 · SNIPER', 3: 'NAVE 3 · LIGERA', 4: 'NAVE 4 · OMEGA' };
    function renderShop(grid, sh) {
        let h = '';
        Object.keys(SKINS).map(k => SKINS[k]).forEach(s => {
            const own = owned(s.id), eq = st.eq[s.ship] === s.id, poor = !own && sh.gems < s.price;
            h += `<div class="shop-card ${own ? 'owned' : ''} ${eq ? 'equipped' : ''}">
                <div class="shop-ico" style="height:84px;padding:0;overflow:hidden"><canvas data-pv="${s.id}" width="150" height="84" style="width:100%;height:84px;image-rendering:pixelated"></canvas></div>
                <h4>${s.name}</h4><h4 style="color:#ffd84a;font-size:7px;letter-spacing:1px">${SHIP_NAME[s.ship]}</h4><h4 style="color:#7cfcfc;font-size:7px;letter-spacing:1px">HOMENAJE A ${s.game.toUpperCase()}</h4><p>${s.desc}</p>
                <button class="shop-buy ${eq ? 'eq' : ''} ${poor ? 'poor' : ''}" data-retro="${s.id}">${eq ? '✔ EQUIPADA · QUITAR' : own ? 'EQUIPAR' : `COMPRAR <i class="gem-ico"></i>${sh.fmt(s.price)}`}</button></div>`;
        });
        grid.innerHTML = h;
        grid.querySelectorAll('[data-retro]').forEach(b => b.addEventListener('click', () => {
            const id = b.getAttribute('data-retro'), s = SKINS[id];
            if (owned(id)) { if (st.eq[s.ship] === id) delete st.eq[s.ship]; else st.eq[s.ship] = id; save(); sh.sfx('buy'); sh.redraw(); return; }
            if (sh.spend(s.price)) { st.owned.push(id); st.eq[s.ship] = id; save(); sh.sfx('buy'); sh.redraw(); } else sh.deny(b);
        }));
        startPreview(grid);
    }

    hook();
    return {
        skins: SKINS, renderShop, curSkin,
        reset() { st = { owned: [], eq: {} }; save(); },
        dev: {
            unlockAll() { st.owned = Object.keys(SKINS); Object.keys(SKINS).forEach(k => { st.eq[SKINS[k].ship] = k; }); save(); },
            equip(id) { if (SKINS[id]) { if (!owned(id)) st.owned.push(id); st.eq[SKINS[id].ship] = id; save(); } },
            reset() { st = { owned: [], eq: {} }; save(); },
            state() { return st; }
        }
    };
})();
window.RetroSkins = RetroSkins;
