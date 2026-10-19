// ==========================================================================================
//  eventos_jefes.js  ·  MINI EVENTOS ÚNICOS PARA CADA MINI JEFE, JEFE Y EL JEFE SECRETO
// ------------------------------------------------------------------------------------------
//  Cargar DESPUÉS de juego.js y de invasor.js:
//      <script src="juego.js"></script>
//      <script src="invasor.js"></script>
//      <script src="eventos_jefes.js"></script>
//
//  Cada jefe, de vez en cuando (aviso con nombre en pantalla → evento → descanso), lanza un
//  MINI EVENTO que cambia las reglas un rato, además de sus patrones de balas de siempre:
//  viento, hielo resbaloso, corrientes, oscuridad, tinta, burbujas de tiempo, remolinos,
//  capullos que hay que reventar, controles invertidos, tiempo detenido, péndulos, rayos
//  que te apuntan, bonus stage... Unos son peligros y otros son premios, para que cada pelea
//  se sienta distinta y nunca sea "los mismos ataques".
//
//  No modifica juego.js: engancha Boss.update, MiniBoss.update, Player.update,
//  drawBossBgPlanet (capa de abajo) y drawHud (capa de arriba, antes del HUD).
//  Ajustes rápidos: BossEvents.cfg  (ver abajo).
// ==========================================================================================
(function () {
    'use strict';
    if (typeof Boss === 'undefined' || typeof MiniBoss === 'undefined' || typeof Player === 'undefined' ||
        typeof Bullet === 'undefined' || typeof pushEnemyBullet === 'undefined') return;

    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const lerp = (a, b, t) => a + (b - a) * t;
    const R = (a, b) => a + Math.random() * (b - a);
    const FONT = s => s + 'px "Press Start 2P", monospace';
    const lowFx = () => (typeof performanceMode !== 'undefined' && performanceMode);
    const KD = { facil: 0.8, medio: 1, dificil: 1.15, lunatico: 1.3 };
    const K = () => (KD[currentDiff] || 1) * ((window.AIAdapt && AIAdapt.evK) ? AIAdapt.evK() : 1);                       // intensidad según dificultad
    const pcx = () => player.x + player.width / 2;
    const pcy = () => player.y + player.height / 2;

    // ---- Ajustes (puedes cambiarlos desde la consola: BossEvents.cfg.enabled = false, etc.)
    const cfg = {
        enabled: true,
        bossFirst: 420,  bossGap: [600, 780],      // frames (60 = 1 s): primer evento y descanso entre eventos del jefe
        miniFirst: 300,  miniGap: [480, 600],      // ídem para mini jefes
        invFirst: 360,   invGap: [540, 700]        // ídem para el jefe secreto
    };

    // ---------------------------------------------------------------------------------- utilidades
    function beep(f, d, type, v, slide) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const t0 = audioCtx.currentTime, o = audioCtx.createOscillator(), g = audioCtx.createGain();
            o.type = type || 'square'; o.frequency.setValueAtTime(f, t0);
            if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t0 + d);
            g.gain.setValueAtTime(v || 0.05, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
            o.connect(g); g.connect(audioCtx.destination); o.start(t0); o.stop(t0 + d + 0.02);
        } catch (e) {}
    }
    // mismo golpe que cualquier daño del juego (respeta escudo, invulnerabilidad y dificultad)
    function hurt() {
        if (!isPlaying || Date.now() <= invulnerableUntil) return false;
        if (powerUps.shield > Date.now()) { createExplosion(pcx(), player.y, '#0ff', 8, true); invulnerableUntil = Date.now() + 500; return false; }
        createExplosion(pcx(), pcy(), player.color, 30);
        lives -= shipHitDamage();
        invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerPoints = Math.max(0, powerPoints - 50);
        screenShake = Math.max(screenShake, 10);
        if (lives <= 0) gameOver();
        return true;
    }
    function bl(x, y, vx, vy, col, shape, w) {                  // bala enemiga (x,y = centro)
        const b = new Bullet(x, y, true, false, vx, vy, 'player', shape || 'orb');
        if (col) b.color = col;
        if (w) { b.width = w; b.height = w; }
        b._be = true;
        return b;
    }
    function fire(b) { const p = bossFiring; bossFiring = true; pushEnemyBullet(b); bossFiring = p; }
    function ring(x, y, n, a0, sp, col, shape) { for (let i = 0; i < n; i++) { const a = a0 + TAU / n * i; fire(bl(x, y, C(a) * sp, S(a) * sp, col, shape)); } }
    // daño de los disparos del jugador contra un objetivo propio del evento
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
    function clearBulletsNear(x, y, r) {                        // cancela balas enemigas (se ven los puntos de "graze")
        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const b = enemyBullets[i];
            if (Math.hypot(b.x - x, b.y - y) < r) { createExplosion(b.x, b.y, b.color || '#fff', 3, true); enemyBullets.splice(i, 1); }
        }
    }
    function drop(x, y) { try { items.push(new Item(x - 10, y - 10)); } catch (e) {} }
    function distSeg(px, py, ax, ay, bx, by) {                  // distancia de un punto a un segmento
        const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
        const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
        return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
    }
    function glow(x, y, r, col, a) {
        if (lowFx()) return;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a == null ? 0.6 : a;
        ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
    }
    function say(o, text, len) { try { if (o && typeof o.say === 'function') o.say(text, len); } catch (e) {} }

    // ---------------------------------------------------------------------------------- motor de eventos
    const BE = { list: [], defs: {}, cfg };
    window.BossEvents = BE;

    function ownerAlive(o) {
        return !!o && o.state !== 'dead' && o.hp > 0 && (o === activeBoss || o === activeMiniBoss);
    }
    function guard(ev, fn) {
        if (!fn) return;
        try { fn(ev); } catch (e) { console.warn('[BossEvents] ' + ev.id + ' falló y se cancela:', e); ev.dead = true; }
    }
    function startEvent(owner, id) {
        const def = BE.defs[id]; if (!def) return null;
        const ev = { def, id, owner, t: 0, state: def.warn === 0 ? 'on' : 'warn', d: {} };
        BE.list.push(ev);
        if (ev.state === 'on') guard(ev, def.start);
        else { beep(440, 0.12, 'square', 0.05, 880); setTimeout(() => beep(660, 0.14, 'square', 0.05, 1320), 140); }
        return ev;
    }
    function finishEvent(ev, i) {
        guard(ev, ev.def.end);
        BE.list.splice(i, 1);
        const o = ev.owner;
        if (o && o._be) {
            const g = o._be.gap;
            o._be.running = false;
            o._be.cd = Math.round(R(g[0], g[1]) * (o.defenseMode ? 0.8 : 1) / Math.min(1.25, K()));
        }
    }
    function tickAll() {
        if (!BE.list.length) return;
        const ok = isPlaying && currentMode !== 'clasico' && cfg.enabled;
        for (let i = BE.list.length - 1; i >= 0; i--) {
            const ev = BE.list[i];
            if (!ok || ev.dead || !ownerAlive(ev.owner)) { finishEvent(ev, i); continue; }
            ev.t++;
            if (ev.state === 'warn') {
                if (ev.t >= (ev.def.warn || 70)) { ev.state = 'on'; ev.t = 0; guard(ev, ev.def.start); }
            } else {
                guard(ev, ev.def.tick);
                if (ev.t >= ev.def.dur) finishEvent(ev, i);
            }
        }
    }

    // ---- reparto de eventos por criatura
    const POOL = {
        m0: ['tengu_wind'], m1: ['ice_floor'], m2: ['currents'], m3: ['night'], m4: ['ink'], m5: ['time_bubble'], m6: ['judgment'],
        b0: ['wisps', 'foxrun'], b1: ['snowball', 'frost'], b2: ['vortex', 'tentacles'], b3: ['cocoons', 'pounce'],
        b4: ['curse', 'runes'], b5: ['time_stop', 'pendulum'], b6: ['blood_tears', 'gaze'],
        inv: ['bonus', 'fake_go']
    };
    function keyOf(o) {
        if (window.InvaderBoss && o instanceof window.InvaderBoss) return 'inv';
        return (o instanceof MiniBoss ? 'm' : 'b') + (o.levelIdx | 0);
    }
    function ready(o) {
        if (o.state !== 'active') return false;
        if (window.InvaderBoss && o instanceof window.InvaderBoss) return o.mode === 'fight' && !(o.trans > 0);
        return true;
    }
    function schedule(o) {
        if (!cfg.enabled || currentMode === 'clasico' || !isPlaying) return;
        const kind = (window.InvaderBoss && o instanceof window.InvaderBoss) ? 'inv' : (o instanceof MiniBoss ? 'mini' : 'boss');
        if (!o._be) {
            o._be = {
                cd: kind === 'mini' ? cfg.miniFirst : (kind === 'inv' ? cfg.invFirst : cfg.bossFirst),
                gap: kind === 'mini' ? cfg.miniGap : (kind === 'inv' ? cfg.invGap : cfg.bossGap),
                last: '', running: false
            };
        }
        const s = o._be;
        if (s.running || !ready(o)) return;
        if (powerUps.paralyze > Date.now()) return;               // jefe paralizado: sin eventos
        if (--s.cd > 0) return;
        const pool = POOL[keyOf(o)]; if (!pool) return;
        const cand = pool.filter(x => x !== s.last);
        const id = (cand.length ? cand : pool)[Math.floor(Math.random() * (cand.length || pool.length))];
        s.last = id; s.running = true;
        startEvent(o, id);
    }
    function postOwner(o) {                                      // el evento puede mover al jefe después de su propio update
        for (const ev of BE.list) if (ev.owner === o && ev.state === 'on' && ev.def.post) guard(ev, ev.def.post);
    }

    // ---- dibujo: capa de abajo (antes de la nave) y de arriba (antes del HUD)
    function underAll() {
        for (const ev of BE.list) {
            if (ev.state === 'on' && ev.def.under) { ctx.save(); guard(ev, ev.def.under); ctx.restore(); }
            else if (ev.state === 'warn' && ev.def.warnUnder) { ctx.save(); guard(ev, ev.def.warnUnder); ctx.restore(); }
        }
    }
    function banner(ev) {                                        // cartel con el nombre del evento
        const def = ev.def; if (def.warn === 0 || def.silent) return;
        const warn = def.warn || 70;
        let a;
        if (ev.state === 'warn') a = Math.min(1, ev.t / 10);
        else if (ev.t < 40) a = 1 - ev.t / 40;
        else return;
        if (a <= 0) return;
        const W = playAreaW, y = Math.round(playAreaH * 0.27), slide = (1 - Math.min(1, ev.t / 12)) * 26;
        ctx.save(); ctx.globalAlpha = a; ctx.textAlign = 'center';
        ctx.font = FONT(14);
        const w = Math.min(W - 16, Math.max(ctx.measureText(def.name).width, 300) + 40);
        const x0 = W / 2 - w / 2, yy = y - slide * (ev.state === 'warn' ? 1 : 0);
        ctx.fillStyle = 'rgba(8,0,14,0.78)'; ctx.fillRect(x0, yy, w, 62);
        ctx.strokeStyle = def.color; ctx.lineWidth = 3; ctx.strokeRect(x0, yy, w, 62);
        ctx.fillStyle = def.color; ctx.font = FONT(8); ctx.fillText('★ EVENTO ★', W / 2, yy + 16);
        ctx.fillStyle = '#fff'; ctx.font = FONT(14); ctx.fillText(def.name, W / 2, yy + 38, w - 16);
        ctx.fillStyle = '#ffe9a6'; ctx.font = FONT(8); ctx.fillText(def.hint, W / 2, yy + 54, w - 16);
        if (ev.state === 'warn') {                                // barra de cuenta atrás del aviso
            ctx.fillStyle = def.color; ctx.fillRect(x0, yy + 60, w * (1 - ev.t / warn), 2);
        }
        ctx.restore();
    }
    function overAll() {
        if (!BE.list.length) return;
        for (const ev of BE.list) {
            if (ev.state === 'on' && ev.def.over) { ctx.save(); guard(ev, ev.def.over); ctx.restore(); }
            banner(ev);
            if (ev.state === 'on' && ev.def.tag) {                // recordatorio pequeño mientras dura
                ctx.save(); ctx.textAlign = 'center'; ctx.font = FONT(8);
                const txt = typeof ev.def.tag === 'function' ? ev.def.tag(ev) : ev.def.tag;
                if (txt) { ctx.globalAlpha = 0.65 + 0.35 * S(ev.t * 0.2); ctx.fillStyle = ev.def.color; ctx.fillText(txt, playAreaW / 2, playAreaH - 12); }
                ctx.restore();
            }
        }
    }

    // ---- ENGANCHES (no se toca juego.js)
    const _pUpd = Player.prototype.update;
    Player.prototype.update = function () {
        const x0 = this.x, y0 = this.y;
        _pUpd.call(this);
        if (!BE.list.length || gameStartTimer > 0) return;
        const m = { dx: this.x - x0, dy: this.y - y0, ax: 0, ay: 0, x0, y0 };
        let any = false;
        for (const ev of BE.list) if (ev.state === 'on' && ev.def.mod) { any = true; guard(ev, e => ev.def.mod(e, m, this)); }
        if (!any) return;
        this.x = clamp(x0 + m.dx + m.ax, 0, playAreaW - this.width);
        if (currentMode !== 'clasico') this.y = clamp(y0 + m.dy + m.ay, 0, playAreaH - this.height);
        m.hitX = this.x <= 0 || this.x >= playAreaW - this.width; m.hitY = this.y <= 0 || this.y >= playAreaH - this.height;
        for (const ev of BE.list) if (ev.state === 'on' && ev.def.modPost) guard(ev, e => ev.def.modPost(e, m, this));
    };
    const _bU = Boss.prototype.update;
    Boss.prototype.update = function () { _bU.call(this); try { schedule(this); postOwner(this); } catch (e) { console.warn('[BossEvents]', e); } };
    const _mU = MiniBoss.prototype.update;
    MiniBoss.prototype.update = function () { _mU.call(this); try { schedule(this); postOwner(this); } catch (e) { console.warn('[BossEvents]', e); } };
    let invHooked = false;
    function hookInvader() {
        if (invHooked || !window.InvaderBoss) return;
        invHooked = true;
        const _iU = window.InvaderBoss.prototype.update;
        window.InvaderBoss.prototype.update = function () { _iU.call(this); try { schedule(this); postOwner(this); } catch (e) { console.warn('[BossEvents]', e); } };
    }
    hookInvader();
    const _bgp = drawBossBgPlanet;
    drawBossBgPlanet = function () {
        _bgp.apply(this, arguments);
        try { hookInvader(); tickAll(); underAll(); } catch (e) { console.warn('[BossEvents]', e); }
    };
    const _hud = window.drawHud;
    window.drawHud = function () {
        try { overAll(); } catch (e) { console.warn('[BossEvents]', e); }
        return _hud.apply(this, arguments);
    };

    // ---- plantilla para definir eventos
    function def(id, o) { o.id = id; BE.defs[id] = o; }
    // cancela de golpe todos los eventos en curso (lo usa choque.js al empezar el choque de poderes)
    BE.cancelAll = () => { for (let i = BE.list.length - 1; i >= 0; i--) finishEvent(BE.list[i], i); };
    BE.start = (id) => { const o = activeMiniBoss || activeBoss; if (o && BE.defs[id]) { if (!o._be) schedule(o); if (o._be) o._be.running = true; return startEvent(o, id); } };   // BossEvents.start('frost') para probar

    // ---- balas de un jefe, para eventos que las afectan (excluye las del jefe secreto: tienen su propia lógica)
    const eachBullet = fn => { for (let i = 0; i < enemyBullets.length; i++) { const b = enemyBullets[i]; if (!b.inv) fn(b, i); } };

    // ==========================================================================================
    //  MINI JEFES  (un evento propio cada uno)
    // ==========================================================================================

    // ---- 0 · Tengu del Viento: el vendaval cambia de lado y arrastra tus balas... y a ti
    def('tengu_wind', {
        name: 'VIENTO TENGU', hint: '¡Un vendaval te empuja de lado!', color: '#ffb0d0', warn: 70, dur: 500,
        tag: ev => ev.d.dir > 0 ? 'VIENTO  ►►►' : '◄◄◄  VIENTO',
        start(ev) {
            const d = ev.d; d.dir = Math.random() < 0.5 ? -1 : 1; d.flip = 0; d.leaves = [];
            for (let i = 0; i < (lowFx() ? 22 : 46); i++) d.leaves.push({ x: R(0, playAreaW), y: R(0, playAreaH), s: R(0.6, 1.6), r: R(0, TAU) });
        },
        tick(ev) {
            const d = ev.d;
            if (++d.flip >= 130) { d.flip = 0; d.dir *= -1; beep(320, 0.25, 'sawtooth', 0.04, 160); }
            const f = 0.009 * K() * d.dir;
            eachBullet(b => { b.vx = clamp(b.vx + f, -6.5, 6.5); });           // el viento también curva las balas
        },
        mod(ev, m) {
            const d = ev.d, strength = 0.3 + 0.7 * S(Math.PI * d.flip / 130), ramp = Math.min(1, ev.t / 25);
            m.ax += d.dir * 1.5 * K() * strength * ramp;
        },
        over(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            ctx.strokeStyle = 'rgba(255,225,240,0.55)'; ctx.lineWidth = 2; ctx.fillStyle = '#ffb0d0';
            d.leaves.forEach(l => {
                l.x += d.dir * (4 + l.s * 5); l.y += S(ev.t * 0.05 + l.r) * 0.6; l.r += 0.08;
                if (l.x < -20) l.x = W + 20; if (l.x > W + 20) l.x = -20;
                ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(l.x - d.dir * 26 * l.s, l.y - S(l.r) * 2); ctx.stroke();
                ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.globalAlpha = 0.85;
                ctx.beginPath(); ctx.ellipse(0, 0, 5 * l.s, 2.6 * l.s, 0, 0, TAU); ctx.fill(); ctx.restore();
            });
            ctx.fillStyle = 'rgba(255,200,225,0.5)';                            // flechas en los bordes
            const ax = d.dir > 0 ? W - 22 : 22;
            for (let k = 0; k < 3; k++) { const y = H * (0.3 + k * 0.2) + S(ev.t * 0.1 + k) * 6; ctx.beginPath(); ctx.moveTo(ax - d.dir * 10, y - 10); ctx.lineTo(ax + d.dir * 10, y); ctx.lineTo(ax - d.dir * 10, y + 10); ctx.closePath(); ctx.fill(); }
        }
    });

    // ---- 1 · Golem de Cristal: el suelo se vuelve hielo y la nave patina
    def('ice_floor', {
        name: 'SUELO DE HIELO', hint: '¡Patinas! Frena con anticipación', color: '#bff6ff', warn: 70, dur: 500, tag: '¡HIELO RESBALOSO!',
        start(ev) { const d = ev.d; d.vx = 0; d.vy = 0; d.sp = []; d.gl = []; for (let i = 0; i < 28; i++) d.gl.push({ x: R(0, playAreaW), y: R(playAreaH * 0.3, playAreaH), p: R(0, TAU) }); },
        mod(ev, m) {
            const d = ev.d, k = 0.07;
            d.vx = d.vx * (1 - k) + m.dx * k; d.vy = d.vy * (1 - k) + m.dy * k;
            m.dx = d.vx * 1.2; m.dy = d.vy * 1.2;
            if (Math.hypot(d.vx, d.vy) > 1.5 && Math.random() < 0.6 && d.sp.length < 60) d.sp.push({ x: pcx() + R(-7, 7), y: pcy() + 12, vx: R(-0.8, 0.8), vy: R(0.2, 1.2), l: 24 });
        },
        modPost(ev, m) { if (m.hitX) ev.d.vx = 0; if (m.hitY) ev.d.vy = 0; },
        under(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, a = Math.min(1, ev.t / 30, (ev.def.dur - ev.t) / 30);
            const g = ctx.createLinearGradient(0, H * 0.25, 0, H);
            g.addColorStop(0, 'rgba(190,240,255,0)'); g.addColorStop(1, 'rgba(190,240,255,' + (0.26 * a) + ')');
            ctx.fillStyle = g; ctx.fillRect(0, H * 0.25, W, H * 0.75);
            ctx.fillStyle = '#fff';
            d.gl.forEach(q => { const t = 0.5 + 0.5 * S(ev.t * 0.08 + q.p); ctx.globalAlpha = t * 0.7 * a; ctx.fillRect(q.x - 1, q.y - 4, 2, 8); ctx.fillRect(q.x - 4, q.y - 1, 8, 2); });
            ctx.globalAlpha = 1;
            for (let i = d.sp.length - 1; i >= 0; i--) { const p = d.sp[i]; p.x += p.vx; p.y += p.vy; if (--p.l <= 0) { d.sp.splice(i, 1); continue; } ctx.globalAlpha = p.l / 24; ctx.fillRect(p.x, p.y, 2.5, 2.5); }
            ctx.globalAlpha = 1;
        }
    });

    // ---- 2 · Pez Abisal: tres franjas de agua con corrientes que cambian de sentido
    def('currents', {
        name: 'CORRIENTES ABISALES', hint: '¡Cada franja te arrastra distinto!', color: '#5be0c7', warn: 70, dur: 520, tag: '¡CORRIENTES!',
        start(ev) {
            const d = ev.d; d.top = playAreaH * 0.40; d.lh = playAreaH * 0.56 / 3; d.flip = 0; d.flash = 0;
            const s = Math.random() < 0.5 ? 1 : -1; d.dirs = [s, -s, s];
        },
        tick(ev) {
            const d = ev.d; if (d.flash > 0) d.flash--;
            if (++d.flip >= 170) { d.flip = 0; d.flash = 26; d.dirs = d.dirs.map(v => -v); beep(260, 0.3, 'sine', 0.06, 130); }
        },
        mod(ev, m) {
            const d = ev.d, lane = Math.floor((pcy() - d.top) / d.lh);
            if (lane >= 0 && lane < 3) m.ax += d.dirs[lane] * 1.55 * K() * (d.flash > 0 ? 0.25 : 1) * Math.min(1, ev.t / 20);
        },
        under(ev) {
            const d = ev.d, W = playAreaW, a = Math.min(1, ev.t / 25, (ev.def.dur - ev.t) / 25), lane = Math.floor((pcy() - d.top) / d.lh);
            for (let i = 0; i < 3; i++) {
                const y0 = d.top + i * d.lh, dir = d.dirs[i], here = i === lane;
                ctx.fillStyle = 'rgba(70,225,205,' + ((here ? 0.17 : 0.09) * a) + ')'; ctx.fillRect(0, y0, W, d.lh);
                ctx.fillStyle = 'rgba(190,255,245,' + (0.5 * a) + ')';
                const gap = 78, off = (ev.t * 3.2 * dir) % gap;
                for (let x = -gap; x < W + gap; x += gap) {
                    const xx = x + off, yy = y0 + d.lh / 2;
                    ctx.beginPath(); ctx.moveTo(xx - dir * 9, yy - 9); ctx.lineTo(xx + dir * 9, yy); ctx.lineTo(xx - dir * 9, yy + 9); ctx.lineTo(xx - dir * 3, yy); ctx.closePath(); ctx.fill();
                }
                ctx.fillStyle = 'rgba(210,255,250,' + (0.55 * a) + ')';
                for (let k = 0; k < 4; k++) { const bx = ((k * 211 + ev.t * 0.9 * dir) % W + W) % W, by = y0 + d.lh * (0.2 + 0.6 * ((k * 37 + i * 13) % 10) / 10) + S(ev.t * 0.05 + k) * 3; ctx.beginPath(); ctx.arc(bx, by, 2 + k % 3, 0, TAU); ctx.fill(); }
            }
        }
    });

    // ---- 3 · Búho Guardián: noche cerrada, solo ves cerca de ti; las luciérnagas amplían la luz
    def('night', {
        name: 'NOCHE CERRADA', hint: '¡Atrapa luciérnagas para ver más lejos!', color: '#a6ff8f', warn: 70, dur: 560, tag: '¡ATRAPA LUCIÉRNAGAS!',
        start(ev) { const d = ev.d; d.boost = 0; d.fly = []; for (let i = 0; i < 4; i++) d.fly.push(newFly()); },
        tick(ev) {
            const d = ev.d; d.boost = Math.max(0, d.boost - 0.1);
            d.fly.forEach((f, i) => {
                f.a += R(-0.2, 0.2); f.x = clamp(f.x + C(f.a) * 0.95, 24, playAreaW - 24); f.y = clamp(f.y + S(f.a) * 0.95, 70, playAreaH - 24); f.life--;
                if (Math.hypot(f.x - pcx(), f.y - pcy()) < 26) {
                    d.boost = Math.min(120, d.boost + 50); score += 150; createExplosion(f.x, f.y, '#d8ff6a', 10, true); beep(880, 0.12, 'sine', 0.06, 1760); d.fly[i] = newFly();
                } else if (f.life <= 0) d.fly[i] = newFly();
            });
        },
        over(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, fade = Math.min(1, ev.t / 40, (ev.def.dur - ev.t) / 40), rad = 120 + d.boost;
            const g = ctx.createRadialGradient(pcx(), pcy(), rad * 0.5, pcx(), pcy(), rad * 1.7);
            g.addColorStop(0, 'rgba(2,0,16,0)'); g.addColorStop(1, 'rgba(2,0,16,' + (0.86 * fade) + ')');
            ctx.save(); ctx.beginPath(); ctx.rect(0, 58, W, H - 58); ctx.clip();       // la barra de vida del jefe queda a la vista
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.restore();
            d.fly.forEach(f => { glow(f.x, f.y, 38, '#d8ff6a', 0.9); ctx.fillStyle = '#f6ffb0'; ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, TAU); ctx.fill(); });
            ctx.lineWidth = 1.5;                                                   // las balas SIEMPRE se ven (juego justo)
            for (let i = 0; i < enemyBullets.length; i++) {
                const b = enemyBullets[i]; if (Math.hypot(b.x - pcx(), b.y - pcy()) < rad) continue;
                const r = Math.max(3, b.width * 0.55 + 1.5);
                ctx.globalAlpha = 0.95 * fade; ctx.fillStyle = b.color || '#fff'; ctx.strokeStyle = '#fff';
                ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, TAU); ctx.fill(); ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }
    });
    function newFly() { return { x: R(60, playAreaW - 60), y: R(playAreaH * 0.3, playAreaH * 0.85), a: R(0, TAU), life: 420 }; }

    // ---- 4 · Golem de Pergaminos: charcos de tinta que frenan la nave
    def('ink', {
        name: 'TINTA DERRAMADA', hint: '¡Los charcos te frenan! Rodéalos', color: '#b46aff', warn: 70, dur: 560, tag: ev => ev.d.inside ? '¡ATASCADO EN TINTA!' : '¡CUIDADO CON LOS CHARCOS!',
        start(ev) { ev.d.p = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d; d.inside = false;
            if (d.n < 5 && ev.t % 36 === 1) {
                let x, y, tries = 0;
                do { x = R(70, playAreaW - 70); y = R(playAreaH * 0.35, playAreaH - 60); tries++; } while (Math.hypot(x - pcx(), y - pcy()) < 95 && tries < 14);
                d.p.push({ x, y, r: 0, rt: R(48, 68), sd: R(0, TAU) }); d.n++; beep(190, 0.18, 'sine', 0.05, 90);
            }
            d.p.forEach(p => { p.r = lerp(p.r, p.rt, 0.07); });
        },
        mod(ev, m) {
            const d = ev.d;
            for (const p of d.p) if (Math.hypot(pcx() - p.x, pcy() - p.y) < p.r * 0.92) { m.dx *= 0.42; m.dy *= 0.42; d.inside = true; break; }
        },
        under(ev) {
            const d = ev.d, a = Math.min(1, (ev.def.dur - ev.t) / 50);
            d.p.forEach(p => {
                ctx.globalAlpha = 0.9 * a; ctx.fillStyle = '#240c42'; ctx.strokeStyle = '#b46aff'; ctx.lineWidth = 3;
                ctx.beginPath();
                for (let i = 0; i <= 18; i++) { const an = i / 18 * TAU, rr = p.r * (1 + 0.16 * S(an * 3 + p.sd + ev.t * 0.03) + 0.08 * S(an * 5 - ev.t * 0.04)); i ? ctx.lineTo(p.x + C(an) * rr, p.y + S(an) * rr) : ctx.moveTo(p.x + C(an) * rr, p.y + S(an) * rr); }
                ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.globalAlpha = 0.5 * a; ctx.fillStyle = '#e6c8ff'; ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.22, p.r * 0.1, -0.6, 0, TAU); ctx.fill();
            });
            ctx.globalAlpha = 1;
        }
    });

    // ---- 5 · Reloj Centinela: burbujas de tiempo donde las balas casi se detienen (zona segura)
    def('time_bubble', {
        name: 'BURBUJA TEMPORAL', hint: '¡Dentro de las burbujas el tiempo se frena!', color: '#9fd8ff', warn: 70, dur: 540, tag: 'METE LAS BALAS EN LAS BURBUJAS',
        start(ev) { const W = playAreaW, H = playAreaH; ev.d.b = [{ x: W * 0.3, y: H * 0.45, vx: 0.9, vy: 0.55, r: 82 }, { x: W * 0.7, y: H * 0.62, vx: -0.8, vy: -0.45, r: 82 }]; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            d.b.forEach(q => {
                q.x += q.vx; q.y += q.vy;
                if (q.x < q.r || q.x > W - q.r) q.vx *= -1; if (q.y < H * 0.22 || q.y > H - q.r) q.vy *= -1;
            });
            eachBullet(b => {
                const inside = d.b.some(q => Math.hypot(b.x - q.x, b.y - q.y) < q.r);
                if (inside && !b._tb) { b._tb = 1; b.vx *= 0.3; b.vy *= 0.3; }
                else if (!inside && b._tb) { b._tb = 0; b.vx /= 0.3; b.vy /= 0.3; }
            });
        },
        end(ev) { eachBullet(b => { if (b._tb) { b._tb = 0; b.vx /= 0.3; b.vy /= 0.3; } }); },
        under(ev) {
            const d = ev.d, a = Math.min(1, ev.t / 25, (ev.def.dur - ev.t) / 25);
            d.b.forEach(q => {
                const g = ctx.createRadialGradient(q.x, q.y, q.r * 0.2, q.x, q.y, q.r);
                g.addColorStop(0, 'rgba(150,210,255,0.05)'); g.addColorStop(1, 'rgba(150,210,255,' + (0.28 * a) + ')');
                ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, TAU); ctx.fill();
                ctx.strokeStyle = 'rgba(200,235,255,' + (0.85 * a) + ')'; ctx.lineWidth = 3; ctx.stroke();
                ctx.lineWidth = 2;
                for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(q.x + C(an) * (q.r - 9), q.y + S(an) * (q.r - 9)); ctx.lineTo(q.x + C(an) * (q.r - 2), q.y + S(an) * (q.r - 2)); ctx.stroke(); }
                ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + C(ev.t * 0.02 - 1.57) * q.r * 0.6, q.y + S(ev.t * 0.02 - 1.57) * q.r * 0.6); ctx.stroke();
                ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x + C(ev.t * 0.2 - 1.57) * q.r * 0.82, q.y + S(ev.t * 0.2 - 1.57) * q.r * 0.82); ctx.stroke();
            });
        }
    });

    // ---- 6 · Ángel Caído: SENTENCIA, una columna de luz cae justo donde estabas
    def('judgment', {
        name: 'SENTENCIA', hint: '¡Muévete antes de que caiga la luz!', color: '#ff5a78', warn: 70, dur: 330, tag: '¡LA LUZ TE SIGUE!',
        start(ev) { ev.d.s = []; },
        tick(ev) {
            const d = ev.d, t = ev.t;
            [1, 105, 190].forEach((t0, i) => {
                const tt = t - t0;
                if (tt === 0) { d.s[i] = { x: pcx(), lock: false, fired: 0 }; beep(300, 0.4, 'sine', 0.05, 600); }
                const s = d.s[i]; if (!s) return;
                if (tt > 0 && tt < 46) s.x = lerp(s.x, pcx(), 0.2);
                if (tt === 46) { s.lock = true; beep(760, 0.1, 'square', 0.05); }
                if (tt === 62) {
                    s.fired = 1; screenShake = Math.max(screenShake, 11); beep(120, 0.35, 'sawtooth', 0.09, 40);
                    for (let k = 0; k < 6; k++) fire(bl(s.x + (k % 2 ? 22 : -22), 30, (k - 2.5) * 0.7, 2 + R(0, 1.2), '#ff2d4a', 'drop'));
                }
                if (tt >= 62 && tt < 82 && Math.abs(pcx() - s.x) < 33) hurt();
                if (tt >= 62) s.fired = Math.max(0, 1 - (tt - 62) / 24);
            });
        },
        under(ev) {
            const d = ev.d, H = playAreaH;
            d.s.forEach((s, i) => {
                if (!s) return;
                const tt = ev.t - [1, 105, 190][i];
                if (tt <= 0 || tt > 90) return;
                if (tt < 62) {
                    const r = lerp(64, 26, Math.min(1, tt / 46));
                    ctx.strokeStyle = s.lock ? '#fff' : '#ff5a78'; ctx.lineWidth = 3;
                    ctx.beginPath(); ctx.arc(s.x, pcy(), r, 0, TAU); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(s.x - r - 8, pcy()); ctx.lineTo(s.x + r + 8, pcy()); ctx.moveTo(s.x, pcy() - r - 8); ctx.lineTo(s.x, pcy() + r + 8); ctx.stroke();
                    ctx.fillStyle = 'rgba(255,90,120,' + (s.lock ? 0.18 + 0.12 * S(tt * 0.9) : 0.07) + ')'; ctx.fillRect(s.x - 28, 0, 56, H);
                } else if (s.fired > 0) {
                    const a = s.fired;
                    glow(s.x, H * 0.5, H * 0.55, '#ff3050', 0.5 * a);
                    ctx.fillStyle = 'rgba(255,60,90,' + (0.75 * a) + ')'; ctx.fillRect(s.x - 28, 0, 56, H);
                    ctx.fillStyle = 'rgba(255,255,255,' + a + ')'; ctx.fillRect(s.x - 11, 0, 22, H);
                }
            });
        }
    });

    // ==========================================================================================
    //  JEFES FINALES  (dos eventos propios cada uno)
    // ==========================================================================================
    const endNow = ev => { ev.t = ev.def.dur; };                 // termina el evento este mismo frame

    // ---- 1 · Kyūbi: FUEGOS FATUOS (premio/riesgo: disparar para limpiar balas) ----------------
    def('wisps', {
        name: 'FUEGOS FATUOS', hint: '¡Dispárales antes de que se enciendan!', color: '#8fe3ff', warn: 70, dur: 600, tag: '¡DISPARA A LOS FUEGOS FATUOS!',
        start(ev) { ev.d.w = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            if (d.n < 6 && ev.t % 46 === 1) { d.w.push({ x: R(50, W - 50), y: R(H * 0.22, H * 0.55), a: R(0, TAU), life: 0, hp: 2, flash: 0, sd: R(0, TAU) }); d.n++; beep(740, 0.1, 'sine', 0.05, 1100); }
            for (let i = d.w.length - 1; i >= 0; i--) {
                const w = d.w[i]; w.life++; w.a += R(-0.12, 0.12);
                w.x = clamp(w.x + C(w.a) * 0.85, 30, W - 30); w.y = clamp(w.y + S(w.a) * 0.85, 90, H * 0.7);
                const dmg = takeShots(w.x - 20, w.y - 22, 40, 44, w);
                if (dmg > 0) { w.hp -= dmg; w.flash = 3; }
                if (w.flash > 0) w.flash--;
                if (w.hp <= 0) {                                    // ¡destruido! limpia balas cercanas y a veces suelta un ítem
                    createExplosion(w.x, w.y, '#8fe3ff', 16); clearBulletsNear(w.x, w.y, 95); score += 200;
                    if (Math.random() < 0.35) drop(w.x, w.y);
                    beep(980, 0.12, 'sine', 0.06, 1500); d.w.splice(i, 1); continue;
                }
                if (w.life >= 250) {                                // se enciende: orbe grande + anillo
                    const a = Math.atan2(pcy() - w.y, pcx() - w.x), sp = difficultySettings[currentDiff].bulletSpeed * 0.75;
                    fire(bl(w.x, w.y, C(a) * sp, S(a) * sp, '#c9a6ff', 'orb', 12));
                    ring(w.x, w.y, Math.max(5, Math.round(6 * K())), w.sd, sp * 0.55, '#8fe3ff');
                    createExplosion(w.x, w.y, '#c9a6ff', 8, true); beep(300, 0.15, 'sawtooth', 0.05, 120); d.w.splice(i, 1);
                }
            }
            if (d.n >= 6 && !d.w.length) endNow(ev);
        },
        over(ev) {
            ev.d.w.forEach(w => {
                const p = w.life / 250, fl = 0.7 + 0.3 * S(ev.t * 0.3 + w.sd);
                glow(w.x, w.y, 44, w.flash ? '#fff' : '#6fd8ff', 0.8 * fl);
                ctx.fillStyle = w.flash ? '#fff' : '#bff0ff';
                ctx.beginPath(); ctx.moveTo(w.x, w.y - 22 * fl); ctx.quadraticCurveTo(w.x + 14, w.y, w.x, w.y + 12); ctx.quadraticCurveTo(w.x - 14, w.y, w.x, w.y - 22 * fl); ctx.fill();
                ctx.fillStyle = '#4aa8ff'; ctx.beginPath(); ctx.arc(w.x, w.y + 3, 6, 0, TAU); ctx.fill();
                ctx.strokeStyle = p > 0.7 ? '#ff5a78' : '#c9a6ff'; ctx.lineWidth = 3;                  // anillo: cuánto falta para encenderse
                ctx.beginPath(); ctx.arc(w.x, w.y, 28, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
            });
        }
    });

    // ---- 1 · Kyūbi: ESTAMPIDA DE ZORROS (carriles con aviso, esquiva vertical) -----------------
    function drawFox(x, y, dir, t) {
        ctx.save(); ctx.translate(x, y); ctx.scale(dir, 1);
        const run = S(t * 0.7) * 3;
        ctx.fillStyle = '#ff8a3a'; ctx.strokeStyle = '#2a0f10'; ctx.lineWidth = 3; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(-34, 4 + run); ctx.quadraticCurveTo(-62, -16 + run, -50, -22); ctx.quadraticCurveTo(-42, -4, -24, -4); ctx.closePath(); ctx.fill(); ctx.stroke();   // cola
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-52, -20 + run, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.ellipse(-4, 2, 30, 13, 0, 0, TAU); ctx.fill(); ctx.stroke();                                                       // cuerpo
        ctx.beginPath(); ctx.moveTo(22, -8); ctx.lineTo(44, 0); ctx.lineTo(26, 12); ctx.closePath(); ctx.fill(); ctx.stroke();                                              // hocico
        ctx.beginPath(); ctx.moveTo(20, -8); ctx.lineTo(24, -24); ctx.lineTo(32, -8); ctx.closePath(); ctx.fill(); ctx.stroke();                                          // oreja
        ctx.fillStyle = '#2a0f10'; ctx.fillRect(30, -3, 4, 4);
        ctx.strokeStyle = '#ff8a3a'; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-14 + run * 2, 22); ctx.moveTo(10, 10); ctx.lineTo(10 - run * 2, 22); ctx.stroke();
        ctx.restore();
    }
    def('foxrun', {
        name: 'ESTAMPIDA DE ZORROS', hint: '¡Cruza de carril cuando veas la línea!', color: '#ff8a3a', warn: 70, dur: 460, tag: '¡ESQUIVA LOS ZORROS!',
        start(ev) { ev.d.f = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            if (d.n < 5 && ev.t % 70 === 1) { d.f.push({ y: clamp(pcy() + R(-90, 90), H * 0.3, H - 40), dir: d.n % 2 ? 1 : -1, t: 0, x: null }); d.n++; beep(520, 0.25, 'sawtooth', 0.04, 260); }
            for (let i = d.f.length - 1; i >= 0; i--) {
                const f = d.f[i]; f.t++;
                if (f.t === 52) { f.x = f.dir > 0 ? -70 : W + 70; screenShake = Math.max(screenShake, 4); beep(180, 0.3, 'sawtooth', 0.06, 60); }
                if (f.x !== null) {
                    f.x += f.dir * 15 * Math.min(1.2, K());
                    if (Math.abs(pcx() - f.x) < 46 && Math.abs(pcy() - f.y) < 24) hurt();
                    if (f.x < -90 || f.x > W + 90) f.done = true;
                }
                if (f.done) d.f.splice(i, 1);
            }
            if (d.n >= 5 && !d.f.length) endNow(ev);
        },
        under(ev) {
            const W = playAreaW;
            ev.d.f.forEach(f => {
                if (f.x === null) {                                              // aviso: línea discontinua + flecha en el borde
                    const a = 0.35 + 0.35 * S(f.t * 0.5);
                    ctx.strokeStyle = 'rgba(255,138,58,' + a + ')'; ctx.lineWidth = 5; ctx.setLineDash([22, 14]);
                    ctx.beginPath(); ctx.moveTo(0, f.y); ctx.lineTo(W, f.y); ctx.stroke(); ctx.setLineDash([]);
                    ctx.fillStyle = 'rgba(255,200,120,' + (a + 0.3) + ')'; const ex = f.dir > 0 ? 26 : W - 26;
                    ctx.beginPath(); ctx.moveTo(ex - f.dir * 14, f.y - 16); ctx.lineTo(ex + f.dir * 14, f.y); ctx.lineTo(ex - f.dir * 14, f.y + 16); ctx.closePath(); ctx.fill();
                }
            });
        },
        over(ev) {
            ev.d.f.forEach(f => { if (f.x !== null) { glow(f.x, f.y, 70, '#ff7a3a', 0.45); drawFox(f.x, f.y, f.dir, f.t); } });
        }
    });

    // ---- 2 · Rey Yeti: BOLA DE NIEVE GIGANTE (rebota y suelta carámbanos al chocar) -------------
    def('snowball', {
        name: 'BOLA DE NIEVE GIGANTE', hint: '¡Rebota por toda la pantalla!', color: '#dff4ff', warn: 80, dur: 720,
        warnUnder(ev) {
            const d = ev.d; if (!d.px) d.px = R(playAreaW * 0.25, playAreaW * 0.75);
            const a = 0.4 + 0.4 * S(ev.t * 0.4);
            ctx.fillStyle = 'rgba(220,245,255,' + a + ')';
            for (let k = 0; k < 4; k++) { const y = 30 + k * 34 + (ev.t * 4) % 34; ctx.beginPath(); ctx.moveTo(d.px - 16, y); ctx.lineTo(d.px + 16, y); ctx.lineTo(d.px, y + 18); ctx.closePath(); ctx.fill(); }
        },
        start(ev) {
            const d = ev.d; if (!d.px) d.px = R(playAreaW * 0.25, playAreaW * 0.75);
            d.b = { x: d.px, y: -60, vx: (Math.random() < 0.5 ? -1 : 1) * 2.4 * K(), vy: 3, r: 44, rot: 0, bounces: 0 };
        },
        tick(ev) {
            const d = ev.d, b = d.b, W = playAreaW, H = playAreaH;
            b.vy += 0.12; b.x += b.vx; b.y += b.vy; b.rot += b.vx * 0.04;
            if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); beep(110, 0.12, 'square', 0.05, 60); }
            if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); beep(110, 0.12, 'square', 0.05, 60); }
            if (b.y > H - b.r && b.vy > 0 && b.bounces < 3) {
                b.y = H - b.r; b.vy = -9.5; b.bounces++; screenShake = Math.max(screenShake, 14); beep(70, 0.3, 'sawtooth', 0.09, 35);
                ring(b.x, b.y - 10, Math.max(8, Math.round(10 * K())), R(0, TAU), 3.2, '#dff4ff', 'spike');
            }
            if (b.bounces >= 3 && b.y > H + b.r + 20) endNow(ev);
            if (Math.hypot(pcx() - b.x, pcy() - b.y) < b.r + 5) hurt();
        },
        over(ev) {
            const b = ev.d.b; if (!b) return;
            ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.rot);
            const g = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.7, '#cfe8ff'); g.addColorStop(1, '#7fb4e8');
            ctx.fillStyle = g; ctx.strokeStyle = '#2a4a78'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.arc(0, 0, b.r, 0, TAU); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(70,120,190,0.55)'; ctx.lineWidth = 3;
            for (let i = 0; i < 4; i++) { const a = i * 1.6 + 0.4; ctx.beginPath(); ctx.arc(0, 0, b.r * (0.35 + i * 0.15), a, a + 1.0); ctx.stroke(); }
            ctx.fillStyle = '#fff'; [[-14, -10], [10, 8], [-4, 18], [18, -16]].forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 4, 0, TAU); ctx.fill(); });
            ctx.restore();
        }
    });

    // ---- 2 · Rey Yeti: CONGELACIÓN (si te quedas quieto te conviertes en hielo) -----------------
    def('frost', {
        name: 'CONGELACIÓN', hint: '¡Quédate quieto y te congelas!', color: '#8fe0ff', warn: 70, dur: 600,
        tag: ev => ev.d.fz > 0 ? '¡CONGELADO!' : (ev.d.f > 45 ? '¡MUÉVETE YA!' : '¡NO TE QUEDES QUIETO!'),
        start(ev) { const d = ev.d; d.f = 0; d.fz = 0; d.grace = 80; d.moving = true; d.snow = []; for (let i = 0; i < (lowFx() ? 30 : 70); i++) d.snow.push({ x: R(0, playAreaW), y: R(0, playAreaH), s: R(0.5, 1.6) }); },
        mod(ev, m) { const d = ev.d; if (d.fz > 0) { m.dx = 0; m.dy = 0; m.ax = 0; m.ay = 0; return; } d.moving = Math.hypot(m.dx, m.dy) > 0.05; },
        tick(ev) {
            const d = ev.d;
            if (d.fz > 0) { if (--d.fz === 0) { d.grace = 130; screenShake = Math.max(screenShake, 8); createExplosion(pcx(), pcy(), '#bff6ff', 24, true); beep(600, 0.2, 'triangle', 0.06, 1200); } return; }
            if (d.grace > 0) { d.grace--; d.f = Math.max(0, d.f - 3); return; }
            if (!d.moving) d.f += 1.2 * Math.min(1.25, K()); else d.f = Math.max(0, d.f - 2.4);
            if (d.f >= 100) { d.f = 0; d.fz = 55; screenShake = Math.max(screenShake, 12); beep(200, 0.4, 'sawtooth', 0.07, 60); createExplosion(pcx(), pcy(), '#bff6ff', 30); }
        },
        over(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, k = d.fz > 0 ? 0.6 : 0.5 * (d.f / 100), fade = Math.min(1, ev.t / 25, (ev.def.dur - ev.t) / 25);
            ctx.fillStyle = '#eaf8ff';
            d.snow.forEach(s => { s.y += 1.4 * s.s; s.x += 0.6 * s.s + S(ev.t * 0.03 + s.y * 0.01) * 0.4; if (s.y > H) { s.y = -4; s.x = R(0, W); } if (s.x > W) s.x = 0; ctx.globalAlpha = 0.65 * fade; ctx.fillRect(s.x, s.y, 2.5 * s.s, 2.5 * s.s); });
            ctx.globalAlpha = 1;
            if (k > 0.01) {
                const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.75);
                g.addColorStop(0, 'rgba(190,235,255,0)'); g.addColorStop(1, 'rgba(190,235,255,' + k + ')');
                ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            }
            ctx.strokeStyle = d.fz > 0 ? '#fff' : '#8fe0ff'; ctx.lineWidth = 4;                 // medidor de hielo alrededor de la nave
            ctx.beginPath(); ctx.arc(pcx(), pcy(), 27, -Math.PI / 2, -Math.PI / 2 + TAU * (d.fz > 0 ? 1 : d.f / 100)); ctx.stroke();
            if (d.fz > 0) {                                                                       // bloque de hielo
                ctx.fillStyle = 'rgba(180,230,255,0.45)'; ctx.strokeStyle = '#eaffff'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.rect(pcx() - 24, pcy() - 24, 48, 48); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(pcx() - 24, pcy() - 8); ctx.lineTo(pcx() - 4, pcy() + 4); ctx.lineTo(pcx() + 6, pcy() - 14); ctx.lineTo(pcx() + 24, pcy() + 2); ctx.stroke();
            }
        }
    });

    // ---- 3 · Kraken: REMOLINO ABISAL (gravedad móvil que te arrastra y curva las balas) ---------
    def('vortex', {
        name: 'REMOLINO ABISAL', hint: '¡Te arrastra hacia el centro!', color: '#5be0c7', warn: 70, dur: 580, tag: '¡ESCAPA DEL REMOLINO!',
        start(ev) { ev.d.x = playAreaW / 2; ev.d.y = playAreaH * 0.5; ev.d.R = Math.min(260, playAreaW * 0.46); },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            d.x = W / 2 + S(ev.t * 0.017) * W * 0.32; d.y = H * 0.52 + C(ev.t * 0.013) * H * 0.13;
            eachBullet(b => {                                                      // las balas giran alrededor
                const dist = Math.hypot(b.x - d.x, b.y - d.y);
                if (dist < d.R) { const k = 0.028 * (1 - dist / d.R), c = C(k), s = S(k), vx = b.vx * c - b.vy * s; b.vy = b.vx * s + b.vy * c; b.vx = vx; }
            });
            if (Math.hypot(pcx() - d.x, pcy() - d.y) < 17) hurt();                  // el centro es letal
        },
        mod(ev, m, pl) {
            const d = ev.d, dx = d.x - pcx(), dy = d.y - pcy(), dist = Math.hypot(dx, dy) || 1;
            if (dist < d.R) {
                const f = 1 - dist / d.R, pull = Math.min((0.35 + 1.8 * f) * K() * Math.min(1, ev.t / 25), pl.speed * 0.8);
                m.ax += dx / dist * pull - dy / dist * 0.5 * f; m.ay += dy / dist * pull + dx / dist * 0.5 * f;
            }
        },
        under(ev) {
            const d = ev.d, a = Math.min(1, ev.t / 25, (ev.def.dur - ev.t) / 25);
            glow(d.x, d.y, d.R, '#2bd0b0', 0.22 * a);
            for (let arm = 0; arm < 4; arm++) {
                ctx.strokeStyle = 'rgba(160,255,240,' + (0.5 * a) + ')'; ctx.lineWidth = 4 - (arm % 2); ctx.beginPath();
                for (let i = 0; i <= 28; i++) { const p = i / 28, an = ev.t * 0.06 + arm * Math.PI / 2 + p * 5, rr = 14 + p * d.R * 0.95; i ? ctx.lineTo(d.x + C(an) * rr, d.y + S(an) * rr) : ctx.moveTo(d.x + C(an) * rr, d.y + S(an) * rr); }
                ctx.stroke();
            }
            ctx.fillStyle = '#021a1a'; ctx.strokeStyle = '#5be0c7'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(d.x, d.y, 17, 0, TAU); ctx.fill(); ctx.stroke();
        }
    });

    // ---- 3 · Kraken: TENTÁCULOS DEL ABISMO (erupciones del suelo con círculo de aviso) ----------
    def('tentacles', {
        name: 'TENTÁCULOS DEL ABISMO', hint: '¡Huye de los círculos del suelo!', color: '#b06aff', warn: 70, dur: 600,
        start(ev) { ev.d.q = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, maxH = H * 0.6;
            if (d.n < 8 && ev.t % 52 === 1) { d.q.push({ x: clamp(Math.random() < 0.65 ? pcx() + R(-90, 90) : R(60, W - 60), 40, W - 40), t: 0, h: 0 }); d.n++; beep(150, 0.3, 'sawtooth', 0.05, 80); }
            for (let i = d.q.length - 1; i >= 0; i--) {
                const q = d.q[i]; q.t++;
                q.h = q.t < 50 ? 0 : q.t < 64 ? maxH * (q.t - 50) / 14 : q.t < 86 ? maxH : q.t < 101 ? maxH * (1 - (q.t - 86) / 15) : 0;
                if (q.t === 50) { screenShake = Math.max(screenShake, 10); beep(90, 0.3, 'sawtooth', 0.08, 40); }
                if (q.t === 66) { const a = Math.atan2(pcy() - (H - q.h), pcx() - q.x); for (let k = -1; k <= 1; k++) fire(bl(q.x, H - q.h, C(a + k * 0.35) * 3.2, S(a + k * 0.35) * 3.2, '#b06aff', 'orb')); }
                if (q.h > 0 && Math.abs(pcx() - q.x) < 24 && pcy() > H - q.h) hurt();
                if (q.t > 104) d.q.splice(i, 1);
            }
            if (d.n >= 8 && !d.q.length) endNow(ev);
        },
        under(ev) {
            const H = playAreaH;
            ev.d.q.forEach(q => {
                if (q.t < 50) {                                                    // círculo de aviso en el suelo
                    const p = q.t / 50; ctx.strokeStyle = 'rgba(176,106,255,' + (0.4 + 0.5 * S(q.t * 0.5)) + ')'; ctx.lineWidth = 4;
                    ctx.beginPath(); ctx.ellipse(q.x, H - 8, 34 - 8 * p, 12, 0, 0, TAU); ctx.stroke();
                    ctx.fillStyle = 'rgba(176,106,255,0.18)'; ctx.fill();
                }
                if (q.h > 0) {
                    const sway = S(ev.t * 0.2 + q.x) * 12 * (q.h / (H * 0.6)), tipX = q.x + sway, tipY = H - q.h;
                    ctx.lineCap = 'round';
                    ctx.strokeStyle = '#140a28'; ctx.lineWidth = 36; ctx.beginPath(); ctx.moveTo(q.x, H + 14); ctx.quadraticCurveTo(q.x - sway * 1.6, H - q.h * 0.5, tipX, tipY); ctx.stroke();
                    ctx.strokeStyle = '#6a3aa8'; ctx.lineWidth = 28; ctx.stroke();
                    ctx.fillStyle = '#d9b6ff';
                    for (let k = 1; k <= 5; k++) { const p = k / 6; ctx.beginPath(); ctx.arc(lerp(q.x, tipX, p) - sway * 0.4 * S(p * Math.PI), lerp(H, tipY, p), 4, 0, TAU); ctx.fill(); }
                    ctx.fillStyle = '#6a3aa8'; ctx.strokeStyle = '#140a28'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tipX, tipY, 17, 0, TAU); ctx.fill(); ctx.stroke();
                }
            });
        }
    });

    // ---- 4 · Reina Araña: CAPULLOS (dispáralos antes de que revienten) ------------------------
    def('cocoons', {
        name: 'CAPULLOS', hint: '¡Destrúyelos antes de que revienten!', color: '#7dff6a', warn: 70, dur: 600, tag: '¡REVIENTA LOS CAPULLOS!',
        start(ev) { ev.d.c = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            if (d.n < 4 && ev.t % 62 === 1) { d.c.push({ x: R(80, W - 80), y: R(H * 0.28, H * 0.5), hp: 7, life: 0, flash: 0 }); d.n++; beep(260, 0.15, 'triangle', 0.06, 520); }
            for (let i = d.c.length - 1; i >= 0; i--) {
                const c = d.c[i]; c.life++;
                const dmg = takeShots(c.x - 22, c.y - 28, 44, 56, c);
                if (dmg > 0) { c.hp -= dmg; c.flash = 3; }
                if (c.flash > 0) c.flash--;
                if (c.hp <= 0) {
                    createExplosion(c.x, c.y, '#dfffd0', 18); clearBulletsNear(c.x, c.y, 75); score += 300; if (Math.random() < 0.5) drop(c.x, c.y);
                    beep(700, 0.15, 'triangle', 0.06, 1300); d.c.splice(i, 1); continue;
                }
                if (c.life >= 300) {                                                  // revienta: anillo venenoso + abanico a la nave
                    ring(c.x, c.y, Math.max(10, Math.round(12 * K())), R(0, TAU), 2.6, '#7dff6a');
                    const a = Math.atan2(pcy() - c.y, pcx() - c.x); for (let k = -1; k <= 1; k++) fire(bl(c.x, c.y, C(a + k * 0.25) * 4, S(a + k * 0.25) * 4, '#dfffd0', 'spike'));
                    createExplosion(c.x, c.y, '#7dff6a', 14); screenShake = Math.max(screenShake, 6); beep(140, 0.2, 'sawtooth', 0.06, 60); d.c.splice(i, 1);
                }
            }
            if (d.n >= 4 && !d.c.length) endNow(ev);
        },
        over(ev) {
            ev.d.c.forEach(c => {
                const p = c.life / 300, sw = S(ev.t * 0.08 + c.x) * 3, danger = p > 0.7 ? 0.5 + 0.5 * S(ev.t * 0.6) : 0;
                ctx.strokeStyle = 'rgba(235,255,225,0.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c.x, 0); ctx.lineTo(c.x + sw, c.y - 28); ctx.stroke();
                ctx.save(); ctx.translate(c.x + sw, c.y); ctx.rotate(S(ev.t * 0.08 + c.x) * 0.08);
                ctx.fillStyle = c.flash ? '#fff' : (danger ? 'rgb(255,' + Math.round(255 - 130 * danger) + ',' + Math.round(235 - 160 * danger) + ')' : '#eaf5e0');
                ctx.strokeStyle = '#2a3a22'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, 20, 28, 0, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.strokeStyle = 'rgba(80,110,60,0.6)'; ctx.lineWidth = 2; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(0, k * 9, 18 - Math.abs(k) * 3, 3, 0, 0, Math.PI); ctx.stroke(); }
                ctx.restore();
                ctx.fillStyle = '#7dff6a'; for (let k = 0; k < Math.ceil(c.hp); k++) ctx.fillRect(c.x - 17 + k * 5, c.y + 34, 4, 4);   // vida
            });
        }
    });

    // ---- 4 · Reina Araña: SALTO DE LA REINA (se lanza al suelo, onda expansiva, queda expuesta) --
    def('pounce', {
        name: 'SALTO DE LA REINA', hint: '¡Sal de la sombra! Luego, ¡atácala!', color: '#c8ff9a', warn: 70, dur: 175, tag: ev => ev.t < 64 ? '¡SAL DE LA SOMBRA!' : '¡ATÁCALA, ESTÁ EXPUESTA!',
        start(ev) { const d = ev.d, b = ev.owner; d.sx = pcx(); d.y0 = b.y; d.x0 = b.x; d.gy = Math.min(playAreaH * 0.5, playAreaH - 40 - b.height); d.hit = false; },
        post(ev) {
            const d = ev.d, b = ev.owner, t = ev.t, ease = p => p * p;
            if (t <= 22) d.sx = lerp(d.sx, pcx(), 0.2);                                    // la sombra te sigue... y se fija
            if (t < 40) { b.y = d.y0 - 20 * S(t / 40 * Math.PI / 2); b.x = lerp(d.x0, clamp(d.sx - b.width / 2, 0, playAreaW - b.width), t / 80); }
            else if (t < 64) { const p = (t - 40) / 24; b.y = lerp(d.y0 - 20, d.gy, ease(p)); b.x = lerp(lerp(d.x0, clamp(d.sx - b.width / 2, 0, playAreaW - b.width), 0.5), clamp(d.sx - b.width / 2, 0, playAreaW - b.width), p); }
            else if (t < 118) { b.y = d.gy; b.x = clamp(d.sx - b.width / 2, 0, playAreaW - b.width); }
            else { const p = Math.min(1, (t - 118) / 40); b.y = lerp(d.gy, d.y0, p * (2 - p)); b.x = clamp(d.sx - b.width / 2, 0, playAreaW - b.width); }
            if (t === 64 && !d.hit) {                                                      // IMPACTO
                d.hit = true; screenShake = 24; beep(70, 0.5, 'sawtooth', 0.1, 30); createExplosion(b.x + b.width / 2, b.y + b.height, '#c8ff9a', 40);
                const cx = b.x + b.width / 2, by = b.y + b.height;
                ring(cx, by - 20, Math.max(12, Math.round(14 * K())), R(0, TAU), 3.4, '#c8ff9a', 'spike');
                for (const dir of [-1, 1]) for (const dy of [-12, -52]) fire(bl(cx + dir * b.width * 0.4, by + dy, dir * 4.4, 0, '#7dff6a', 'orb', 11));
            }
        },
        under(ev) {
            const d = ev.d, b = ev.owner;
            if (ev.t >= 64) return;
            const w = b.width, gy = d.gy + b.height, p = ev.t / 64, a = 0.25 + 0.35 * S(ev.t * 0.4);
            ctx.fillStyle = 'rgba(30,60,20,' + (0.25 + 0.3 * p) + ')'; ctx.beginPath(); ctx.ellipse(d.sx, gy - 6, w * 0.5, 18, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,90,90,' + a + ')'; ctx.lineWidth = 4; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.ellipse(d.sx, gy - 6, w * 0.5, 18, 0, 0, TAU); ctx.stroke(); ctx.setLineDash([]);
            ctx.fillStyle = 'rgba(255,90,90,' + (a + 0.2) + ')'; ctx.font = FONT(16); ctx.textAlign = 'center'; ctx.fillText('!', d.sx, gy + 5);
        }
    });

    // ---- 5 · Archiliche: MALDICIÓN INVERTIDA (controles al revés unos segundos) -----------------
    def('curse', {
        name: 'MALDICIÓN INVERTIDA', hint: '¡Tus controles se invierten!', color: '#b46aff', warn: 90, dur: 320, tag: '¡CONTROLES INVERTIDOS!',
        start(ev) { beep(200, 0.5, 'sawtooth', 0.06, 90); },
        mod(ev, m) { m.dx = -m.dx; m.dy = -m.dy; },
        end(ev) { beep(520, 0.2, 'triangle', 0.06, 880); },
        over(ev) {
            const W = playAreaW, H = playAreaH, a = Math.min(1, ev.t / 20, (ev.def.dur - ev.t) / 20), x = pcx(), y = pcy();
            const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
            g.addColorStop(0, 'rgba(120,40,200,0)'); g.addColorStop(1, 'rgba(120,40,200,' + (0.32 * a * (0.7 + 0.3 * S(ev.t * 0.15))) + ')');
            ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
            ctx.strokeStyle = 'rgba(210,160,255,' + (0.9 * a) + ')'; ctx.fillStyle = 'rgba(210,160,255,' + (0.9 * a) + ')'; ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) { const an = ev.t * 0.05 + i * TAU / 6; ctx.save(); ctx.translate(x + C(an) * 36, y + S(an) * 36); ctx.rotate(an); ctx.strokeRect(-4, -4, 8, 8); ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(4, 0); ctx.stroke(); ctx.restore(); }
            ctx.font = FONT(12); ctx.textAlign = 'center'; ctx.fillText('◄ ►', x, y - 46);
        }
    });

    // ---- 5 · Archiliche: RUNAS DE PODER (premio: tócalas para un escudo) ------------------------
    def('runes', {
        name: 'RUNAS DE PODER', hint: '¡Tócalas para ganar un escudo!', color: '#ffd98a', warn: 70, dur: 520, tag: '¡TOCA LAS RUNAS!',
        start(ev) { ev.d.r = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH;
            if (d.n < 3 && ev.t % 100 === 1) { d.r.push({ x: R(60, W - 60), y: R(H * 0.45, H - 70), life: 270 }); d.n++; beep(620, 0.12, 'triangle', 0.06, 1240); }
            for (let i = d.r.length - 1; i >= 0; i--) {
                const r = d.r[i]; r.life--;
                if (Math.hypot(r.x - pcx(), r.y - pcy()) < 28) {
                    powerUps.shield = Math.max(powerUps.shield, Date.now() + 2800); score += 500;
                    createExplosion(r.x, r.y, '#ffd98a', 18, true); beep(880, 0.12, 'triangle', 0.07, 1760); setTimeout(() => beep(1320, 0.16, 'triangle', 0.06), 90);
                    d.r.splice(i, 1);
                } else if (r.life <= 0) d.r.splice(i, 1);
            }
            if (d.n >= 3 && !d.r.length) endNow(ev);
        },
        over(ev) {
            ev.d.r.forEach(r => {
                const p = r.life / 270, blink = r.life < 70 ? (Math.floor(ev.t / 5) % 2 ? 0.3 : 1) : 1;
                ctx.globalAlpha = blink; glow(r.x, r.y, 46, '#ffcf5c', 0.7);
                ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, 24, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
                ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(ev.t * 0.04); ctx.fillStyle = '#3a1a5a'; ctx.strokeStyle = '#ffd98a'; ctx.lineWidth = 2;
                ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * TAU / 6; i ? ctx.lineTo(C(a) * 15, S(a) * 15) : ctx.moveTo(C(a) * 15, S(a) * 15); } ctx.closePath(); ctx.fill(); ctx.stroke();
                ctx.rotate(-ev.t * 0.04); ctx.fillStyle = '#ffd98a'; ctx.font = FONT(12); ctx.textAlign = 'center'; ctx.fillText('ᚠ', 0, 5); ctx.restore();
                ctx.globalAlpha = 1;
            });
        }
    });

    // ---- 6 · Coloso del Reloj: TIEMPO DETENIDO (las balas se congelan y luego se sueltan) -------
    def('time_stop', {
        name: 'TIEMPO DETENIDO', hint: '¡Las balas se congelan... y luego siguen!', color: '#cfe8ff', warn: 80, dur: 200, tag: ev => ev.t <= 140 ? '¡TIEMPO DETENIDO! BUSCA TU CAMINO' : '¡SE REANUDA!',
        start(ev) {
            ev.d.rel = 0; beep(900, 0.6, 'sine', 0.07, 80);
            for (let i = 0; i < enemyBullets.length; i++) enemyBullets[i]._seen = true;
        },
        tick(ev) {
            const t = ev.t;
            for (let i = enemyBullets.length - 1; i >= 0; i--) {
                const b = enemyBullets[i]; if (b.inv) continue;
                if (t <= 140) {
                    if (!b._fz) {
                        if (!b._seen && Math.random() < 0.5) { enemyBullets.splice(i, 1); continue; }       // el jefe sigue disparando: se aligera la nube
                        b._seen = true; b._fz = { vx: b.vx, vy: b.vy, g: Math.floor(Math.random() * 3) }; b.vx = 0; b.vy = 0;
                    }
                } else if (b._fz && b._fz.g === Math.floor((t - 141) / 10)) { b.vx = b._fz.vx; b.vy = b._fz.vy; b._fz = null; }   // se sueltan en 3 tandas
            }
        },
        end(ev) { for (let i = 0; i < enemyBullets.length; i++) { const b = enemyBullets[i]; if (b._fz) { b.vx = b._fz.vx; b.vy = b._fz.vy; b._fz = null; } } },
        over(ev) {
            const W = playAreaW, H = playAreaH, t = ev.t, frozen = t <= 140, a = Math.min(1, t / 15, (ev.def.dur - t) / 25) * (frozen ? 1 : 0.5);
            ctx.fillStyle = 'rgba(120,160,230,' + (0.16 * a) + ')'; ctx.fillRect(0, 0, W, H);
            if (t < 30) { ctx.strokeStyle = 'rgba(220,240,255,' + (1 - t / 30) + ')'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(W / 2, H / 2, t * Math.max(W, H) / 28, 0, TAU); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(220,240,255,' + (0.4 * a) + ')'; ctx.lineWidth = 3; const cx = W / 2, cy = H / 2, r = Math.min(W, H) * 0.3;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
            for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(cx + C(an) * (r - 12), cy + S(an) * (r - 12)); ctx.lineTo(cx + C(an) * r, cy + S(an) * r); ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + C(-1.57 + (frozen ? 0 : t * 0.3)) * r * 0.8, cy + S(-1.57 + (frozen ? 0 : t * 0.3)) * r * 0.8); ctx.stroke();
            if (frozen) { ctx.strokeStyle = 'rgba(210,235,255,0.9)'; ctx.lineWidth = 1.5; for (let i = 0; i < enemyBullets.length; i++) { const b = enemyBullets[i]; if (b._fz) { ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(4, b.width * 0.7 + 2), 0, TAU); ctx.stroke(); } } }
        }
    });

    // ---- 6 · Coloso del Reloj: PÉNDULO GIGANTE (una hoz que barre la pantalla) -----------------
    function pendulumDraw(ev, alpha, ang, L, px, py) {
        const tx = px + S(ang) * L, ty = py + C(ang) * L;
        ctx.save(); ctx.globalAlpha = alpha; ctx.lineCap = 'round';
        ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 14; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.strokeStyle = '#c8962a'; ctx.lineWidth = 8; ctx.stroke();
        const g = ctx.createRadialGradient(tx - 10, ty - 10, 4, tx, ty, 38); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.6, '#e0a830'); g.addColorStop(1, '#8a5a10');
        ctx.fillStyle = g; ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(tx, ty, 38, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.save(); ctx.translate(tx, ty); ctx.rotate(ang * 3); ctx.strokeStyle = '#2a1a08'; ctx.lineWidth = 3;
        for (let i = 0; i < 8; i++) { const a = i * TAU / 8; ctx.beginPath(); ctx.moveTo(C(a) * 14, S(a) * 14); ctx.lineTo(C(a) * 30, S(a) * 30); ctx.stroke(); } ctx.restore();
        ctx.fillStyle = '#8a5a10'; ctx.beginPath(); ctx.arc(px, py + 10, 22, 0, TAU); ctx.fill(); ctx.stroke();
        ctx.restore();
    }
    def('pendulum', {
        name: 'PÉNDULO GIGANTE', hint: '¡Cruza cuando se aleje de ti!', color: '#ffcf5c', warn: 80, dur: 540, tag: '¡CUIDADO CON EL PÉNDULO!',
        warnUnder(ev) { const L = Math.min(playAreaH * 0.88, 650); pendulumDraw(ev, 0.28, 0.6 * S(ev.t * 0.03), L, playAreaW / 2, -14); },
        start(ev) { const d = ev.d; d.L = Math.min(playAreaH * 0.88, 650); d.px = playAreaW / 2; d.py = -14; d.ang = 0; d.w = 0.03; },
        tick(ev) {
            const d = ev.d, A = lerp(0.55, 0.85, Math.min(1, ev.t / 220)) * Math.min(1, 0.4 + ev.t / 60);
            d.ang = A * S(ev.t * d.w);
            const tx = d.px + S(d.ang) * d.L, ty = d.py + C(d.ang) * d.L, sx = d.px + S(d.ang) * d.L * 0.72, sy = d.py + C(d.ang) * d.L * 0.72;
            if (Math.hypot(pcx() - tx, pcy() - ty) < 42 || distSeg(pcx(), pcy(), sx, sy, tx, ty) < 10) hurt();
            if (ev.t % 105 === 0) { screenShake = Math.max(screenShake, 4); beep(130, 0.2, 'square', 0.05, 90); }          // "tic-tac"
        },
        under(ev) { const d = ev.d; pendulumDraw(ev, Math.min(1, ev.t / 20, (ev.def.dur - ev.t) / 20), d.ang, d.L, d.px, d.py); }
    });

    // ---- 7 · Ojo Gigante: LÁGRIMAS DE SANGRE (charcos que van quitando espacio) ---------------
    def('blood_tears', {
        name: 'LÁGRIMAS DE SANGRE', hint: '¡Evita los charcos que dejan!', color: '#ff2d4a', warn: 70, dur: 620, tag: '¡EL SUELO SE LLENA DE SANGRE!',
        start(ev) { ev.d.t = []; ev.d.p = []; ev.d.n = 0; },
        tick(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, gy = H - 26, o = ev.owner;
            if (d.n < 9 && ev.t % 50 === 1) { d.t.push({ x: clamp(pcx() + R(-130, 130), 40, W - 40), t: 0, y: o.y + o.height * 0.72 }); d.n++; beep(200, 0.25, 'sine', 0.06, 120); }
            for (let i = d.t.length - 1; i >= 0; i--) {
                const q = d.t[i]; q.t++;
                if (q.t > 40) q.y += 10;
                if (q.y >= gy) {                                                          // salpica y deja un charco
                    if (d.p.length < 7) d.p.push({ x: q.x, r: 0, life: 260 });
                    for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k - 2) * 0.55; fire(bl(q.x, gy - 6, C(a) * 3, S(a) * 3, '#ff2d4a', 'drop')); }
                    createExplosion(q.x, gy, '#ff2d4a', 12, true); screenShake = Math.max(screenShake, 5); beep(100, 0.15, 'square', 0.05, 50); d.t.splice(i, 1);
                }
            }
            for (let i = d.p.length - 1; i >= 0; i--) {
                const p = d.p[i]; p.life--; p.r = lerp(p.r, 46, 0.12);
                if (Math.hypot(pcx() - p.x, pcy() - (gy - 2)) < p.r * 0.85 + 5 && p.life > 12) hurt();
                if (p.life <= 0) d.p.splice(i, 1);
            }
            if (d.n >= 9 && !d.t.length && !d.p.length) endNow(ev);
        },
        under(ev) {
            const d = ev.d, H = playAreaH, gy = H - 26;
            d.t.forEach(q => {
                if (q.t <= 40) { ctx.strokeStyle = 'rgba(255,45,74,' + (0.4 + 0.5 * S(q.t * 0.6)) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(q.x, gy, 30 - q.t * 0.3, 10, 0, 0, TAU); ctx.stroke(); }
                else { ctx.fillStyle = '#c01030'; ctx.strokeStyle = '#3a0010'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(q.x, q.y - 22); ctx.quadraticCurveTo(q.x + 13, q.y + 2, q.x, q.y + 10); ctx.quadraticCurveTo(q.x - 13, q.y + 2, q.x, q.y - 22); ctx.fill(); ctx.stroke(); }
            });
            d.p.forEach(p => {
                const a = Math.min(1, p.life / 40);
                ctx.globalAlpha = 0.95 * a; ctx.fillStyle = '#6a0a1a'; ctx.strokeStyle = '#ff2d4a'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.ellipse(p.x, gy, p.r, p.r * 0.38, 0, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.fillStyle = 'rgba(255,170,180,0.5)'; ctx.beginPath(); ctx.ellipse(p.x - p.r * 0.3, gy - 3, p.r * 0.22, p.r * 0.08, 0, 0, TAU); ctx.fill();
                ctx.globalAlpha = 1;
            });
        }
    });

    // ---- 7 · Ojo Gigante: MIRADA ASESINA (rayo que te apunta, se fija y dispara) ---------------
    const GAZE_T0 = [1, 165, 330, 495];
    def('gaze', {
        name: 'MIRADA ASESINA', hint: '¡Sal de la línea cuando se ponga blanca!', color: '#ff5a78', warn: 80, dur: 650, tag: '¡NO TE QUEDES EN LA LÍNEA!',
        start(ev) { ev.d.s = []; ev.d.n = K() >= 1.3 ? 4 : 3; },
        tick(ev) {
            const d = ev.d, o = ev.owner, ex = o.x + o.width / 2, ey = o.y + o.height / 2;
            let allDone = true;
            for (let i = 0; i < d.n; i++) {
                const tt = ev.t - GAZE_T0[i];
                if (tt < 140) allDone = false;
                if (tt === 0) { d.s[i] = { ang: Math.atan2(pcy() - ey, pcx() - ex), lock: false, fire: 0 }; beep(1000, 0.3, 'sawtooth', 0.03, 1500); }
                const s = d.s[i]; if (!s) continue;
                if (tt > 0 && tt < 90) { const tg = Math.atan2(pcy() - ey, pcx() - ex), da = ((tg - s.ang + Math.PI * 3) % TAU) - Math.PI; s.ang += da * 0.07; }
                if (tt === 90) { s.lock = true; beep(1400, 0.12, 'square', 0.05); }
                if (tt === 112) { s.fire = 1; screenShake = Math.max(screenShake, 12); beep(110, 0.4, 'sawtooth', 0.09, 50); }
                if (tt >= 112 && tt < 134) { if (distSeg(pcx(), pcy(), ex, ey, ex + C(s.ang) * 2400, ey + S(s.ang) * 2400) < 20) hurt(); s.fire = 1 - (tt - 112) / 26; }
                if (tt >= 134) s.fire = 0;
            }
            if (allDone) endNow(ev);
        },
        over(ev) {
            const d = ev.d, o = ev.owner, ex = o.x + o.width / 2, ey = o.y + o.height / 2;
            d.s.forEach((s, i) => {
                if (!s) return;
                const tt = ev.t - GAZE_T0[i]; if (tt < 0 || tt > 140) return;
                const ex2 = ex + C(s.ang) * 2400, ey2 = ey + S(s.ang) * 2400;
                ctx.lineCap = 'round';
                if (tt < 112) {
                    ctx.strokeStyle = s.lock ? (Math.floor(tt / 3) % 2 ? '#fff' : '#ff5a78') : 'rgba(255,90,120,0.55)'; ctx.lineWidth = s.lock ? 4 : 2;
                    ctx.setLineDash(s.lock ? [] : [16, 12]); ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex2, ey2); ctx.stroke(); ctx.setLineDash([]);
                } else if (s.fire > 0) {
                    glow(ex + C(s.ang) * 160, ey + S(s.ang) * 160, 120, '#ff2d4a', 0.5 * s.fire);
                    ctx.strokeStyle = 'rgba(255,45,74,' + (0.85 * s.fire) + ')'; ctx.lineWidth = 40; ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex2, ey2); ctx.stroke();
                    ctx.strokeStyle = 'rgba(255,255,255,' + s.fire + ')'; ctx.lineWidth = 14; ctx.stroke();
                }
            });
        }
    });

    // ==========================================================================================
    //  JEFE SECRETO · EL INVASOR
    // ==========================================================================================
    function brightBullets(alpha, minDist) {
        ctx.lineWidth = 1.5;
        for (let i = 0; i < enemyBullets.length; i++) {
            const b = enemyBullets[i]; if (minDist && Math.hypot(b.x - pcx(), b.y - pcy()) < minDist) continue;
            ctx.globalAlpha = alpha; ctx.fillStyle = b.color || '#fff'; ctx.strokeStyle = '#fff';
            ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(3, b.width * 0.55 + 1.5), 0, TAU); ctx.fill(); ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ---- ¡BONUS STAGE! (premio: recoge todos los puntos antes de que se acabe el tiempo) --------
    def('bonus', {
        name: '¡BONUS STAGE!', hint: '¡Recoge los 12 puntos a tiempo!', color: '#ffe14d', warn: 60, dur: 560, tag: ev => 'PUNTOS ' + ev.d.got + '/' + ev.d.N,
        start(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH; d.N = 12; d.got = 0; d.p = [];
            for (let i = 0; i < d.N; i++) d.p.push({ x: W * (0.1 + 0.8 * i / (d.N - 1)), y: clamp(H * (0.62 + 0.13 * S(i * 0.95 + R(0, 0.6))), 120, H - 40) });
            beep(660, 0.1, 'square', 0.06); setTimeout(() => beep(880, 0.1, 'square', 0.06), 110); setTimeout(() => beep(1320, 0.2, 'square', 0.06), 220);
        },
        tick(ev) {
            const d = ev.d, o = ev.owner;
            for (let i = d.p.length - 1; i >= 0; i--) {
                const p = d.p[i];
                if (Math.hypot(p.x - pcx(), p.y - pcy()) < 24) { d.p.splice(i, 1); d.got++; score += 100; beep(480 + d.got * 70, 0.07, 'square', 0.06); createExplosion(p.x, p.y, '#ffe14d', 6, true); }
            }
            if (!d.p.length && !d.done) {
                d.done = true; score += 3000; powerUps.shield = Math.max(powerUps.shield, Date.now() + 4000);
                try { if (o.pop) o.pop(o.cx, o.bottom + 20, '+3000'); } catch (e) {}
                say(o, '¡NO! ¡MIS PUNTOS!', 110);
                [523, 659, 784, 1047].forEach((f, k) => setTimeout(() => beep(f, 0.14, 'square', 0.06), k * 90));
                d.fin = ev.t + 40;
            }
            if (d.fin && ev.t >= d.fin) endNow(ev);
            if (ev.t === ev.def.dur - 1 && !d.done) say(o, '¡TARDE, PILOTO!', 90);
        },
        under(ev) {
            const d = ev.d;
            d.p.forEach((p, i) => { const s = 8 + (Math.floor(ev.t / 8 + i) % 2) * 2; glow(p.x, p.y, 20, '#ffe14d', 0.5); ctx.fillStyle = '#ffe14d'; ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s); });
        },
        over(ev) {
            const d = ev.d, W = playAreaW, H = playAreaH, left = 1 - ev.t / ev.def.dur;
            ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(W * 0.2 - 3, H - 30, W * 0.6 + 6, 12);
            ctx.fillStyle = left < 0.25 ? '#ff5a5a' : '#ffe14d'; ctx.fillRect(W * 0.2, H - 27, W * 0.6 * left, 6);
        }
    });

    // ---- ¿GAME OVER? (broma: pantalla de fin falsa; eres invulnerable mientras dura) -----------
    def('fake_go', {
        name: '¿GAME OVER?', hint: '', color: '#fff', warn: 0, silent: true, dur: 160,
        start(ev) {
            invulnerableUntil = Math.max(invulnerableUntil, Date.now() + 3000);
            [440, 392, 349, 294].forEach((f, k) => setTimeout(() => beep(f, 0.22, 'square', 0.06), k * 200));
            say(ev.owner, '¡FIN DEL JUEGO, PILOTO!', 110);
        },
        tick(ev) {
            if (ev.t === 118) { say(ev.owner, '¡JA, JA! ¡ERA BROMA!', 90); [523, 659, 784].forEach((f, k) => setTimeout(() => beep(f, 0.12, 'square', 0.06), k * 80)); }
        },
        over(ev) {
            const W = playAreaW, H = playAreaH, t = ev.t, a = t < 118 ? Math.min(0.82, t / 8) : Math.max(0, 0.82 * (1 - (t - 118) / 20));
            ctx.fillStyle = 'rgba(0,0,0,' + a + ')'; ctx.fillRect(0, 0, W, H);
            ctx.fillStyle = 'rgba(255,255,255,' + (0.05 * (a / 0.82)) + ')'; for (let y = (t * 2) % 6; y < H; y += 6) ctx.fillRect(0, y, W, 2);          // líneas CRT
            brightBullets(0.9 * Math.min(1, a / 0.4));
            ctx.textAlign = 'center';
            if (t < 118) {
                ctx.fillStyle = '#fff'; ctx.font = FONT(Math.max(16, Math.min(34, W / 18))); ctx.fillText('GAME OVER', W / 2, H * 0.45);
                ctx.font = FONT(12); ctx.fillStyle = '#ffe14d'; ctx.fillText('CONTINUE?  ' + Math.max(2, 9 - Math.floor(t / 14)), W / 2, H * 0.45 + 40);
            } else {
                ctx.globalAlpha = Math.min(1, (160 - t) / 20); ctx.fillStyle = '#ffe14d'; ctx.font = FONT(14); ctx.fillText('¡¡TE LO CREÍSTE!!', W / 2, H * 0.45); ctx.globalAlpha = 1;
            }
        }
    });

    console.log('[BossEvents] ' + Object.keys(BE.defs).length + ' mini eventos de jefes cargados. Prueba uno con BossEvents.start("frost")');
})();
