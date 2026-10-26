/* ===== combo.js ===== */
// ============================================================================================
//  COMBO ESTILO DEVIL MAY CRY + MODO ARCOÍRIS  ·  v34
// --------------------------------------------------------------------------------------------
//  · Cada enemigo que derrotas suma al COMBO. Rozar balas (graze) lo mantiene vivo. Si pasan 2.5 s sin kills se acaba
//    (y cobras un bonus de puntos); si te golpean, ¡COMBO BREAK!
//  · RANGOS como en DMC:  D · C · B · A · S · SS · SSS  (3 / 8 / 15 / 25 / 40 / 60 / 80 kills), cada uno con su palabra,
//    color, temblor y sonido. La letra "salta" con cada kill, hay un tajo detrás y una barra de tiempo que se vacía.
//  · Al llegar a x50 (y cada 50 después):  ★ MODO ARCOÍRIS ★  durante 12 s
//        - la pantalla de juego se tiñe de arcoíris que se desliza, con marco brillante y confeti que sube
//        - PREMIO: escudo + disparo doble + súper disparo + 1 bomba + lluvia de power-ups (incluidos los de Caos)
//        - el combo no se acaba mientras dura
//  v38 · el tinte arcoíris ahora es TRANSPARENTE (centro casi limpio, el color se concentra hacia los bordes) para ver bien las balas y
//        los enemigos, y el modo dura 20 s e incluye SEGADORES insta-kill, HORDAS rápidas con gemas y ENEMIGOS DORADOS x2 (arcoiris_extra.js).
//  · OPTIMIZADO: el arcoíris y el marco son una capa CSS animada (transform + keyframes, la compone la GPU: el lienzo
//    no pinta ni un píxel extra), sin shadowBlur, confeti limitado (26 / 10 en bajo rendimiento) y, en ese modo, sin mezcla de color.
//
//  v35 · COMBO + JEFES
//  · El combo NO baja durante las cinemáticas (llegada de nivel, presentación y aviso del jefe/mini jefe, choque de poderes,
//    créditos, pantalla de nivel completado) ni cuando no hay ningún enemigo en pantalla entre fases.
//  · Mientras peleas con un MINI JEFE o un JEFE aparecen enemigos pequeños (1 golpe, inofensivos) para que puedas seguir
//    sumando combo. Disparar al jefe también mantiene el combo vivo (cada impacto rellena la barra de tiempo).
//  · Al matar a un mini jefe o a un jefe, el combo se MULTIPLICA x2.
//  · Cada 10 de combo (10, 20, 30, 40...): +0.10 de daño a los disparos de tus partners (mientras dure el combo).
//  · (v36: se ELIMINARON los poderes únicos de combo — Imán, Láser, Satélites y Furia. Solo queda el bonus a los partners.)
//  Se carga DESPUÉS de juego.js. Ajusta las constantes de abajo. Si quitas el <script>, el juego sigue igual.
// ============================================================================================
(function () {
    'use strict';
    if (typeof Extras === 'undefined' || typeof Extras.onKill !== 'function' || typeof window.drawHud !== 'function') return;

    // ---------------------------------------------------------------- ajustes
    const WIN = 150;                 // cuadros para mantener el combo entre kills (150 = 2.5 s)
    const RAINBOW_AT = 50;           // combo que activa el Modo Arcoíris (y cada múltiplo)
    const RAINBOW_FRAMES = 1200;     // duración (20 s a 60 fps). v38: más larga para que quepan los segadores, la horda y los dorados
    const END_BONUS = true;          // al terminar un combo cobras n*n puntos (x20 = 400, x50 = 2500)
    const RANKS = [
        { n: 3, l: 'D', w: '¡BIEN!', c: '#9aa6b8' }, { n: 8, l: 'C', w: '¡GENIAL!', c: '#4ad0ff' }, { n: 15, l: 'B', w: '¡BRUTAL!', c: '#5aff8a' },
        { n: 25, l: 'A', w: '¡SALVAJE!', c: '#ffd23a' }, { n: 40, l: 'S', w: '¡DEMENCIAL!', c: '#ff8a2a' }, { n: 60, l: 'SS', w: '¡LEGENDARIO!', c: '#ff3a8a' },
        { n: 80, l: 'SSS', w: '¡DIVINO!', c: 'rainbow' }
    ];

    // --- v35: jefes, partners y poderes de combo
    const BOSS_KILL_MULT = 2;            // al matar mini jefe / jefe el combo se multiplica por esto
    const TEN_STEP = 10;                 // cada cuántos combos suben los partners
    const PARTNER_POWER_STEP = 0.10;      // v36: daño extra por disparo de partner en cada escalón de 10 combos (antes 0.5; su daño base es 0.3)
    const PARTNER_BONUS_MAX = 3.0;        // v36: tope del bonus total (3.0 = llega a x30 combos y ahí se queda). Pon Infinity para quitarlo
    const PARTNER_KEEP_TIER = false;     // false = el bonus baja si pierdes el combo · true = se conserva en toda la partida
    const FODDER_INTERVAL = 70;          // cuadros entre enemigos pequeños durante jefes (70 = 1.2 s)
    const FODDER_MAX = 3;                // máximo a la vez
    const FODDER_SIZE = 46;              // tamaño (px)
    const FREEZE_WITHOUT_ENEMIES = true; // el combo no corre si no hay ningún enemigo en pantalla durante las oleadas

    const TAU = Math.PI * 2, S = Math.sin, C0 = Math.cos;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const low = () => (typeof performanceMode !== 'undefined' && performanceMode);
    const PW = () => playAreaW, PH = () => playAreaH;
    const HUE = []; for (let i = 0; i < 360; i += 5) HUE.push('hsl(' + i + ',100%,60%)');
    const hue = (h) => HUE[Math.floor(((h % 360) + 360) % 360 / 5)];
    const rankCol = (r, t) => (r && r.c === 'rainbow') ? hue(t * 6) : (r ? r.c : '#fff');

    const C = { alive: false, n: 0, t: 0, disp: 0, pop: 0, ri: -1, flash: 0, word: '', wordT: 0, wordCol: '#fff', breakT: 0, breakN: 0, endT: 0, endN: 0, endBonus: 0,
        gz: 0, lives: 0, rainbow: 0, nextRb: RAINBOW_AT, rbBanner: 0, frame: 0, sparks: [], shakeX: 0, shakeY: 0, slash: 0, ms: 0,
        tier: 0, lostT: 0, pbT: 0, fz: false, hr: [null, null], hp: [0, 0] };
    const fodder = [];                     // enemigos pequeños que aparecen durante los jefes
    let fodderT = 0;

    // ---------------------------------------------------------------- sonido (8 bits, bajito)
    function beep(f0, f1, dur, type, vol) {
        try {
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t0 = audioCtx.currentTime;
            o.type = type || 'square'; o.connect(g); g.connect(audioCtx.destination);
            o.frequency.setValueAtTime(f0, t0); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1 || f0), t0 + dur);
            g.gain.setValueAtTime(vol || 0.03, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); o.start(t0); o.stop(t0 + dur + 0.02);
        } catch (e) {}
    }
    const arpeggio = (base, steps) => steps.forEach((m, i) => setTimeout(() => beep(base * m, base * m, 0.09, 'square', 0.035), i * 70));

    // ---------------------------------------------------------------- lógica del combo
    function rankIdx(n) { let r = -1; for (let i = 0; i < RANKS.length; i++) if (n >= RANKS[i].n) r = i; return r; }
    function reset() { C.n = 0; C.t = 0; C.disp = 0; C.ri = -1; C.flash = 0; C.wordT = 0; C.breakT = 0; C.endT = 0; C.rainbow = 0; C.nextRb = RAINBOW_AT; C.gz = 0; C.sparks.length = 0; C.lives = (typeof lives !== 'undefined') ? lives : 0;
        C.tier = 0; C.lostT = 0; C.pbT = 0; C.hr = [null, null]; C.hp = [0, 0]; fodder.length = 0; fodderT = 0; }
    // Se llama cada vez que C.n sube (kill, graze, multiplicador de jefe): rango, hitos de 10, poderes de 25 y arcoíris.
    function afterAdvance(old) {
        const n = C.n, ri = rankIdx(n), a10 = Math.floor(old / TEN_STEP), b10 = Math.floor(n / TEN_STEP);
        if (ri > C.ri) {                                   // ¡subida de rango!
            C.ri = ri; C.flash = 1; C.word = RANKS[ri].w; C.wordT = 70; C.wordCol = RANKS[ri].c; C.slash = 1;
            screenShake = Math.max(screenShake, 4 + ri * 2);
            arpeggio(300 + ri * 40, [1, 1.25, 1.5, 2].slice(0, 2 + Math.min(2, ri)));
        } else if (b10 > a10) { C.word = 'x' + (b10 * TEN_STEP) + '!'; C.wordT = 50; C.wordCol = rankCol(RANKS[Math.max(0, C.ri)], C.frame); C.flash = 0.6; screenShake = Math.max(screenShake, 5); beep(700, 1100, 0.12, 'square', 0.035); }
        if (b10 > a10) { C.tier = Math.max(C.tier, b10); C.pbT = 100; beep(900, 1500, 0.1, 'triangle', 0.035); }          // partners +0.5
        let go = false; while (C.n >= C.nextRb) { C.nextRb += RAINBOW_AT; go = true; }
        if (go) startRainbow();
    }
    function kill() {
        const old = C.n;
        C.n++; C.t = C.rainbow > 0 ? WIN * 2 : WIN; C.pop = 1; C.ms = 1;
        beep(380 + Math.min(C.n, 60) * 14, 520 + Math.min(C.n, 60) * 18, 0.05, 'square', 0.022);
        afterAdvance(old);
    }
    function graze() { C.gz++; if (C.n > 0) { C.t = Math.min(C.rainbow > 0 ? WIN * 2 : WIN, C.t + 20); if (C.gz % 6 === 0) { const o = C.n; C.n++; C.pop = 0.6; afterAdvance(o); } } }
    function breakCombo() {
        if (C.n >= 5) { C.breakT = 60; C.breakN = C.n; beep(220, 70, 0.3, 'sawtooth', 0.05); screenShake = Math.max(screenShake, 8); }
        C.n = 0; C.t = 0; C.ri = -1; C.flash = 0;
    }
    function endCombo() {
        if (C.n >= 5 && END_BONUS) { const b = C.n * C.n; score += b; C.endBonus = b; }
        if (C.n >= 5) { C.endT = 70; C.endN = C.n; }
        C.n = 0; C.ri = -1;
    }
    function startRainbow() {
        C.rainbow = RAINBOW_FRAMES; C.rbBanner = 130; C.flash = 1; C.word = '¡MODO ARCOÍRIS!'; C.wordT = 100; C.wordCol = '#fff';
        const now = Date.now();
        powerUps.shield = Math.max(powerUps.shield, now + 20000);
        powerUps.doubleFire = Math.max(powerUps.doubleFire, now + 20000);
        powerUps.superShot = Math.max(powerUps.superShot, now + 16000);
        try { if (typeof setBombStock === 'function' && bombStock < BOMB_MAX) setBombStock(bombStock + 1); } catch (e) {}
        try {                                                  // lluvia de power-ups (los de siempre y los de Caos)
            if (typeof Item === 'function' && Array.isArray(items)) for (let i = 0; i < 5; i++) { const it = new Item(30 + (PW() - 60) * (i + 0.5) / 5, -20 - i * 38); it.vy = 2.1; items.push(it); }
        } catch (e) {}
        screenShake = Math.max(screenShake, 14);
        arpeggio(262, [1, 1.25, 1.5, 2, 2.5, 3]);
        try { if (window.ArcoirisExtra) ArcoirisExtra.start(); } catch (e) {}      // v38: segadores, horda y dorados
    }


    // ================================================================ v35 · PARTNERS, PODERES ÚNICOS, JEFES
    // daño extra de los disparos de partners (juego.js / invasor.js / eventos_jefes.js lo suman al daño base)
    function partnerBonus() {
        if (!C.alive) return 0;
        const tier = PARTNER_KEEP_TIER ? C.tier : (C.n > 0 ? Math.floor(C.n / TEN_STEP) : 0);
        return Math.min(PARTNER_BONUS_MAX, tier * PARTNER_POWER_STEP);
    }
    // al matar un jefe: el combo se multiplica
    function multiplyCombo(k, label) {
        if (C.n <= 0) return;
        const old = C.n;
        C.n = Math.round(C.n * k); C.t = Math.max(C.t, C.rainbow > 0 ? WIN * 2 : WIN); C.pop = 1.5; C.flash = 1; C.slash = 1;
        afterAdvance(old);
        C.word = label + ' x' + C.n; C.wordT = 70; C.wordCol = '#ffe14a'; screenShake = Math.max(screenShake, 12);
        arpeggio(392, [1, 1.25, 1.5, 2, 2.5, 3]);
    }
    function bossKilled(mini) { if (C.alive) multiplyCombo(BOSS_KILL_MULT, mini ? 'MINI JEFE' : 'JEFE'); }

    // ¿el combo debe quedarse congelado? (cinemáticas, presentaciones, pantallas de transición, sin enemigos entre fases)
    function frozen() {
        try {
            if (typeof Cine !== 'undefined' && Cine.arrivalActive && Cine.arrivalActive()) return true;
            if (typeof Cine !== 'undefined' && Cine.exitActive && Cine.exitActive()) return true;
            if (window.Choque && Choque.active && Choque.active()) return true;
            if (Extras.busy && Extras.busy()) return true;
            if (gameStartTimer > 0 || reviveAnim || levelCompleteActive) return true;
            if (bossIntroTimer > 0 || miniBossAnnounceTimer > 0) return true;
            if (activeBoss && (activeBoss.state !== 'active' || activeBoss.mode === 'enter')) return true;           // presentación, aviso de ataque especial, muerte
            if (activeMiniBoss && (activeMiniBoss.state !== 'active' || activeMiniBoss.mode === 'enter')) return true;
            if (FREEZE_WITHOUT_ENEMIES && !activeBoss && !activeMiniBoss && (levelPhase === 'wave1' || levelPhase === 'wave2') && enemies.length === 0) return true;
        } catch (e) {}
        return false;
    }
    // disparar al jefe / mini jefe mantiene el combo: cada impacto (baja su vida) rellena la barra de tiempo
    function watchBosses() {
        const refs = [activeBoss, activeMiniBoss];
        for (let i = 0; i < 2; i++) {
            const b = refs[i];
            if (!b) { C.hr[i] = null; continue; }
            if (C.hr[i] !== b) { C.hr[i] = b; C.hp[i] = b.hp; continue; }
            if (b.hp < C.hp[i] && b.state !== 'dead' && C.n > 0) C.t = Math.max(C.t, C.rainbow > 0 ? WIN * 2 : WIN);
            C.hp[i] = b.hp;
        }
    }

    // ---------------------------------------------------------------- enemigos pequeños durante jefes (para sumar combo)
    function clearFodder(boom) {
        if (boom) fodder.forEach(e => { try { createExplosion(e.x + e.width / 2, e.y + e.height / 2, '#fff', 18); } catch (er) {} });
        fodder.length = 0;
    }
    function fodderStep() {
        const b = activeBoss, m = activeMiniBoss;
        const host = (b && b.state === 'active' && b.mode !== 'enter') ? b : ((!b && m && m.state === 'active') ? m : null);
        const choque = !!(window.Choque && Choque.active && Choque.active());
        if (!host || choque) { if (fodder.length) clearFodder(!choque); fodderT = 0; return; }
        if (++fodderT >= FODDER_INTERVAL && fodder.length < FODDER_MAX && !frozen()) {
            fodderT = 0;
            const e = new Enemy(24 + Math.random() * Math.max(10, PW() - 48 - FODDER_SIZE), -FODDER_SIZE, 3, currentLevelIndex());
            e.width = e.height = FODDER_SIZE; e.hp = 1; e.isMinion = true; e.isFodder = true;
            e.vy = Math.max(1.5, Math.min(2.6, e.vy));
            fodder.push(e);
        }
        const bomb = (typeof bombEffect !== 'undefined' && bombEffect && bombEffect.active && typeof bombEffect.radius === 'number') ? bombEffect : null;
        for (let i = fodder.length - 1; i >= 0; i--) {
            const e = fodder[i];
            e.update(); e.draw(currentEnemyFrame);
            let dead = false;
            for (let j = bullets.length - 1; j >= 0; j--) {
                const bl = bullets[j];
                if (bl.isEnemy) continue;
                if (bl.pierce && bl.hitList && bl.hitList.includes(e)) continue;
                if (bl.x < e.x + e.width && bl.x + bl.width > e.x && bl.y < e.y + e.height && bl.y + bl.height > e.y) {
                    if (bl.pierce) { if (!bl.hitList) bl.hitList = []; bl.hitList.push(e); } else bullets.splice(j, 1);
                    dead = true; break;
                }
            }
            if (!dead && bomb && Math.hypot(e.x + e.width / 2 - bomb.x, e.y + e.height / 2 - bomb.y) < bomb.radius) dead = true;
            if (dead) {
                createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 60);
                score += 60; levelEnemiesDefeated++;
                try { if (Math.random() < 0.5) pointItems.push(new PointItem(e.x + e.width / 2, e.y + e.height / 2, 'pixel')); } catch (er) {}
                fodder.splice(i, 1);
                Extras.onKill();                                      // -> kill(): suma combo
                continue;
            }
            if (e.y > PH() + 10) fodder.splice(i, 1);
        }
    }

    // ---------------------------------------------------------------- poderes únicos de combo (efecto + dibujo)
    function perksFrame() {
        if (typeof player === 'undefined' || !player) return;
        if (typeof Cine !== 'undefined' && Cine.hidesPlayer && Cine.hidesPlayer()) return;
        const t = C.frame, pb = partnerBonus();

        // anillos en los partners: más grandes cuanto más bonus
        if (pb > 0 && C.n > 0 && typeof partners !== 'undefined' && partners.length) {
            ctx.save(); ctx.strokeStyle = '#7fe0ff'; ctx.lineWidth = 1.5; ctx.globalAlpha = Math.min(0.85, 0.3 + pb * 0.2);
            partners.forEach(q => { ctx.beginPath(); ctx.arc(q.x, q.y, 12 + S(t * 0.2 + q.x) * 1.5 + Math.min(6, pb * 2), 0, TAU); ctx.stroke(); });
            ctx.restore();
        }
    }
    function drawPerks() {
        const W = PW(), H = PH(), t = C.frame;
        ctx.save(); ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.font = '8px "Press Start 2P", monospace';
        let y = 160; const pb = partnerBonus();
        if (C.n > 0 && pb > 0) { ctx.globalAlpha = C.pbT > 0 ? 1 : 0.85; outlineText('PARTNERS +' + pb.toFixed(2) + (C.pbT > 0 ? ' UP!' : ''), 10, y, C.pbT > 0 ? '#fff' : '#7fe0ff', '#12000a', 3); y += 14; }
        ctx.globalAlpha = 0.95;
        ctx.restore();
    }

    // ---------------------------------------------------------------- ganchos v35 (no hace falta tocar nada más en juego.js)
    // · Al matar un mini jefe / jefe: combo x2 (solo si de verdad pasa a "dead"; el choque de poderes puede retrasar la muerte)
    if (typeof window.defeatBoss === 'function') {
        const _d = window.defeatBoss;
        window.defeatBoss = function (boss) { const was = boss && boss.state; const r = _d.apply(this, arguments); try { if (boss && was !== 'dead' && boss.state === 'dead') bossKilled(false); } catch (e) {} return r; };
    }
    if (typeof window.defeatMiniBoss === 'function') {
        const _m = window.defeatMiniBoss;
        window.defeatMiniBoss = function () { const m = activeMiniBoss, was = m && m.state; const r = _m.apply(this, arguments); try { if (m && was !== 'dead' && m.state === 'dead') bossKilled(true); } catch (e) {} return r; };
    }

    // ---------------------------------------------------------------- ENGANCHES
    const _k = Extras.onKill; Extras.onKill = function () { try { kill(); } catch (e) {} return _k.apply(this, arguments); };
    const _g = Extras.onGraze; Extras.onGraze = function () { try { graze(); } catch (e) {} return _g.apply(this, arguments); };
    setInterval(() => { if (typeof isPlaying !== 'undefined' && !isPlaying) { C.alive = false; C.rainbow = 0; fodder.length = 0; hideFx(); } }, 400);

    function tick() {
        C.frame++;
        if (!C.alive) { reset(); C.alive = true; }
        if (lives < C.lives) breakCombo();
        C.lives = lives;
        const fz = frozen(); C.fz = fz;                      // v35: congelado en cinemáticas / transiciones
        watchBosses();                                       // v35: golpear al jefe mantiene el combo
        if (C.n > 0 && C.rainbow <= 0 && !fz && --C.t <= 0) endCombo();
        C.pop *= 0.84; C.flash *= 0.9; C.ms *= 0.9; C.slash *= 0.93;
        if (C.wordT > 0) C.wordT--; if (C.breakT > 0) C.breakT--; if (C.endT > 0) C.endT--; if (C.rbBanner > 0) C.rbBanner--; if (C.lostT > 0) C.lostT--; if (C.pbT > 0) C.pbT--;
        C.disp += (C.n - C.disp) * 0.35; if (Math.abs(C.n - C.disp) < 0.05) C.disp = C.n;
        if (C.rainbow > 0) { C.rainbow--; if (C.rainbow === 0) { C.wordT = 0; } }
        const ri = Math.max(0, C.ri), amp = C.n > 0 ? (0.3 + ri * 0.45) * (1 + C.pop * 2.2) : 0;
        C.shakeX = (Math.random() - 0.5) * amp * 2; C.shakeY = (Math.random() - 0.5) * amp * 2;
    }

    // ---------------------------------------------------------------- ARCOÍRIS: capa CSS animada (la pinta la GPU, el lienzo no gasta nada)
    let FX = null, fxLast = 0;
    function ensureFx() {
        if (FX) return FX;
        const st = document.createElement('style');
        st.textContent = '#rbFx{position:fixed;pointer-events:none;z-index:3;overflow:hidden;opacity:0;transition:opacity .45s ease;display:none}' +
            '#rbFx.on{opacity:1}' +
            '#rbFx{-webkit-mask-image:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.12) 0%,rgba(0,0,0,.2) 45%,rgba(0,0,0,.85) 100%);mask-image:radial-gradient(ellipse at 50% 50%,rgba(0,0,0,.12) 0%,rgba(0,0,0,.2) 45%,rgba(0,0,0,.85) 100%)}' +
            '#rbFx .band{position:absolute;left:0;top:0;width:300%;height:100%;background:linear-gradient(90deg,#ff3355,#ff9a33,#ffee33,#33ee66,#33ccff,#6666ff,#dd44ff,#ff3355);background-size:33.3334% 100%;background-repeat:repeat-x;opacity:.22;animation:rbSlide 4.5s linear infinite;will-change:transform}' +
            '#rbFx.hi .band{mix-blend-mode:overlay;opacity:.5}' +
            '#rbFx .frame{position:absolute;left:0;top:0;right:0;bottom:0;border:4px solid #ff3355;box-sizing:border-box;box-shadow:inset 0 0 16px rgba(255,255,255,.22);animation:rbBorder 1.4s linear infinite}' +
            '@keyframes rbSlide{from{transform:translateX(0)}to{transform:translateX(-33.3334%)}}' +
            '@keyframes rbBorder{0%{border-color:#ff3355}16%{border-color:#ff9a33}33%{border-color:#ffee33}50%{border-color:#33ee66}66%{border-color:#33ccff}83%{border-color:#dd44ff}100%{border-color:#ff3355}}';
        document.head.appendChild(st);
        FX = document.createElement('div'); FX.id = 'rbFx'; FX.innerHTML = '<div class="band"></div><div class="frame"></div>'; document.body.appendChild(FX);
        return FX;
    }
    function placeFx() {                       // la capa cubre solo la zona de juego del lienzo (no el panel lateral)
        const cv = document.getElementById('gameCanvas') || canvas, r = cv.getBoundingClientRect(), k = r.width / cv.width;
        FX.style.left = r.left + 'px'; FX.style.top = r.top + 'px'; FX.style.width = Math.round(PW() * k) + 'px'; FX.style.height = Math.round(PH() * k) + 'px';
    }
    function hideFx() { if (FX && FX.classList.contains('on')) { FX.classList.remove('on'); setTimeout(() => { if (!FX.classList.contains('on')) FX.style.display = 'none'; }, 500); } }
    function drawRainbow() {
        const t = C.frame;
        if (C.rainbow <= 0) { hideFx(); return; }
        const fx = ensureFx();
        if (!fx.classList.contains('on')) { fx.style.display = 'block'; placeFx(); fx.classList.toggle('hi', !low()); void fx.offsetWidth; fx.classList.add('on'); }
        if (t - fxLast > 20) { fxLast = t; placeFx(); }
        if (C.rainbow < 40) fx.classList.remove('on');                                       // se desvanece al final
        // confeti que sube (único trabajo en el lienzo)
        const W = PW(), H = PH(), max = low() ? 10 : 26, k = Math.min(1, (RAINBOW_FRAMES - C.rainbow) / 24, C.rainbow / 40);
        if (C.sparks.length < max && t % 2 === 0) C.sparks.push({ x: Math.random() * W, y: H + 6, vy: -(1.4 + Math.random() * 2.6), vx: (Math.random() - 0.5) * 0.8, h: Math.random() * 360, s: 2 + Math.floor(Math.random() * 3) });
        ctx.save(); ctx.globalAlpha = 0.9 * k;
        for (let i = C.sparks.length - 1; i >= 0; i--) { const q = C.sparks[i]; q.y += q.vy; q.x += q.vx + S((q.y + i) * 0.05) * 0.4; if (q.y < -8) { C.sparks.splice(i, 1); continue; } ctx.fillStyle = hue(q.h + t * 4); ctx.fillRect(Math.round(q.x), Math.round(q.y), q.s, q.s); }
        ctx.restore();
    }

    // ---------------------------------------------------------------- HUD DEL COMBO
    function outlineText(txt, x, y, fill, stroke, w) { ctx.lineWidth = w || 4; ctx.strokeStyle = stroke || '#12000a'; ctx.strokeText(txt, x, y); ctx.fillStyle = fill; ctx.fillText(txt, x, y); }
    // v59: si el HUD del teléfono (vertical) crece (barra de efectos), el panel de combo baja para no tocarlo
    function hudSafe() { try { return (window.HudPhone && HudPhone.active()) ? HudPhone.safeTop() : 0; } catch (e) { return 0; } }
    function comboDy() { return Math.max(0, hudSafe() + 6 - 66); }
    function drawCombo() {
        const W = PW(), H = PH(), t = C.frame, ri = C.ri, r = ri >= 0 ? RANKS[ri] : null;
        ctx.save(); ctx.textAlign = 'left'; ctx.lineJoin = 'round';

        // --- panel principal (esquina izquierda) · ampliado ×1.3 para que se lea de un vistazo
        ctx.save(); ctx.translate(6, 70 + comboDy()); ctx.scale(0.8, 0.8); ctx.translate(-6, -84);   // v56: más chico y más arriba para no tapar el HUD
        if (C.n >= 1) {
            const col = rankCol(r || { c: '#9aa6b8' }, t), x0 = 8 + C.shakeX, y0 = 88 + C.shakeY, sc = 1 + C.pop * 0.55;
            const fade = C.t < 30 && C.rainbow <= 0 ? 0.55 + 0.45 * S(t * 0.5) : 1;
            ctx.globalAlpha = 0.95 * fade;
            // tajo diagonal detrás
            ctx.save(); ctx.translate(x0 + 70, y0 + 30); ctx.rotate(-0.12);
            ctx.fillStyle = 'rgba(14,0,10,0.62)'; ctx.fillRect(-72, -34, 150, 74);
            ctx.fillStyle = col; ctx.globalAlpha = 0.9 * fade; ctx.fillRect(-72, -34, 150, 3); ctx.fillRect(-72, 37, 150, 3);
            if (C.slash > 0.05) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = C.slash * 0.8; ctx.fillStyle = '#fff'; ctx.fillRect(-72 + (1 - C.slash) * 150, -34, 14, 74); }
            ctx.restore(); ctx.globalAlpha = 0.95 * fade;
            // letra de rango
            if (r) {
                const L = r.l, sz = L.length === 1 ? 46 : L.length === 2 ? 36 : 28;
                ctx.save(); ctx.translate(x0 + 14, y0 + 52); ctx.transform(1, 0, -0.2, 1, 0, 0);
                const ls = 1 + C.flash * 0.5 + C.pop * 0.18; ctx.scale(ls, ls);
                ctx.font = 'italic 900 ' + sz + 'px "Noto Serif JP","Cinzel",Impact,serif'; outlineText(L, 0, 0, col, '#12000a', 6);
                ctx.restore();
            }
            // COMBO xN
            ctx.save(); ctx.translate(x0 + (r ? 62 : 14), y0 + 32); ctx.scale(sc, sc);
            ctx.font = '8px "Press Start 2P", monospace'; outlineText('COMBO', 0, -12, '#fff', '#12000a', 3);
            ctx.font = '20px "Press Start 2P", monospace'; outlineText('x' + Math.round(C.disp), 0, 10, col, '#12000a', 5);
            ctx.restore();
            // palabra del rango
            if (r) { ctx.font = '7px "Press Start 2P", monospace'; ctx.globalAlpha = 0.9 * fade; outlineText(r.w, x0 + 64, y0 + 62, '#fff', '#12000a', 3); }
            // barra de tiempo
            const bw = 134, k = C.rainbow > 0 ? 1 : clamp(C.t / WIN, 0, 1);
            ctx.save(); ctx.translate(x0 - 2, y0 + 70); ctx.rotate(-0.12); ctx.globalAlpha = 0.95;
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(0, 0, bw, 6); ctx.fillStyle = col; ctx.fillRect(1, 1, (bw - 2) * k, 4);
            if (!low()) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.fillRect(1 + (bw - 2) * k - 3, 1, 3, 4); }
            ctx.restore();
        }

        // --- COMBO BREAK
        if (C.breakT > 0) {
            const k = 1 - C.breakT / 60, a = Math.min(1, C.breakT / 20), cx = 8 + 70, cy = 128;
            ctx.globalAlpha = a; ctx.font = '10px "Press Start 2P", monospace'; ctx.textAlign = 'center';
            ctx.save(); ctx.translate(cx - k * 24, cy + k * 30); ctx.rotate(-k * 0.5); outlineText('COMBO', 0, 0, '#ff4a4a', '#12000a', 4); ctx.restore();
            ctx.save(); ctx.translate(cx + k * 24 + 22, cy + 12 + k * 40); ctx.rotate(k * 0.5); outlineText('BREAK x' + C.breakN, 0, 0, '#ff9a9a', '#12000a', 4); ctx.restore();
        }
        // --- combo terminado: bonus
        if (C.endT > 0 && C.n === 0 && C.breakT === 0) {
            ctx.globalAlpha = Math.min(1, C.endT / 25); ctx.font = '8px "Press Start 2P", monospace'; ctx.textAlign = 'left';
            outlineText('COMBO x' + C.endN + (C.endBonus ? '  +' + C.endBonus : ''), 10, 128 - (70 - C.endT) * 0.25, '#ffe14a', '#12000a', 3);
        }

        ctx.restore();
        // --- palabra grande central (subida de rango, hitos, modo arcoíris)
        if (C.wordT > 0) {
            const k = 1 - C.wordT / (C.rainbow > 0 && C.word.charAt(1) === 'M' ? 100 : 70), a = Math.min(1, C.wordT / 18) * Math.min(1, (k + 0.05) * 6), cx = W / 2, cy = H * 0.3;
            const sc = 1 + Math.max(0, 0.35 - k * 1.2) * 3 + k * 0.1; ctx.save(); ctx.translate(cx, cy); ctx.scale(sc, sc); ctx.textAlign = 'center';
            ctx.globalAlpha = a; ctx.font = 'italic 900 ' + (C.word.length > 10 ? 22 : 28) + 'px "Noto Serif JP","Cinzel",Impact,serif'; ctx.transform(1, 0, -0.15, 1, 0, 0);
            outlineText(C.word, 0, 0, C.word.indexOf('ARCO') >= 0 ? hue(t * 8) : C.wordCol, '#12000a', 7); ctx.restore();
            if (!low() && C.flash > 0.2) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = C.flash * 0.5; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; for (let i = 0; i < 10; i++) { const an = i * TAU / 10 + t * 0.02, r0 = 40 + (1 - C.flash) * 80; ctx.beginPath(); ctx.moveTo(cx + C0(an) * r0, cy + S(an) * r0); ctx.lineTo(cx + C0(an) * (r0 + 26), cy + S(an) * (r0 + 26)); ctx.stroke(); } ctx.restore(); }
        }
        // --- destello del borde al subir de rango
        if (C.flash > 0.12) {
            ctx.globalAlpha = C.flash * 0.55; ctx.lineWidth = 8; ctx.strokeStyle = rankCol(r || { c: '#fff' }, t); ctx.strokeRect(2, 2, W - 4, H - 4);
        }
        // --- cartel del Modo Arcoíris con barra de tiempo restante
        if (C.rainbow > 0) {
            const k = C.rainbow / RAINBOW_FRAMES, bw = 150, hs = hudSafe(), bx = hs ? W - bw - 8 : W / 2 - bw / 2, by = hs ? hs + 34 : 36;   // v59: con HUD de teléfono, a la derecha y bajo la etiqueta de jefe
            ctx.globalAlpha = 0.95; ctx.textAlign = 'center'; ctx.font = '8px "Press Start 2P", monospace'; outlineText('★ MODO ARCOIRIS ★', bx + bw / 2, by - 6, hue(t * 8), '#12000a', 4);
            ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(bx, by, bw, 6);
            ctx.fillStyle = hue(t * 6); ctx.fillRect(bx + 1, by + 1, (bw - 2) * k, 4); ctx.fillStyle = hue(t * 6 + 120); ctx.fillRect(bx + 1 + (bw - 2) * k * 0.5, by + 1, (bw - 2) * k * 0.5, 4);
        }
        ctx.restore();
    }

    // ---------------------------------------------------------------- gancho al HUD (se ejecuta al final de cada cuadro de juego)
    const prevHud = window.drawHud;
    window.drawHud = function () {
        let on = false; try { on = (typeof isPlaying !== 'undefined' && isPlaying && currentMode !== 'clasico'); } catch (e) {}
        if (on) { try { tick(); drawRainbow(); } catch (e) { console.warn('combo:', e); } }
        if (on) { try { fodderStep(); perksFrame(); } catch (e) { console.warn('combo extras:', e); } }
        if (on) { try { if (window.ArcoirisExtra) ArcoirisExtra.frame(); } catch (e) { console.warn('arcoiris_extra:', e); } }
        const r = prevHud.apply(this, arguments);
        if (on) { try { drawCombo(); drawPerks(); } catch (e) { console.warn('combo HUD:', e); } }
        return r;
    };
    window.Combo = { state: C, kill, graze, startRainbow, reset, RANKS, partnerBonus, multiplyCombo, frozen, fodder, RAINBOW_FRAMES };
})();
