// ============================================================================
// perfil.js — PERFIL DE JUGADOR (v16)
// ----------------------------------------------------------------------------
//  · Al terminar el último nivel (nivel 6; nivel 7 "Luna Sangrante" en LUNÁTICO) aparece una
//    pantalla donde escribes tu nombre y se guarda tu partida: puntaje, ítems, powerups,
//    monedas, gemas, enemigos, bombas, nivel alcanzado...
//  · Al perder definitivamente (FIN DEL JUEGO) también se abre esa pantalla. El menú YA NO pide nombre.
//  · El último nombre usado se recuerda en este navegador y aparece ya escrito en esa pantalla. Cada nueva partida actualiza tu perfil: si superas tu
//    mejor puntaje, se reemplaza; si no, se conserva el mejor.
//  · Si el servidor no responde, la partida se guarda en el navegador y se reenvía después.
// Se carga DESPUÉS de juego.js (comparte sus variables globales: score, currentDiff, runStats...).
// ============================================================================
const Perfil = (function () {
    'use strict';
    const LS_NAME = 'sg_perfil_name_v1', LS_PENDING = 'sg_perfil_pending_v1';
    const $ = id => document.getElementById(id);
    const lsGet = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
    const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

    // ------------------------------------------------------------------ nombre
    function clean(raw) {
        return String(raw || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 10);
    }
    const nameInput = () => $('playerName');
    function currentName() { const i = nameInput(); return clean(i ? i.value : '') || clean(lsGet(LS_NAME)); }
    function setName(n) {
        n = clean(n); const i = nameInput();
        if (i) i.value = n;
        lsSet(LS_NAME, n);
    }
    // El nombre recordado se rellena en el menú; y lo que escribas allí también se recuerda.
    function initName() {
        const i = nameInput(); if (!i) return;
        const saved = clean(lsGet(LS_NAME));
        if (saved && !i.value.trim()) i.value = saved;
        i.addEventListener('input', () => { lsSet(LS_NAME, clean(i.value)); });
    }

    // ----------------------------------------------------------- datos de la partida
    function collect(kind) {
        const s = (typeof runStats !== 'undefined' && runStats) || {};
        const pu = {};
        Object.keys(s).forEach(k => { if (k.indexOf('pu_') === 0) pu[k.slice(3)] = s[k]; });
        let coins = 0, gems = 0;
        try { if (typeof Extras !== 'undefined' && Extras.coinCount) coins = Extras.coinCount(); } catch (e) {}
        try { if (typeof Shop !== 'undefined') gems = Shop.gems | 0; } catch (e) {}
        return {
            score: Math.max(0, score | 0),
            difficulty: currentDiff,
            mode: currentMode,
            level: Math.max(1, Math.min(255, currentWave | 0)),
            victory: kind === 'win' || kind === 'clear',
            items: s.items | 0,
            powerups: s.powerups | 0,
            powerupsDetail: pu,
            kills: s.kills | 0,
            bombs: s.bombs | 0,
            graze: s.graze | 0,
            coins, gems,
            powerLevel: Math.max(1, powerLevel | 0)
        };
    }

    // ------------------------------------------------------------------ red
    function post(run) {
        return fetch('api.php?action=saveRun', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(run)
        }).then(r => r.json().then(j => { if (!r.ok || !j.success) throw new Error(j.error || 'error'); return j; }));
    }
    function getPending() { try { const a = JSON.parse(lsGet(LS_PENDING) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
    function setPending(a) { lsSet(LS_PENDING, JSON.stringify(a.slice(-20))); }
    function flushPending() {
        const a = getPending(); if (!a.length) return;
        setPending([]);
        a.reduce((p, run) => p.then(() => post(run)).catch(() => { setPending(getPending().concat([run])); }), Promise.resolve())
            .then(() => { try { loadScores(); } catch (e) {} });
    }
    function send(run) {
        return post(run).then(res => { try { loadScores(); } catch (e) {} flushPending(); return res; })
            .catch(err => { setPending(getPending().concat([run])); throw err; });
    }

    // ------------------------------------------------------------------ pantalla
    const CSS = `
#perfilOverlay{position:absolute;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(6,2,16,.88);font-family:"Press Start 2P",monospace;color:#fff;overflow-y:auto;padding:12px;box-sizing:border-box}
#perfilOverlay.hidden{display:none}
#perfilOverlay .pf-card{width:min(560px,100%);margin:auto;border:3px solid #ffe27a;border-radius:10px;background:linear-gradient(180deg,#1b0c3a,#0d0620);box-shadow:0 0 30px rgba(255,226,122,.35);padding:18px 18px 16px;text-align:center;box-sizing:border-box}
#perfilOverlay h2{margin:0 0 6px;font-size:20px;letter-spacing:2px;color:#ffe27a;line-height:1.3}
#perfilOverlay h2.death{color:#ff4a5c}
#perfilOverlay .pf-sub{font-size:9px;color:#9ab;margin-bottom:12px;line-height:1.6}
#perfilOverlay .pf-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0 0 10px}
#perfilOverlay .pf-stat{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.18);border-radius:6px;padding:8px 4px}
#perfilOverlay .pf-stat b{display:block;font-size:13px;color:#7cfcfc;margin-bottom:5px}
#perfilOverlay .pf-stat span{font-size:7px;color:#b8c4d4;letter-spacing:1px}
#perfilOverlay .pf-stat.big{grid-column:span 3}
#perfilOverlay .pf-stat.big b{font-size:20px;color:#ffe27a}
#perfilOverlay .pf-pu{font-size:7px;color:#9ab;line-height:1.7;margin-bottom:10px;min-height:10px}
#perfilOverlay label{display:block;font-size:9px;color:#ffe27a;margin:6px 0}
#perfilOverlay input{width:100%;max-width:300px;box-sizing:border-box;font-family:inherit;font-size:14px;text-align:center;padding:11px 8px;border-radius:6px;border:3px solid #7cfcfc;background:#050a16;color:#fff;outline:none}
#perfilOverlay input:focus{border-color:#ffe27a}
#perfilOverlay input[readonly]{opacity:.7;border-color:#555}
#perfilOverlay .pf-msg{min-height:24px;margin:10px 0 4px;font-size:9px;line-height:1.7;color:#9ab}
#perfilOverlay .pf-msg.ok{color:#6dff9a}
#perfilOverlay .pf-msg.err{color:#ff8a8a}
#perfilOverlay .pf-btns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:6px}
#perfilOverlay button{font-family:inherit;font-size:11px;padding:12px 18px;border-radius:6px;border:3px solid #fff;background:#2a1a60;color:#fff;cursor:pointer}
#perfilOverlay button.pf-main{background:#b8860b;border-color:#ffe27a}
#perfilOverlay button.pf-skip{background:transparent;border-color:#667;color:#aab;font-size:9px}
#perfilOverlay button:disabled{opacity:.5;cursor:default}
@media (max-width:520px),(max-height:520px){#perfilOverlay h2{font-size:14px}#perfilOverlay .pf-card{padding:12px}#perfilOverlay .pf-stat b{font-size:10px}#perfilOverlay .pf-stat.big b{font-size:15px}}
`;
    let el = null, st = null;   // st = estado de la pantalla abierta
    window.PerfilOpen = false;

    function build() {
        if (el) return el;
        const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
        el = document.createElement('div'); el.id = 'perfilOverlay'; el.className = 'hidden';
        el.innerHTML = '<div class="pf-card">' +
            '<h2 id="pfTitle"></h2><div class="pf-sub" id="pfSub"></div>' +
            '<div class="pf-grid" id="pfGrid"></div><div class="pf-pu" id="pfPu"></div>' +
            '<label for="pfName">TU NOMBRE DE PILOTO</label>' +
            '<input id="pfName" type="text" maxlength="10" autocomplete="off" spellcheck="false" placeholder="Máx. 10 letras">' +
            '<div class="pf-msg" id="pfMsg"></div>' +
            '<div class="pf-btns"><button type="button" class="pf-main" id="pfSave">GUARDAR</button>' +
            '<button type="button" class="pf-skip" id="pfSkip">NO GUARDAR</button></div></div>';
        (document.getElementById('gameContainer') || document.body).appendChild(el);
        // Mientras se escribe, las teclas NO llegan al juego (P/Esc pausan, Espacio dispara, Z es bomba...).
        ['keydown', 'keyup', 'keypress'].forEach(t => el.addEventListener(t, e => {
            e.stopPropagation();
            if (t === 'keydown' && e.key === 'Enter' && e.target.id === 'pfName') { e.preventDefault(); $('pfSave').click(); }
        }));
        $('pfSave').addEventListener('click', onSave);
        $('pfSkip').addEventListener('click', () => close());
        return el;
    }

    const DIFF_TXT = { facil: 'FÁCIL', medio: 'MEDIO', dificil: 'DIFÍCIL', lunatico: 'LUNÁTICO' };
    function fillStats(run, kind) {
        const t = $('pfTitle');
        t.className = kind === 'death' ? 'death' : '';
        t.textContent = kind === 'death' ? 'FIN DEL JUEGO' : (kind === 'win' ? '¡GANASTE!' : '¡JUEGO COMPLETADO!');
        const lvl = typeof activeLevelCount === 'function' ? Math.min(run.level, activeLevelCount()) : run.level;
        $('pfSub').textContent = (DIFF_TXT[run.difficulty] || run.difficulty) + ' · NIVEL ' + lvl +
            (kind === 'death' ? '' : ' SUPERADO');
        const cell = (v, l, big) => '<div class="pf-stat' + (big ? ' big' : '') + '"><b>' + v + '</b><span>' + l + '</span></div>';
        $('pfGrid').innerHTML =
            cell(String(run.score).replace(/\B(?=(\d{3})+(?!\d))/g, '.'), 'PUNTAJE', true) +
            cell(run.items, 'ÍTEMS') + cell(run.powerups, 'POWERUPS') + cell(run.coins + '/7', 'MONEDAS') +
            cell(run.gems, 'GEMAS') + cell(run.kills, 'ENEMIGOS') + cell(run.bombs, 'BOMBAS');
        const names = Object.keys(run.powerupsDetail || {});
        $('pfPu').textContent = names.length ? names.map(n => n + ' x' + run.powerupsDetail[n]).join('  ·  ') : '';
    }

    function showEnd(kind, done) {
        if (st) return;
        build();
        const run = collect(kind);
        st = { kind, run, done: done || function () {}, saved: false, busy: false };
        fillStats(run, kind);
        const inp = $('pfName'); inp.value = currentName(); inp.readOnly = false;
        $('pfMsg').className = 'pf-msg'; $('pfMsg').textContent = inp.value ? 'Se guardará en el perfil de ' + inp.value + '.' : 'Escribe tu nombre para registrar tu puntaje.';
        const sv = $('pfSave'); sv.disabled = false; sv.textContent = 'GUARDAR';
        $('pfSkip').style.display = '';
        el.classList.remove('hidden'); window.PerfilOpen = true;
        try { if (typeof stopShoot === 'function') stopShoot(); } catch (e) {}
        setTimeout(() => { try { inp.focus(); inp.select(); } catch (e) {} }, 60);
    }

    function close() {
        if (!st) return;
        const cb = st.done; st = null;
        el.classList.add('hidden'); window.PerfilOpen = false;
        try { document.activeElement && document.activeElement.blur(); } catch (e) {}
        try { cb(); } catch (e) { console.log(e); }
    }

    function onSave() {
        if (!st || st.busy) return;
        if (st.saved) { close(); return; }
        const inp = $('pfName'), msg = $('pfMsg'), name = clean(inp.value);
        if (!name) { msg.className = 'pf-msg err'; msg.textContent = 'Escribe un nombre (máx. 10 letras).'; inp.focus(); return; }
        st.busy = true; $('pfSave').disabled = true; msg.className = 'pf-msg'; msg.textContent = 'Guardando...';
        setName(name);
        const run = Object.assign({}, st.run, { name });
        const wasWin = st.kind === 'win';
        send(run).then(res => {
            if (wasWin) fetch('api.php?action=addStar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
                .then(() => { try { loadScores(); } catch (e) {} }).catch(() => {});
            msg.className = 'pf-msg ok';
            msg.textContent = (res.isNewBest ? '¡NUEVO RÉCORD PERSONAL! ' : 'Tu mejor puntaje: ' + res.best + '. ') + 'Puesto #' + res.rank + ' del ranking.';
            finishSave();
        }).catch(() => {
            msg.className = 'pf-msg err';
            msg.textContent = 'No hay conexión con el servidor. Tu partida quedó guardada en este navegador y se enviará después.';
            finishSave();
        });
        function finishSave() {
            if (!st) return;
            st.busy = false; st.saved = true; inp.readOnly = true;
            const sv = $('pfSave'); sv.disabled = false; sv.textContent = 'CONTINUAR';
            $('pfSkip').style.display = 'none';
            try { sv.focus(); } catch (e) {}
        }
    }

    // --------------------------------------------------- fin de partida (lo llama juego.js)
    // kind: 'death' | 'win' | 'clear'.  cb: qué hacer al terminar (volver al menú / seguir jugando).
    function endRun(kind, cb) {
        cb = cb || function () {};
        if (kind === 'death') {
            // Derrota definitiva (modo principal o infinito): siempre se pide el nombre para el ranking.
            setTimeout(() => showEnd('death', cb), 1500);
        } else if (kind === 'clear') {
            showEnd('clear', cb);
        } else {
            setTimeout(() => showEnd(kind, cb), kind === 'win' ? 2500 : 1500);
        }
    }

    initName();
    flushPending();
    return { endRun, showEnd, currentName, collect, flushPending };
})();
