// ============================================================================
//  tutorial_comic.js — v53 · MINI TUTORIAL EN VIÑETAS DE CÓMIC (fondo negro con estrellas)
// ----------------------------------------------------------------------------
//  9 viñetas con narrador amarillo, globo de diálogo y humor "rompe la cuarta pared":
//   bienvenida · hitbox · balas enemigas · enemigos · mini jefes · jefes · qué SÍ recoger · qué NO tocar · controles
//  · Sale solo la PRIMERA vez que empiezas una partida (modo Moderno), justo antes de la historia y del nivel 1.
//  · Se puede SALTAR en cualquier momento (botón de arriba, Esc) y volver atrás/adelante.
//  · Para verlo de nuevo: botón "VER TUTORIAL" en el menú de pausa, o Tutorial.show() / Tutorial.reset() en consola.
//  Pausa la partida con window.StoryOpen (igual que la historia). Se carga DESPUÉS de historia_compartir.js.
// ============================================================================
(function () {
    'use strict';
    if (typeof isPlaying === 'undefined') return;
    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos, W = 360, H = 210;
    const $ = id => document.getElementById(id);
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    const phone = () => { try { return optMobile.checked; } catch (e) { return false; } };

    // ------------------------------------------------------------------ textos de las viñetas
    const PG = [
        { sfx: '¡HOLA!', cap: '<b>NARRADOR:</b> Un piloto novato aparece en pantalla. Sí, tú, el que está mirando.', say: '¡Soy el <b>Comandante Estrella</b>! Te explico lo básico en un minuto. ¿Ya eres un crack? Salta esto arriba a la derecha.' },
        { sfx: '¡PUNTITO!', cap: '<b>TU NAVE:</b> parece enorme... pero solo un puntito brillante del centro recibe daño.', say: 'Eso es tu <b>HITBOX</b>. Las balas pueden rozar las alas y no pasa nada. Mantén <b>SHIFT</b> para ir lento y preciso.' },
        { sfx: '¡PIU PIU!', cap: '<b>BALAS ENEMIGAS:</b> bolitas de colores en patrones muy bonitos... y muy peligrosos.', say: 'Si una bala toca tu puntito, pierdes una vida. ¿Rozarlas? Eso es <b>GRAZE</b> y carga tu <b>BOMBA</b>. ¡Valiente!' },
        { sfx: '¡BAM!', cap: '<b>ENEMIGOS:</b> llegan en oleadas y bajan hacia ti sin pedir permiso.', say: 'Dispara para destruirlos. Cada 65 derrotados sube tu <b>nivel de ataque</b>. Los de aura roja o celeste sueltan premios extra.' },
        { sfx: '¡OJO!', cap: '<b>MINI JEFES:</b> a mitad de la zona llega uno, con ayudantes.', say: 'Derrota a las <b>hadas</b>: sueltan cuadrados de colores. ¡Y el mini jefe deja una <b>moneda</b>! Vigila su barra de vida.' },
        { sfx: '¡JEFAZO!', cap: '<b>JEFES:</b> al final de cada zona te espera uno con hechizos de leyenda.', say: 'Arriba verás su barra de vida y la etiqueta "Enemigo ★★★". Respira, aprende sus patrones y no te pongas nervioso.' },
        { sfx: '¡ÑAM!', cap: '<b>ESTO SÍ SE RECOGE:</b>', say: '<b>P rojo</b> = vida (5 = +1). <b>G verde</b> = carga la bomba. <b>A naranja</b> = más ataque. <b>Monedas y gemas</b> = tienda y desbloqueos.' },
        { sfx: '¡NO!', cap: '<b>ESTO NO SE TOCA:</b>', say: 'Balas enemigas, enemigos, jefes y sus ataques. Regla de oro: si te quiere hacer daño... ¡esquívalo! Lo que sueltan al caer, eso sí.' },
        { sfx: '¡LISTO!', cap: '<b>CONTROLES:</b>', say: () => phone() ? 'Mover: <b>joystick</b> · Disparar: <b>A</b> (o AUTO para disparar solo) · Bomba: <b>B</b> · Pausa: botón de arriba a la izquierda. ¡Suerte, piloto!' : 'Mover: <b>flechas</b> · Disparar: <b>ESPACIO</b> · Bomba: <b>Z</b> · Lento: <b>SHIFT</b> · Pausa: <b>P</b> o <b>ESC</b>. ¡Suerte, piloto!' }
    ];

    // ------------------------------------------------------------------ dibujo (canvas 360x210)
    const disc = (g, x, y, r, f) => { g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    const blt = (g, x, y, col) => { disc(g, x, y, 5.5, col); disc(g, x, y, 2.3, '#fff'); };
    const label = (g, s, x, y, col, size, al) => { g.font = 'bold ' + size + 'px "Trebuchet MS",sans-serif'; g.textAlign = al || 'center'; g.lineWidth = 3; g.strokeStyle = '#000'; g.strokeText(s, x, y); g.fillStyle = col; g.fillText(s, x, y); };
    const stars = []; for (let i = 0; i < 34; i++) stars.push([(i * 97) % W, (i * 53) % H, 0.8 + (i % 3) * 0.6]);
    function bgStars(g, t) { g.fillStyle = '#fff'; stars.forEach(s => { g.globalAlpha = 0.3 + 0.5 * Math.abs(S(t * 0.002 + s[0])); g.fillRect(s[0], s[1], s[2], s[2]); }); g.globalAlpha = 1; }
    function ship(g, x, y, s, t) {
        g.save(); g.translate(x, y); g.scale(s, s);
        g.fillStyle = '#ff9a2a'; g.beginPath(); g.moveTo(-5, 14); g.lineTo(0, 24 + 3 * S(t * 0.02)); g.lineTo(5, 14); g.fill();
        g.fillStyle = '#cfd8e6'; g.beginPath(); g.moveTo(0, -20); g.lineTo(14, 14); g.lineTo(0, 8); g.lineTo(-14, 14); g.closePath(); g.fill();
        g.fillStyle = '#e0304a'; g.beginPath(); g.moveTo(0, -20); g.lineTo(5, 2); g.lineTo(-5, 2); g.closePath(); g.fill(); disc(g, 0, 0, 2.6, '#4fd8ff'); g.restore();
    }
    function foe(g, x, y, s, col, t, aura) {
        g.save(); g.translate(x, y + 2 * S(t * 0.004 + x)); g.scale(s, s);
        if (aura) disc(g, 0, 0, 22, aura);
        g.fillStyle = col; g.beginPath(); g.ellipse(0, 3, 17, 8, 0, 0, TAU); g.fill(); g.beginPath(); g.arc(0, 0, 9, Math.PI, 0); g.fill();
        g.fillStyle = '#fff'; g.fillRect(-5, -4, 3, 4); g.fillRect(2, -4, 3, 4); g.fillStyle = '#000'; g.fillRect(-4, -3, 1.5, 3); g.fillRect(3, -3, 1.5, 3); g.restore();
    }
    function mascot(g, x, y, s, t) {
        g.save(); g.translate(x, y + 3 * S(t * 0.004)); g.scale(s, s); g.rotate(0.1 * S(t * 0.003));
        g.fillStyle = '#ffe94a'; g.strokeStyle = '#000'; g.lineWidth = 3; g.beginPath();
        for (let i = 0; i < 10; i++) { const r = i % 2 ? 11 : 24, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(C(a) * r, S(a) * r); } g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#111'; g.fillRect(-12, -6, 10, 6); g.fillRect(2, -6, 10, 6); g.fillRect(-2, -4, 4, 2);
        g.strokeStyle = '#111'; g.lineWidth = 2; g.beginPath(); g.arc(0, 4, 6, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke(); g.restore();
    }
    const item = (g, x, y, col, ch) => { g.fillStyle = col; g.fillRect(x - 9, y - 9, 18, 18); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(x - 9, y - 9, 18, 18); label(g, ch, x, y + 5, '#fff', 13); };
    const ring = (g, cx, cy, t, n, rad, col, off) => { for (let i = 0; i < n; i++) { const a = i / n * TAU + off; blt(g, cx + C(a) * rad, cy + S(a) * rad * 0.9, col); } };
    const cap = (g, x, y, w, h, r, f) => { g.fillStyle = f; g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 2; g.stroke(); };
    const key = (g, s, x, y, w) => { cap(g, x - w / 2, y - 14, w, 28, 6, '#222'); label(g, s, x, y + 5, '#fff', 12); };

    const ART = [
        (g, t) => { mascot(g, 180, 100, 2.6, t); ship(g, 50, 160, 1, t); ship(g, 310, 150, 0.8, t + 500); },
        (g, t) => {
            ship(g, 180, 118, 3.2, t);
            [-38, 38].forEach((dx, i) => blt(g, 180 + dx, ((t * 0.09 + i * 90) % 230) - 10, i ? '#4fd8ff' : '#ff4f86'));
            const p = 1 + 0.25 * S(t * 0.01); disc(g, 180, 118, 7 * p, 'rgba(255,60,80,0.35)'); disc(g, 180, 118, 3.4, '#ff3b3b'); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.beginPath(); g.arc(180, 118, 7 * p, 0, TAU); g.stroke();
            g.strokeStyle = '#ffe94a'; g.lineWidth = 2; g.beginPath(); g.moveTo(246, 52); g.lineTo(190, 112); g.stroke(); label(g, 'HITBOX', 272, 48, '#ffe94a', 16);
        },
        (g, t) => {
            foe(g, 180, 34, 1.3, '#b04fff', t); const rr = (t * 0.045) % 150;
            ring(g, 180, 38, t, 14, rr + 8, '#ff4f86', t * 0.0004); if (rr > 70) ring(g, 180, 38, t, 14, rr - 62, '#4fd8ff', -t * 0.0004);
            const sx = 180 + 70 * S(t * 0.0012); ship(g, sx, 178, 0.9, t); if (S(t * 0.004) > 0.4) { label(g, 'GRAZE!', sx, 140, '#4cff6a', 15); disc(g, sx + 16, 168, 2, '#fff'); disc(g, sx - 16, 172, 2, '#fff'); }
        },
        (g, t) => {
            const ph = (t % 1400) / 1400, boom = ph > 0.8;
            foe(g, 60, 80, 1.1, '#ff7a3a', t, 'rgba(255,60,60,0.35)'); label(g, 'ATAQUE x1.25', 60, 122, '#ff8a6a', 11);
            foe(g, 300, 80, 1.1, '#3ac8ff', t, 'rgba(60,200,255,0.35)'); label(g, 'GEMAS', 300, 122, '#7fe0ff', 11);
            if (!boom) foe(g, 180, 70 + ph * 20, 1.3, '#b04fff', t); else { for (let i = 0; i < 3; i++) disc(g, 180, 80, Math.max(1, 10 + (ph - 0.8) * 160 - i * 8), ['#fff', '#ffe94a', '#ff7a3a'][2 - i]); }
            for (let i = 0; i < 5; i++) { const y = 175 - ((t * 0.18 + i * 28) % 110); g.fillStyle = '#ffe94a'; g.fillRect(177, y, 6, 12); } ship(g, 180, 188, 0.9, t);
        },
        (g, t) => {
            foe(g, 180, 56, 2.1, '#b04fff', t); g.fillStyle = '#300'; g.fillRect(110, 98, 140, 8); g.fillStyle = '#f33'; g.fillRect(110, 98, 140 * (0.7 + 0.1 * S(t * 0.002)), 8); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(110, 98, 140, 8);
            for (let i = 0; i < 2; i++) { const a = t * 0.002 + i * Math.PI; foe(g, 180 + C(a) * 100, 56 + S(a) * 14, 0.8, '#ff8ad0', t); }
            const it = [['#e03030', 'P'], ['#30c030', 'G'], ['#f09000', 'A']]; it.forEach((c, i) => item(g, 100 + i * 52, 124 + ((t * 0.04 + i * 30) % 55), c[0], c[1]));
            disc(g, 270, 150 + ((t * 0.04) % 40), 10, '#ffd92a'); label(g, '¡MONEDA!', 276, 140, '#ffd92a', 11); ship(g, 180, 192, 0.7, t);
        },
        (g, t) => {
            const cx = 180, cy = 78; g.strokeStyle = 'rgba(255,120,200,0.75)'; g.lineWidth = 2; g.beginPath(); g.arc(cx, cy, 64, 0, TAU); g.stroke();
            g.beginPath(); for (let i = 0; i <= 6; i++) { const a = i * TAU / 6 * 2 + t * 0.0008; g.lineTo(cx + C(a) * 64, cy + S(a) * 64); } g.stroke();
            foe(g, cx, cy, 3, '#ff4f6a', t); const rr = (t * 0.04) % 130; ring(g, cx, cy, t, 18, rr + 20, '#ff4f86', t * 0.0003); ring(g, cx, cy, t, 18, ((rr + 65) % 130) + 20, '#ffe94a', -t * 0.0003);
            g.fillStyle = '#300'; g.fillRect(14, 8, 215, 8); g.fillStyle = '#f33'; g.fillRect(14, 8, 215 * (0.75 + 0.1 * S(t * 0.0015)), 8); g.strokeStyle = '#fff'; g.lineWidth = 1.5; g.strokeRect(14, 8, 215, 8); label(g, 'Enemigo ★★★', 14, 34, '#ffe6d0', 12, 'left');
        },
        (g, t) => {
            const L = [['#e03030', 'P', 'VIDA'], ['#30c030', 'G', 'BOMBA'], ['#f09000', 'A', 'ATAQUE']];
            L.forEach((c, i) => item(g, 50 + i * 62, 50 + ((t * 0.04 + i * 25) % 70), c[0], c[1]));
            disc(g, 236, 70 + ((t * 0.04 + 10) % 70), 11, '#ffd92a'); g.beginPath(); g.moveTo(296, 56 + ((t * 0.04 + 5) % 70)); g.lineTo(306, 70 + ((t * 0.04 + 5) % 70)); g.lineTo(296, 84 + ((t * 0.04 + 5) % 70)); g.lineTo(286, 70 + ((t * 0.04 + 5) % 70)); g.closePath(); g.fillStyle = '#4fd8ff'; g.fill();
            [['VIDA', 50], ['BOMBA', 112], ['ATAQUE', 174], ['MONEDA', 236], ['GEMA', 296]].forEach(s => { label(g, '✔', s[1], 168, '#4cff6a', 20); label(g, s[0], s[1], 192, '#fff', 11); });
        },
        (g, t) => {
            blt(g, 60, 90, '#ff4f86'); foe(g, 180, 90, 1.5, '#b04fff', t); foe(g, 300, 90, 1.9, '#ff4f6a', t);
            [60, 180, 300].forEach(x => { g.strokeStyle = '#ff2a2a'; g.lineWidth = 8; g.beginPath(); g.moveTo(x - 30, 60); g.lineTo(x + 30, 120); g.moveTo(x + 30, 60); g.lineTo(x - 30, 120); g.stroke(); });
            label(g, 'BALAS', 60, 160, '#fff', 12); label(g, 'ENEMIGOS', 180, 160, '#fff', 12); label(g, 'JEFES', 300, 160, '#fff', 12); label(g, '¡ESQUIVA!', 180, 196, '#ffe94a', 15);
        },
        (g, t) => {
            if (phone()) {
                disc(g, 80, 118, 46, 'rgba(79,216,255,0.18)'); g.strokeStyle = '#4fd8ff'; g.lineWidth = 2; g.beginPath(); g.arc(80, 118, 46, 0, TAU); g.stroke(); disc(g, 80 + 10 * S(t * 0.003), 118 + 8 * C(t * 0.003), 18, '#4fd8ff'); label(g, 'MOVER', 80, 188, '#fff', 12);
                disc(g, 270, 132, 32, 'rgba(60,200,80,0.35)'); g.strokeStyle = '#4cff6a'; g.stroke(); g.beginPath(); g.arc(270, 132, 32, 0, TAU); g.stroke(); label(g, 'A', 270, 140, '#fff', 24); label(g, 'DISPARO', 270, 188, '#fff', 12);
                disc(g, 208, 92, 24, 'rgba(220,60,60,0.35)'); g.strokeStyle = '#ff5a5a'; g.beginPath(); g.arc(208, 92, 24, 0, TAU); g.stroke(); label(g, 'B', 208, 99, '#fff', 20); label(g, 'BOMBA', 208, 60, '#fff', 12);
            } else {
                key(g, '↑', 90, 70, 34); key(g, '←', 52, 108, 34); key(g, '↓', 90, 108, 34); key(g, '→', 128, 108, 34); label(g, 'MOVER', 90, 150, '#fff', 12);
                key(g, 'ESPACIO', 270, 70, 120); label(g, 'DISPARAR', 270, 102, '#fff', 12); key(g, 'Z', 220, 150, 34); label(g, 'BOMBA', 220, 182, '#fff', 12); key(g, 'SHIFT', 300, 150, 70); label(g, 'LENTO', 300, 182, '#fff', 12);
            }
        }
    ];

    // ------------------------------------------------------------------ interfaz
    let el, art, ag, mas, mg, bgc, bg2, raf = 0, idx = 0, replay = false, t0 = 0, bgS = [];
    let seen = ls.get('sg_tut_seen') === '1';
    function build() {
        if (el) return;
        const st = document.createElement('style');
        st.textContent = '#tcOv{position:fixed;inset:0;z-index:99995;background:#000;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;color:#000;overflow:auto;padding:8px}#tcOv.hidden{display:none}' +
            '#tcBg{position:absolute;inset:0;width:100%;height:100%}.tc-panel{position:relative;z-index:1;width:min(94vw,440px);display:grid;grid-template-areas:"cap" "art" "say";border:4px solid #fff;background:#05050c;box-shadow:7px 7px 0 #d4142c;animation:tcPop .25s ease-out}' +
            '@keyframes tcPop{from{transform:scale(.9) rotate(-2deg);opacity:.2}to{transform:scale(1) rotate(-.4deg);opacity:1}}' +
            '.tc-cap{grid-area:cap;background:#ffe94a;border-bottom:4px solid #000;padding:8px 10px;font:700 13px/1.35 "Comic Sans MS","Chalkboard SE","Trebuchet MS",sans-serif}' +
            '#tcArt{grid-area:art;width:100%;height:auto;display:block;background:radial-gradient(circle at 0 100%,rgba(255,255,255,.07) 0 22%,transparent 23%) 0 0/10px 10px}' +
            '.tc-sfx{position:absolute;right:8px;top:62px;font:italic 900 24px Impact,"Arial Black",sans-serif;color:#ff2a3c;-webkit-text-stroke:2px #000;paint-order:stroke fill;transform:rotate(8deg);text-shadow:3px 3px 0 #fff}' +
            '.tc-say{grid-area:say;display:flex;align-items:center;gap:8px;padding:8px;border-top:4px solid #fff}#tcMas{width:56px;height:56px;flex:none}' +
            '.tc-bub{position:relative;background:#fff;border:3px solid #000;border-radius:14px;padding:8px 10px;font:700 12.5px/1.35 "Comic Sans MS","Chalkboard SE","Trebuchet MS",sans-serif}' +
            '.tc-bub:before{content:"";position:absolute;left:-12px;top:18px;border:8px solid transparent;border-right:10px solid #000;border-left:0}.tc-bub:after{content:"";position:absolute;left:-7px;top:19px;border:7px solid transparent;border-right:8px solid #fff;border-left:0}' +
            '.tc-nav{position:relative;z-index:1;display:flex;align-items:center;gap:10px}.tc-nav button,#tcSkip{font:900 12px Impact,"Arial Black",sans-serif;letter-spacing:.5px;padding:9px 14px;border:3px solid #fff;background:#111;color:#fff;border-radius:6px;cursor:pointer}' +
            '.tc-nav .go{background:#d4142c}#tcSkip{position:fixed;top:8px;right:8px;z-index:3;border-color:#ffe94a;color:#ffe94a;font-size:11px}#tcDots{display:flex;gap:5px}#tcDots i{width:8px;height:8px;border-radius:50%;background:#444}#tcDots i.on{background:#ffe94a}' +
            '@media (max-height:480px) and (orientation:landscape){.tc-panel{width:min(96vw,780px);grid-template-columns:1fr 1fr;grid-template-areas:"art cap" "art say";align-items:stretch}.tc-cap{border-bottom:4px solid #000;border-left:4px solid #fff}.tc-say{border-top:0;border-left:4px solid #fff;align-items:flex-start}#tcMas{width:44px;height:44px}.tc-sfx{right:calc(50% + 6px);top:6px;font-size:20px}.tc-cap,.tc-bub{font-size:11.5px}}';
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'tcOv'; el.className = 'hidden';
        el.innerHTML = '<canvas id="tcBg"></canvas><button id="tcSkip">SALTAR TUTORIAL ✕</button><div class="tc-panel" id="tcPanel"><div class="tc-cap" id="tcCap"></div><canvas id="tcArt" width="' + W + '" height="' + H + '"></canvas><div class="tc-sfx" id="tcSfx"></div>' +
            '<div class="tc-say"><canvas id="tcMas" width="64" height="64"></canvas><div class="tc-bub" id="tcBub"></div></div></div>' +
            '<div class="tc-nav"><button id="tcBack">◀ ATRÁS</button><div id="tcDots"></div><button id="tcNext" class="go">SIGUIENTE ▶</button></div>';
        document.body.appendChild(el);
        art = $('tcArt'); ag = art.getContext('2d'); mas = $('tcMas'); mg = mas.getContext('2d'); bgc = $('tcBg'); bg2 = bgc.getContext('2d');
        $('tcDots').innerHTML = PG.map(() => '<i></i>').join('');
        $('tcNext').onclick = next; $('tcBack').onclick = back; $('tcSkip').onclick = close;
        for (let i = 0; i < 110; i++) bgS.push([Math.random(), Math.random(), 0.3 + Math.random() * 1.2, Math.random() * TAU]);
        window.addEventListener('keydown', e => {
            if (!window.TutorialOpen) return;
            const k = e.key; if (k === 'Enter' || k === ' ' || k === 'ArrowRight') next(); else if (k === 'ArrowLeft') back(); else if (k === 'Escape') close(); else return;
            e.preventDefault(); e.stopPropagation();
        }, true);
    }
    function page() {
        const p = PG[idx], say = typeof p.say === 'function' ? p.say() : p.say;
        $('tcCap').innerHTML = p.cap; $('tcBub').innerHTML = say; $('tcSfx').textContent = p.sfx;
        [...$('tcDots').children].forEach((d, i) => d.className = i === idx ? 'on' : '');
        $('tcBack').style.visibility = idx ? 'visible' : 'hidden'; $('tcNext').textContent = idx === PG.length - 1 ? 'EMPEZAR ▶' : 'SIGUIENTE ▶';
        const pn = $('tcPanel'); pn.style.animation = 'none'; void pn.offsetWidth; pn.style.animation = '';
    }
    function frame(ts) {
        if (!window.TutorialOpen) return; const t = ts - t0;
        const w = bgc.width = bgc.clientWidth || innerWidth, h = bgc.height = bgc.clientHeight || innerHeight;   // fondo negro con estrellas que bajan
        bg2.fillStyle = '#000'; bg2.fillRect(0, 0, w, h); bg2.fillStyle = '#fff';
        for (const s of bgS) { s[1] = (s[1] + s[2] * 0.0006) % 1; bg2.globalAlpha = 0.35 + 0.55 * Math.abs(S(t * 0.002 + s[3])); bg2.fillRect(s[0] * w, s[1] * h, s[2] + 0.6, s[2] + 0.6); } bg2.globalAlpha = 1;
        ag.clearRect(0, 0, W, H); bgStars(ag, t); ART[idx](ag, t);
        mg.clearRect(0, 0, 64, 64); mascot(mg, 32, 33, 1.05, t);
        raf = requestAnimationFrame(frame);
    }
    function open(isReplay) {
        build(); replay = !!isReplay; idx = 0; page(); t0 = performance.now();
        el.classList.remove('hidden'); window.TutorialOpen = true; window.StoryOpen = true;
        try { if (typeof stopShoot === 'function') stopShoot(); } catch (e) {}
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); } catch (e) {}
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    function next() { if (idx >= PG.length - 1) { close(); return; } idx++; page(); }
    function back() { if (idx > 0) { idx--; page(); } }
    function close() {
        cancelAnimationFrame(raf); if (el) el.classList.add('hidden'); window.TutorialOpen = false; window.StoryOpen = false;
        if (!replay) { seen = true; ls.set('sg_tut_seen', '1'); }
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); } catch (e) {}
    }
    // primera partida (modo Moderno, no práctica): se abre antes de la historia y del nivel 1
    function tick() {
        if (seen || window.TutorialOpen || !isPlaying) return;
        if (currentMode !== 'moderno' || (typeof practiceStage !== 'undefined' && practiceStage) || currentWave !== 1) return;
        open(false);
    }
    const _hud = window.drawHud;
    window.drawHud = function () { try { tick(); } catch (e) { console.warn('[Tutorial]', e); } return _hud.apply(this, arguments); };
    setInterval(() => {   // botón "VER TUTORIAL" en el menú de pausa
        const po = $('pauseOverlay'); if (!po || po.classList.contains('hidden') || $('btnTutorial')) return;
        const q = $('btnQuitToMenu'), r = $('btnResume'); if (!q) return;
        const b = document.createElement('button'); b.id = 'btnTutorial'; b.type = 'button'; b.textContent = 'VER TUTORIAL'; if (r) b.className = r.className;
        b.onclick = () => open(true); q.parentNode.insertBefore(b, q);
    }, 500);
    window.Tutorial = { show() { open(true); }, reset() { seen = false; ls.set('sg_tut_seen', '0'); }, close };
})();
