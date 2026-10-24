// ============================================================================
//  creditos.js — v55 · CRÉDITOS (opción "Créditos" del menú principal)
// ----------------------------------------------------------------------------
//  Solo muestra a los autores/propietarios de los personajes, juegos y obras en las que se inspira este juego.
//  Para añadir o quitar algo edita la lista CREDITS (abajo). La música (Touhou 3, 4 y 5) está en la lista MUSIC.
//  Abrir desde consola: Creditos.open()
// ============================================================================
(function () {
    'use strict';
    const CREDITS = [
        { t: 'TOUHOU PROJECT', who: 'ZUN · Team Shanghai Alice', what: 'Estilo "danmaku" (balas, graze, bombas), Reimu Hakurei, Marisa Kirisame y el Master Spark.' },
        { t: 'DRAGON BALL', who: 'Akira Toriyama · Shueisha · Toei Animation', what: 'Goku, el Kamehameha, el Super Saiyajin y las Esferas del Dragón.' },
        { t: 'DRAGON BALL Z: BUDOKAI TENKAICHI 3', who: 'Spike · Bandai Namco', what: 'Inspiración de la barra de vida de los jefes.' },
        { t: 'SUPER MARIO', who: 'Nintendo', what: 'Enemigos y la escena de la moneda al caer un mini jefe (New Super Mario Bros).' },
        { t: 'THE LEGEND OF ZELDA · POKÉMON', who: 'Nintendo · Game Freak', what: 'El pitido de aviso con poca vida.' },
        { t: 'UNDERTALE', who: 'Toby Fox', what: 'La animación de muerte de la nave y el tutorial con Estrellita (inspirado en Flowey).' },
        { t: 'PAC-MAN', who: 'Toru Iwatani · Bandai Namco', what: 'La nave Comecocos y los fantasmas.' },
        { t: 'GALAGA', who: 'Bandai Namco', what: 'La nave Caza Estelar y el rayo tractor.' },
        { t: 'SPACE INVADERS', who: 'Tomohiro Nishikado · Taito', what: 'El Cañón Invasor, el modo clásico y los invasores.' },
        { t: 'ASTEROIDS · PONG', who: 'Atari', what: 'La nave Vector Roca y los minijuegos del jefe secreto.' },
        { t: 'TETRIS', who: 'Alexey Pajitnov', what: 'Minijuego del jefe secreto.' },
        { t: 'DEADPOOL', who: 'Rob Liefeld · Fabian Nicieza · Marvel', what: 'Inspiración del humor y las cajas de narrador del tutorial.' }
    ];
    // Música: escribe aquí cada pista con su autor, por ejemplo:  { t: 'menu.mp3', who: 'Nombre del compositor' }
    const MUSIC = [
        { t: 'TOUHOU 3 · Touhou Yumejikuu ~ Phantasmagoria of Dim.Dream', who: 'ZUN · Amusement Makers' },
        { t: 'TOUHOU 4 · Touhou Kaikidan ~ Lotus Land Story', who: 'ZUN · Amusement Makers' },
        { t: 'TOUHOU 5 · Touhou Kaeidzuka ~ Mystic Square', who: 'ZUN · Amusement Makers' }
    ];

    let el = null, open = false;
    const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    function build() {
        if (el) return;
        const st = document.createElement('style');
        st.textContent = '#crOv{position:fixed;inset:0;z-index:99990;background:rgba(2,0,8,.94);display:none;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;font-family:"Cinzel","Noto Serif JP",Georgia,serif}' +
            '#crOv.on{display:flex}#crBox{position:relative;width:min(620px,100%);max-height:100%;display:flex;flex-direction:column;border:2px solid #b3203a;background:linear-gradient(180deg,#14040c,#07020a);box-shadow:0 0 34px rgba(210,30,60,.35);border-radius:6px}' +
            '#crBox h2{margin:0;padding:16px 14px 6px;text-align:center;color:#ffd98a;font-size:22px;letter-spacing:6px;text-shadow:0 0 14px #a50f28}' +
            '#crSub{text-align:center;color:#c89;font:12px/1.4 Georgia,serif;padding:0 14px 10px}#crList{overflow:auto;padding:4px 16px 10px;-webkit-overflow-scrolling:touch}' +
            '.cr-i{padding:9px 0;border-top:1px solid rgba(255,120,150,.18)}.cr-t{color:#ff8aa0;font-weight:800;font-size:14px;letter-spacing:2px}.cr-w{color:#ffe9b8;font:700 13px Georgia,serif;margin-top:2px}.cr-d{color:#bba;font:12px/1.4 Georgia,serif;margin-top:2px}' +
            '.cr-s{color:#ffd98a;font-weight:800;letter-spacing:4px;text-align:center;margin:12px 0 2px;font-size:13px}.cr-note{color:#998;font:italic 11px/1.5 Georgia,serif;text-align:center;padding:10px 14px 4px}' +
            '#crClose{margin:8px auto 14px;padding:10px 26px;background:#2a0a14;color:#ffd98a;border:2px solid #b3203a;border-radius:4px;font:800 13px Cinzel,Georgia,serif;letter-spacing:3px;cursor:pointer}#crClose:hover,#crClose:focus{background:#b3203a;color:#fff;outline:none}';
        document.head.appendChild(st);
        el = document.createElement('div'); el.id = 'crOv';
        el.innerHTML = '<div id="crBox"><h2>CRÉDITOS</h2><div id="crSub">Este juego es un homenaje de fans. Todos los personajes, juegos y obras mencionados pertenecen a sus respectivos autores y dueños.</div><div id="crList"></div><button id="crClose" type="button">VOLVER</button></div>';
        document.body.appendChild(el);
        el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
        el.querySelector('#crClose').addEventListener('click', close);
        window.addEventListener('keydown', e => {
            if (!open) return; const k = e.key;
            if (k === 'Escape' || k === 'Enter' || k === 'x' || k === 'X' || k === 'z' || k === 'Z' || k === ' ' || k === 'Backspace') { close(); }
            else if (k === 'ArrowDown' || k === 'ArrowUp') { const l = el.querySelector('#crList'); l.scrollTop += k === 'ArrowDown' ? 50 : -50; }
            e.preventDefault(); e.stopPropagation();
        }, true);
        window.addEventListener('keyup', e => { if (open) { e.preventDefault(); e.stopPropagation(); } }, true);
    }
    function render() {
        let h = CREDITS.map(c => '<div class="cr-i"><div class="cr-t">' + esc(c.t) + '</div><div class="cr-w">' + esc(c.who) + '</div><div class="cr-d">' + esc(c.what) + '</div></div>').join('');
        if (MUSIC.length) h += '<div class="cr-s">♪ MÚSICA ♪</div>' + MUSIC.map(c => '<div class="cr-i"><div class="cr-t">' + esc(c.t) + '</div><div class="cr-w">' + esc(c.who) + '</div></div>').join('');
        h += '<div class="cr-note">Gracias por jugar.</div>';
        el.querySelector('#crList').innerHTML = h;
    }
    function openC() { build(); render(); el.classList.add('on'); open = true; el.querySelector('#crList').scrollTop = 0; setTimeout(() => { try { el.querySelector('#crClose').focus(); } catch (e) {} }, 30); }
    function close() { if (!el) return; el.classList.remove('on'); open = false; }
    window.Creditos = { open: openC, close, list: CREDITS, music: MUSIC };
})();
