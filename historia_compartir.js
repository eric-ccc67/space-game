// ============================================================================
//  historia_compartir.js — v51 · HISTORIA ENTRE FASES + TARJETA PARA COMPARTIR
// ----------------------------------------------------------------------------
//  1) HISTORIA: antes de cada zona (1-7) sale una pantalla corta con ilustración animada y 2-3 líneas
//     (al empezar la partida, primero el prólogo). Cada capítulo se muestra UNA vez por dispositivo; hay
//     botón SALTAR y "NO MOSTRAR MÁS". Solo en el modo Moderno (no en Práctica ni Clásico). Pausa la partida.
//  2) TARJETA: en la pantalla de fin de partida aparece el botón COMPARTIR. Genera una imagen (1080x1350) con
//     tu nombre, puntaje, nivel, dificultad y nave, y la comparte (WhatsApp, Instagram...) o la descarga.
//  Se carga DESPUÉS de juego.js. Consola: Story.reset() (volver a ver todo) · Story.show(1..7) · ShareCard.make()
// ============================================================================
(function () {
    'use strict';
    if (typeof LEVEL_THEMES === 'undefined' || typeof Perfil === 'undefined') return;
    const TAU = Math.PI * 2, W = 360, H = 200;
    const $ = id => document.getElementById(id);
    const ls = { get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} } };
    const FONT = s => s + 'px "Press Start 2P", monospace';

    // ------------------------------------------------------------------ textos
    const CH = [
        { t: 'PRÓLOGO · LA ESTRELLA ESCARLATA', s: ['Una estrella roja cae hacia el mundo.', 'Si toca tierra, todo se apagará. Siete sellos la sostienen en el cielo: rómpelos antes del impacto.'] },
        { t: 'ZONA 1 · CAMPOS DE SAKURA', s: ['Los pétalos bailan como una tormenta.', 'SAKURA ETERNA guarda el primer sello. Aprende su danza y rómpela.'] },
        { t: 'ZONA 2 · PICOS HELADOS', s: ['El viento corta como cuchillas.', 'La SOBERANA GLACIAL congeló el segundo sello. No dejes que te alcance el frío.'] },
        { t: 'ZONA 3 · LAGO ESPECTRAL', s: ['Las aguas quietas guardan secretos.', 'LA DAMA DEL LAGO llama a quien se acerca. No mires su reflejo.'] },
        { t: 'ZONA 4 · BOSQUE ENCANTADO', s: ['Las luciérnagas te guían... o te engañan.', 'MADRE ESPINA protege el cuarto sello entre raíces vivas.'] },
        { t: 'ZONA 5 · BIBLIOTECA ARCANA', s: ['Libros que vuelan y páginas que muerden.', 'LA GRAN ARCHIVISTA esconde el saber prohibido. Cada hechizo cuenta.'] },
        { t: 'ZONA 6 · TORRE DEL RELOJ', s: ['Aquí el tiempo se detiene.', 'EL RELOJERO ETERNO juega con los segundos. Cuando las agujas se paren, muévete.'] },
        { t: 'ZONA 7 · LUNA SANGRANTE', s: ['La estrella escarlata ya está sobre ti.', 'EL OJO CARMESÍ te vigila desde la luna. Es el último sello: todo termina aquí.'] }
    ];

    // ------------------------------------------------------------------ ilustraciones (canvas 2D, muy ligeras)
    const stars = []; for (let i = 0; i < 40; i++) stars.push([(i * 97) % W, (i * 53) % (H * 0.7), 0.6 + (i % 3) * 0.5]);
    const tri = (g, a, b, c, d, e, f) => { g.beginPath(); g.moveTo(a, b); g.lineTo(c, d); g.lineTo(e, f); g.closePath(); g.fill(); };
    const disc = (g, x, y, r, f) => { g.fillStyle = f; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };
    function sky(g, top, bot, t, showStars) {
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        if (showStars) { g.fillStyle = '#fff'; for (const s of stars) { g.globalAlpha = 0.4 + 0.4 * Math.sin(t * 0.003 + s[0]); g.fillRect(s[0], s[1], s[2], s[2]); } g.globalAlpha = 1; }
    }
    const ART = [
        (g, t) => { sky(g, '#12000a', '#3a0016', t, 1); const k = (t * 0.06) % 380; g.strokeStyle = 'rgba(255,80,80,0.35)'; g.lineWidth = 6; g.beginPath(); g.moveTo(k - 90, k * 0.35 - 30); g.lineTo(k, k * 0.35 + 6); g.stroke(); disc(g, k, k * 0.35 + 6, 15, 'rgba(255,60,60,0.3)'); disc(g, k, k * 0.35 + 6, 8, '#ff4a4a'); disc(g, k, k * 0.35 + 6, 3, '#fff'); disc(g, 180, 230, 130, '#1a0510'); },
        (g, t) => { sky(g, '#2a0a24', '#6b2a4a', t, 0); disc(g, 285, 50, 26, '#ffe6f0'); g.strokeStyle = '#2a1018'; g.lineWidth = 7; g.beginPath(); g.moveTo(0, 150); g.quadraticCurveTo(120, 105, 240, 140); g.stroke(); for (let i = 0; i < 26; i++) { const x = (i * 53 + t * 0.03 * (20 + i % 5 * 8)) % W, y = (i * 37 + t * 0.04 * (14 + i % 4 * 6)) % H; g.fillStyle = i % 2 ? '#ffb7d0' : '#ff8fb5'; g.beginPath(); g.ellipse(x, y, 4, 2.2, i, 0, TAU); g.fill(); } },
        (g, t) => { sky(g, '#0b1c33', '#2a5a80', t, 1); g.fillStyle = '#dff1ff'; tri(g, 20, 190, 110, 50, 200, 190); tri(g, 150, 190, 250, 30, 350, 190); g.fillStyle = '#7fb4dc'; tri(g, 250, 30, 285, 190, 350, 190); for (let i = 0; i < 30; i++) { disc(g, (i * 47 + t * 0.02 * (8 + i % 4)) % W, (i * 31 + t * 0.05 * (10 + i % 5 * 3)) % H, 1.6, '#fff'); } },
        (g, t) => { sky(g, '#050d1c', '#12304a', t, 1); disc(g, 180, 40, 24, '#e8f0ff'); g.fillStyle = '#071a2a'; g.fillRect(0, 110, W, 90); for (let i = 0; i < 3; i++) { g.strokeStyle = 'rgba(180,230,255,' + (0.5 - ((t * 0.0006 + i / 3) % 1) * 0.5) + ')'; g.beginPath(); g.ellipse(180, 150, 10 + ((t * 0.0006 + i / 3) % 1) * 140, 4 + ((t * 0.0006 + i / 3) % 1) * 22, 0, 0, TAU); g.stroke(); } g.fillStyle = 'rgba(200,240,255,0.6)'; g.beginPath(); g.ellipse(180, 95 + 4 * Math.sin(t * 0.003), 16, 22, 0, 0, TAU); g.fill(); disc(g, 174, 90, 2, '#12304a'); disc(g, 186, 90, 2, '#12304a'); },
        (g, t) => { sky(g, '#04120a', '#12301c', t, 0); g.fillStyle = '#071a0e'; for (let i = 0; i < 7; i++) { tri(g, i * 58 - 20, 200, i * 58 + 10, 60 + (i % 3) * 18, i * 58 + 40, 200); } for (let i = 0; i < 14; i++) { const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.002 + i)); disc(g, (i * 71 + 30 * Math.sin(t * 0.001 + i)) % W, 70 + (i * 29) % 110, 2.4, 'rgba(190,255,150,' + a + ')'); } },
        (g, t) => { sky(g, '#1a1020', '#3a2a30', t, 0); for (let r = 0; r < 3; r++) for (let i = 0; i < 12; i++) { g.fillStyle = ['#a33', '#36a', '#a83', '#3a6'][(i + r) % 4]; g.fillRect(14 + i * 29, 20 + r * 55, 22, 40); } g.save(); g.translate(180, 100 + 6 * Math.sin(t * 0.003)); g.rotate(Math.sin(t * 0.002) * 0.4); g.fillStyle = '#f4e4b8'; g.fillRect(-26, -18, 52, 36); g.fillStyle = '#7a3a2a'; g.fillRect(-26, -18, 6, 36); g.restore(); },
        (g, t) => { sky(g, '#100a1c', '#2a2040', t, 1); disc(g, 180, 105, 78, '#2a2440'); disc(g, 180, 105, 70, '#d8c890'); g.strokeStyle = '#3a2a10'; g.lineWidth = 3; for (let i = 0; i < 12; i++) { const a = i * TAU / 12; g.beginPath(); g.moveTo(180 + C(a) * 60, 105 + S(a) * 60); g.lineTo(180 + C(a) * 68, 105 + S(a) * 68); g.stroke(); } g.lineWidth = 5; g.beginPath(); g.moveTo(180, 105); g.lineTo(180 + C(t * 0.0008) * 40, 105 + S(t * 0.0008) * 40); g.stroke(); g.lineWidth = 3; g.beginPath(); g.moveTo(180, 105); g.lineTo(180 + C(t * 0.0001) * 55, 105 + S(t * 0.0001) * 55); g.stroke(); },
        (g, t) => { sky(g, '#1a0006', '#5a0014', t, 1); disc(g, 180, 100, 85, '#8a0a1c'); g.fillStyle = '#ffe8e8'; g.beginPath(); g.ellipse(180, 100, 58, 30, 0, 0, TAU); g.fill(); const dx = 8 * Math.sin(t * 0.002); disc(g, 180 + dx, 100, 22, '#d01030'); g.fillStyle = '#100'; g.beginPath(); g.ellipse(180 + dx, 100, 5, 20, 0, 0, TAU); g.fill(); for (let i = 0; i < 6; i++) disc(g, 80 + i * 40, (t * 0.05 * (1 + i % 3 * 0.4) + i * 40) % H, 3, '#e01030'); }
    ];
    const C = Math.cos, S = Math.sin;

    // ------------------------------------------------------------------ pantalla de historia
    let el = null, cv = null, g = null, raf = 0, queue = [], cur = null, typing = null, charN = 0, t0 = 0;
    function build() {
        if (el) return;
        const st = document.createElement('style');
        st.textContent = '#storyOv{position:fixed;inset:0;z-index:99990;background:rgba(0,0,0,.92);display:flex;align-items:center;justify-content:center;font-family:"Press Start 2P",monospace;color:#fff}' +
            '#storyOv.hidden{display:none}.st-card{width:min(92vw,440px);padding:14px;text-align:center}.st-card canvas{width:100%;border:2px solid #ff4a6a;border-radius:6px;background:#000;image-rendering:auto}' +
            '.st-t{color:#ffb0c0;font-size:11px;margin:12px 0 8px}.st-x{font-size:10px;line-height:1.8;min-height:120px;text-align:left;color:#eee}' +
            '.st-b{display:flex;gap:8px;justify-content:center;margin-top:10px;flex-wrap:wrap}.st-b button{font:inherit;font-size:10px;padding:10px 14px;border:2px solid #ff4a6a;background:#2a0010;color:#fff;border-radius:6px;cursor:pointer}' +
            '.st-b .go{background:#ff4a6a;color:#200}.st-b .no{border-color:#666;color:#aaa;font-size:8px}';
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'storyOv'; el.className = 'hidden';
        el.innerHTML = '<div class="st-card"><canvas width="' + W + '" height="' + H + '"></canvas><div class="st-t" id="stT"></div><div class="st-x" id="stX"></div>' +
            '<div class="st-b"><button class="go" id="stGo">CONTINUAR ▶</button><button class="no" id="stSkip">SALTAR</button><button class="no" id="stOff">NO MOSTRAR MÁS</button></div></div>';
        document.body.appendChild(el); cv = el.querySelector('canvas'); g = cv.getContext('2d');
        $('stGo').onclick = next; $('stSkip').onclick = () => { queue = []; next(); }; $('stOff').onclick = () => { ls.set('sg_story_off', '1'); queue = []; next(); };
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); next(); } });
        window.addEventListener('keydown', e => { if (window.StoryOpen && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); e.stopPropagation(); next(); } }, true);
    }
    function frame(ts) { if (!window.StoryOpen) return; g.clearRect(0, 0, W, H); ART[cur.art](g, ts - t0); raf = requestAnimationFrame(frame); }
    function open() {
        build(); cur = queue.shift(); if (!cur) { close(); return; }
        $('stT').textContent = CH[cur.i].t; $('stX').textContent = ''; charN = 0;
        const full = CH[cur.i].s.join('\n\n'); clearInterval(typing);
        typing = setInterval(() => { charN += 2; $('stX').textContent = full.slice(0, charN); if (charN >= full.length) clearInterval(typing); }, 28);
        el.classList.remove('hidden'); window.StoryOpen = true; t0 = performance.now();
        try { if (typeof stopShoot === 'function') stopShoot(); } catch (e) {}
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); } catch (e) {}
        cancelAnimationFrame(raf); raf = requestAnimationFrame(frame);
    }
    function next() {
        const full = CH[cur.i].s.join('\n\n');
        if (charN < full.length) { charN = full.length; clearInterval(typing); $('stX').textContent = full; return; }   // 1.er toque: completa el texto
        if (queue.length) open(); else close();
    }
    function close() {
        clearInterval(typing); cancelAnimationFrame(raf); if (el) el.classList.add('hidden'); window.StoryOpen = false; cur = null;
        try { Object.keys(keys).forEach(k => { keys[k] = false; }); } catch (e) {}
    }
    const seen = () => { try { return JSON.parse(ls.get('sg_story_seen') || '[]'); } catch (e) { return []; } };
    function mark(i) { const a = seen(); if (a.indexOf(i) < 0) { a.push(i); ls.set('sg_story_seen', JSON.stringify(a)); } }
    function show(level, force) {
        const a = seen(), q = [];
        if (level === 1 && (force || a.indexOf(0) < 0)) q.push({ i: 0, art: 0 });
        if (force || a.indexOf(level) < 0) q.push({ i: level, art: level });
        q.forEach(c => mark(c.i)); queue = q; if (q.length) open();
    }
    // vigilante: detecta el cambio de zona (1 comprobación barata por cuadro)
    let lastWave = 0;
    function tick() {
        if (typeof isPlaying === 'undefined' || !isPlaying) { lastWave = 0; return; }
        if (window.TutorialOpen) return;   // v53: el tutorial va primero; la historia sale cuando se cierra
        if (currentWave === lastWave) return; lastWave = currentWave;
        if (currentMode !== 'moderno' || (typeof practiceStage !== 'undefined' && practiceStage) || ls.get('sg_story_off') === '1') return;
        const n = typeof activeLevelCount === 'function' ? activeLevelCount() : 7;
        if (currentWave >= 1 && currentWave <= Math.min(7, n)) show(currentWave);
    }
    const _hud = window.drawHud;
    window.drawHud = function () { try { tick(); } catch (e) { console.warn('[Story]', e); } return _hud.apply(this, arguments); };
    window.Story = { show: l => show(l, true), reset() { ls.set('sg_story_seen', '[]'); ls.set('sg_story_off', '0'); }, close };

    // ------------------------------------------------------------------ tarjeta para compartir
    const SHIPS = { 1: 'Tanque', 2: 'Sniper', 3: 'Ligera', 4: 'Omega', 5: 'Reimu', 6: 'Marisa', 7: 'Goku' };
    const DIFF = { facil: 'FÁCIL', medio: 'MEDIO', dificil: 'DIFÍCIL', lunatico: 'LUNÁTICO' };
    const loadImg = src => new Promise(res => { const im = new Image(); const to = setTimeout(() => res(null), 2000); im.onload = () => { clearTimeout(to); res(im); }; im.onerror = () => { clearTimeout(to); res(null); }; im.src = src; });
    const fmt = n => String(n | 0).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    async function make(kind) {
        const run = Perfil.collect(kind || 'death'), name = (($('pfName') && $('pfName').value) || Perfil.currentName() || 'JUGADOR').toUpperCase();
        const c = document.createElement('canvas'); c.width = 1080; c.height = 1350; const x = c.getContext('2d');
        const bg = x.createLinearGradient(0, 0, 0, 1350); bg.addColorStop(0, '#0a0014'); bg.addColorStop(1, '#4a0022'); x.fillStyle = bg; x.fillRect(0, 0, 1080, 1350);
        x.fillStyle = '#fff'; for (let i = 0; i < 110; i++) { x.globalAlpha = 0.25 + (i % 5) * 0.12; x.fillRect((i * 193) % 1080, (i * 331) % 1350, 2 + i % 3, 2 + i % 3); } x.globalAlpha = 1;
        const rg = x.createRadialGradient(540, 330, 10, 540, 330, 520); rg.addColorStop(0, 'rgba(255,60,80,.55)'); rg.addColorStop(1, 'rgba(255,60,80,0)'); x.fillStyle = rg; x.fillRect(0, 0, 1080, 800);
        const im = await loadImg('portada.png');
        if (im) { const w = 920, h = Math.min(430, im.height * w / im.width); x.save(); x.beginPath(); x.roundRect ? x.roundRect(80, 70, w, 430, 28) : x.rect(80, 70, w, 430); x.clip(); x.drawImage(im, 80, 70 + (430 - h) / 2, w, h); x.restore(); x.strokeStyle = '#ff4a6a'; x.lineWidth = 5; x.strokeRect(80, 70, w, 430); }
        x.textAlign = 'center'; x.fillStyle = '#fff'; x.font = FONT(46); x.fillText('SCARLET STARFALL', 540, 590);
        x.fillStyle = '#ff8aa0'; x.font = '40px sans-serif'; x.fillText('紅星降臨', 540, 645);
        x.fillStyle = run.victory ? '#ffe066' : '#ffb0c0'; x.font = FONT(30); x.fillText(run.victory ? '¡JUEGO COMPLETADO!' : 'FIN DEL JUEGO', 540, 730);
        x.fillStyle = '#fff'; x.font = FONT(54); x.fillText(name.slice(0, 12), 540, 830);
        x.fillStyle = '#ffe066'; x.font = FONT(96); x.fillText(fmt(run.score), 540, 960);
        x.fillStyle = '#ccc'; x.font = FONT(24); x.fillText('PUNTAJE', 540, 1010);
        const lvl = typeof activeLevelCount === 'function' ? Math.min(run.level, activeLevelCount()) : run.level;
        x.fillStyle = '#fff'; x.font = FONT(28); x.fillText('ZONA ' + lvl + ' · ' + (DIFF[run.difficulty] || run.difficulty) + ' · ' + (SHIPS[selectedShipType] || 'NAVE'), 540, 1090);
        x.fillStyle = '#9fd'; x.font = FONT(22); x.fillText(run.kills + ' ENEMIGOS  ·  ' + run.powerups + ' POWERUPS  ·  ' + run.bombs + ' BOMBAS', 540, 1150);
        x.fillStyle = '#ff4a6a'; x.font = FONT(34); x.fillText('¿PUEDES SUPERARME?', 540, 1250);
        x.fillStyle = '#bbb'; x.font = '26px sans-serif'; x.fillText(location.host || location.href, 540, 1300);
        return c;
    }
    async function share() {
        const msg = $('pfMsg'), say = t => { if (msg) { msg.className = 'pf-msg'; msg.textContent = t; } };
        const kind = $('pfTitle') && $('pfTitle').className === 'death' ? 'death' : 'win';
        say('Creando tarjeta...');
        try {
            const c = await make(kind), blob = await new Promise(r => c.toBlob(r, 'image/png'));
            const f = new File([blob], 'scarlet-starfall.png', { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f], title: 'Scarlet Starfall', text: '¡Mira mi puntaje en Scarlet Starfall! ¿Puedes superarme? ' + location.href }); say('¡Tarjeta compartida!'); }
            else { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'scarlet-starfall.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); say('Imagen descargada: compártela donde quieras.'); }
        } catch (e) { if (e && e.name !== 'AbortError') say('No se pudo crear la tarjeta.'); else say(''); }
    }
    setInterval(() => {   // inyecta el botón COMPARTIR cuando se abre la pantalla de fin de partida
        if (!window.PerfilOpen || $('pfShare')) return;
        const row = document.querySelector('#perfilOverlay .pf-btns'); if (!row) return;
        const b = document.createElement('button'); b.type = 'button'; b.id = 'pfShare'; b.className = 'pf-skip'; b.textContent = 'COMPARTIR'; b.onclick = share; row.appendChild(b);
    }, 400);
    window.ShareCard = { make, share };
})();
