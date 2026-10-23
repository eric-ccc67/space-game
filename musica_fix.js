// ============================================================================
//  musica_fix.js — v50 · REFUERZO DE LA MÚSICA (.mp3)
// ----------------------------------------------------------------------------
//  Arregla los casos en que la música no suena aunque los .mp3 estén bien (sobre todo en móviles):
//   1) DESBLOQUEO: iPhone/Android solo activan el audio con touchend/pointerup/click (no con touchstart).
//      Se reanudan los dos contextos de audio y se reproduce un silencio mínimo para destrabar iOS.
//   2) INTERRUPCIONES: al bloquear el móvil, cambiar de app o volver a la pestaña, el audio se queda parado
//      ("suspended"/"interrupted"). Se reanuda solo al volver.
//   3) VIGILANTE (cada 1 s): si la pista debería sonar y no suena, la reinicia; si la decodificación se atasca
//      más de 10 s, cambia al reproductor <audio> normal.
//   4) AVISO: si ningún .mp3 se pudo cargar (carpeta "musica" sin subir, ruta mal), sale un aviso corto.
//  Se carga DESPUÉS de juego.js. Si lo quitas, el juego queda como antes.  Consola: MusicFix.status()
// ============================================================================
(function () {
    'use strict';
    if (typeof LoopTrack === 'undefined' || typeof getMusicCtx !== 'function') return;

    const ctxs = () => [typeof _musicCtx !== 'undefined' ? _musicCtx : null, typeof audioCtx !== 'undefined' ? audioCtx : null];
    function unlock() {
        ctxs().forEach(c => {
            if (!c || c.state === 'running' || c.state === 'closed') return;
            try {
                c.resume().catch(() => {});
                const s = c.createBufferSource(); s.buffer = c.createBuffer(1, 1, 22050); s.connect(c.destination); s.start(0);   // silencio para iOS
            } catch (e) {}
        });
    }
    ['touchend', 'pointerup', 'pointerdown', 'keydown', 'click'].forEach(ev => window.addEventListener(ev, unlock, { passive: true }));
    document.addEventListener('visibilitychange', () => { if (!document.hidden) unlock(); });
    window.addEventListener('pageshow', unlock);

    let warned = false, stuck = 0;
    function toast() {
        if (warned || typeof document === 'undefined') return; warned = true;
        const d = document.createElement('div');
        d.textContent = '🔇 No se pudo cargar la música. Revisa que la carpeta "musica" esté subida junto al juego.';
        d.style.cssText = 'position:fixed;left:50%;bottom:14px;transform:translateX(-50%);max-width:90%;z-index:99999;background:rgba(0,0,0,.85);color:#fff;font:12px sans-serif;padding:8px 12px;border-radius:8px;text-align:center';
        document.body.appendChild(d); setTimeout(() => d.remove(), 9000);
    }
    setInterval(() => {
        try {
            if (document.hidden) return;
            const c = typeof _musicCtx !== 'undefined' ? _musicCtx : null;
            if (c && c.state === 'interrupted') c.resume().catch(() => {});
            const tr = Object.keys(musicCache).map(k => musicCache[k]);
            if (tr.length && tr.every(x => x._ok === false)) toast();
            const t = typeof currentBGM !== 'undefined' ? currentBGM : null;
            if (!t || !t._want || t._el || !c) return;
            if (t._buf && c.state === 'running' && !t._src) t._startSrc();                      // debía sonar y no suena
            if (!t._buf && t._ok === null) { if (++stuck > 10) { stuck = 0; t._fallback(); } } else stuck = 0;   // decodificación atascada
        } catch (e) {}
    }, 1000);

    window.MusicFix = {
        status() {
            const c = typeof _musicCtx !== 'undefined' ? _musicCtx : null, t = typeof currentBGM !== 'undefined' ? currentBGM : null;
            return { audio: c && c.state, volumen: bgmVolume, pista: t && t.file, cargada: t && !!t._buf, sonando: t && (t._playing || (t._el && !t._el.paused)),
                pistas: Object.keys(musicCache).map(k => k + ':' + musicCache[k]._ok) };
        }
    };
})();
