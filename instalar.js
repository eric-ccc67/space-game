/* v43 · INSTALAR EN EL TELÉFONO (PWA)
   - Registra el service worker (sw.js) y recoge el aviso de instalación del navegador.
   - window.InstallApp.open(): instala con un toque en Android/Chrome/Edge; en iPhone/otros muestra los pasos.
   - Se carga en <head> (antes que juego.js) para no perderse el evento beforeinstallprompt. */
(function () {
    'use strict';
    var deferred = null, modal = null, styled = false;

    function standalone() {
        try {
            return (window.matchMedia && (matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches)) || window.navigator.standalone === true;
        } catch (e) { return false; }
    }
    function platform() {
        var ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
        if (/Android/i.test(ua)) return 'android';
        return 'desktop';
    }
    function inAppBrowser() { return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|TikTok|Snapchat|; wv\)/i.test(navigator.userAgent || ''); }

    window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferred = e; });
    window.addEventListener('appinstalled', function () { deferred = null; close(); });

    if ('serviceWorker' in navigator && (window.isSecureContext || location.hostname === 'localhost')) {
        window.addEventListener('load', function () { navigator.serviceWorker.register('sw.js').catch(function () {}); });
    }

    function css() {
        if (styled) return; styled = true;
        var s = document.createElement('style');
        s.textContent =
            '#installModal{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;background:rgba(0,4,10,.82);padding:14px;animation:insFade .2s ease-out}' +
            '@keyframes insFade{from{opacity:0}to{opacity:1}}' +
            '#installModal .ins-box{width:min(94vw,470px);max-height:88vh;overflow:auto;background:linear-gradient(180deg,rgba(6,22,40,.97),rgba(3,10,20,.98));border:2px solid #0ff;box-shadow:0 0 26px rgba(0,255,255,.35),inset 0 0 30px rgba(255,0,255,.08);padding:20px 20px 16px;color:#dff;font-family:"VT323","Courier New",monospace;font-size:21px;line-height:1.25;text-align:left}' +
            '#installModal h2{margin:0 0 4px;font:14px/1.5 "Press Start 2P",monospace;color:#ffd84a;text-shadow:0 0 10px rgba(255,216,74,.6);text-align:center}' +
            '#installModal .ins-sub{text-align:center;color:#9cf;margin:0 0 12px;font-size:19px}' +
            '#installModal ol{margin:0 0 12px;padding-left:26px}#installModal li{margin:7px 0}' +
            '#installModal li b{color:#0ff;font-weight:normal}' +
            '#installModal .ins-warn{background:rgba(255,60,60,.12);border:1px solid #f66;color:#fbb;padding:7px 9px;margin:0 0 12px;font-size:18px}' +
            '#installModal .ins-ok{text-align:center;color:#8f8;font-size:23px;margin:10px 0 14px}' +
            '#installModal .ins-row{display:flex;gap:10px;flex-wrap:wrap}' +
            '#installModal button{flex:1 1 140px;font:10px/1.4 "Press Start 2P",monospace;padding:12px 8px;cursor:pointer;color:#fff;background:rgba(0,255,255,.12);border:2px solid #0ff;touch-action:manipulation}' +
            '#installModal button:hover,#installModal button:focus{background:rgba(0,255,255,.3);outline:none}' +
            '#installModal button.ins-go{border-color:#ffd84a;background:rgba(255,216,74,.18);color:#ffd84a}';
        document.head.appendChild(s);
    }

    function steps() {
        var p = platform();
        if (inAppBrowser()) return { t: 'ÁBRELO EN EL NAVEGADOR', sub: 'Este navegador integrado no puede instalar apps.', li: ['Toca los <b>tres puntos</b> o el icono de <b>compartir</b>.', 'Elige <b>Abrir en Chrome</b> (Android) o <b>Abrir en Safari</b> (iPhone).', 'Vuelve a este menú y toca <b>Descargar app</b>.'] };
        if (p === 'ios') return { t: 'INSTALAR EN iPHONE / iPAD', sub: 'Safari lo instala desde el menú Compartir:', li: ['Abre esta página en <b>Safari</b> (no en Chrome).', 'Toca el botón <b>Compartir</b> (el cuadrado con la flecha hacia arriba).', 'Baja y elige <b>«Añadir a pantalla de inicio»</b>.', 'Toca <b>Añadir</b>. ¡Listo! Ábrelo desde su icono: pantalla completa.'] };
        if (p === 'android') return { t: 'INSTALAR EN ANDROID', sub: 'Tu navegador no mostró el botón automático, hazlo así:', li: ['Toca el menú del navegador (<b>⋮</b>, arriba a la derecha).', 'Elige <b>«Instalar aplicación»</b> o <b>«Añadir a pantalla de inicio»</b>.', 'Confirma con <b>Instalar</b>. Aparecerá el icono en tu teléfono.'] };
        return { t: 'DESCARGAR EN EL TELÉFONO', sub: 'Abre este mismo juego desde el móvil y se instala:', li: ['En tu <b>teléfono</b>, abre este enlace (usa «Copiar enlace» y envíatelo).', '<b>Android (Chrome):</b> menú ⋮ → <b>Instalar aplicación</b>.', '<b>iPhone (Safari):</b> Compartir → <b>Añadir a pantalla de inicio</b>.', 'En ordenador (Chrome/Edge) también puedes usar el icono de instalar de la barra de direcciones.'] };
    }

    function close() {
        if (modal) { modal.remove(); modal = null; }
        window.removeEventListener('keydown', onKey, true);
    }
    function onKey(e) {                                   // mientras el aviso está abierto, el menú del juego no debe reaccionar
        if (!modal) return;
        e.stopImmediatePropagation();
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === 'x' || e.key === 'X' || e.key === 'z' || e.key === 'Z') { e.preventDefault(); close(); }
    }
    function copyLink(btn) {
        var url = location.origin + location.pathname.replace(/index\.html$/, '');
        var done = function () { btn.textContent = '¡COPIADO!'; setTimeout(function () { btn.textContent = 'COPIAR ENLACE'; }, 1600); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () { window.prompt('Copia este enlace:', url); });
        else window.prompt('Copia este enlace:', url);
    }
    function show(info, installed) {
        css(); close();
        modal = document.createElement('div'); modal.id = 'installModal';
        var h = '<div class="ins-box" role="dialog" aria-modal="true"><h2>' + info.t + '</h2><p class="ins-sub">' + info.sub + '</p>';
        if (installed) h += '<div class="ins-ok">✔ Ya estás jugando la app instalada.</div>';
        else {
            if (!window.isSecureContext && location.hostname !== 'localhost') h += '<div class="ins-warn">Para instalar, el juego debe abrirse con <b>https://</b> (tu enlace de Vercel sí lo cumple).</div>';
            h += '<ol>' + info.li.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol>';
        }
        h += '<div class="ins-row">' + (installed ? '' : '<button type="button" data-a="copy">COPIAR ENLACE</button>') + '<button type="button" class="ins-go" data-a="close">ENTENDIDO</button></div></div>';
        modal.innerHTML = h;
        modal.addEventListener('click', function (e) {
            var a = e.target && e.target.getAttribute && e.target.getAttribute('data-a');
            if (a === 'close' || e.target === modal) close();
            else if (a === 'copy') copyLink(e.target);
        });
        document.body.appendChild(modal);
        window.addEventListener('keydown', onKey, true);
        var go = modal.querySelector('.ins-go'); if (go) go.focus();
    }

    function open() {
        if (standalone()) { show({ t: 'APP INSTALADA', sub: '' }, true); return; }
        if (deferred) {                                   // Android / Chrome / Edge: instalación con un toque
            var d = deferred; deferred = null;
            try { d.prompt(); if (d.userChoice && d.userChoice.then) d.userChoice.then(function () {}); return; } catch (e) {}
        }
        show(steps(), false);
    }

    window.InstallApp = { open: open, isInstalled: standalone, canPrompt: function () { return !!deferred; } };
})();
