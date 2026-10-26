/* Scarlet Starfall · service worker (v43)
   - Guarda el juego en el teléfono para poder abrirlo sin conexión (la música y el ranking necesitan haberse cargado antes / conexión).
   - HTML, JS y CSS: red primero (así las actualizaciones llegan solas) y caché si no hay red.
   - Música, imágenes e iconos: caché primero.
   - NUNCA se guarda el ranking (api.php / api/*).
   Para forzar que todos descarguen una versión nueva, cambia CACHE. */
const CACHE = 'space-game-v62';
const CORE = [
    './', 'index.html', 'manifest.webmanifest',
    'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png',
    "aliados.js",
    "arcoiris_extra.js",
    "choque.js",
    "combo.js",
    "impact_fx.js",
    "especiales.js",
    "eventos_jefes.js",
    "fondo_jefes.js",
    "eventos_fase.js",
    "calidad_dinamica.js",
    "musica_fix.js",
    "historia_compartir.js",
    "hud_telefono.js",
    "tutorial_comic.js",
    "creditos.js",
    "deathfx.js",
    "sprites8bit_plus.js",
    "hud_tarjetas.js",
    "ia_adaptativa.js",
    "invasor.js",
    "items_sprites.js",
    "jefes/dinamicos.js",
    "jefes/j1_kyubi.js",
    "jefes/j2_yeti.js",
    "jefes/j3_kraken.js",
    "jefes/j4_arana.js",
    "jefes/j5_archiliche.js",
    "jefes/j6_coloso.js",
    "jefes/j7_ojo.js",
    "jefes/motor.js",
    "juego.js",
    "motor.js",
    "naves_fx.js",
    "perfil.js",
    "skins_fx.js",
    "skins_retro.js",
    "spawn_director.js",
    'musica/menu.mp3'
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
    e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('space-game-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
    const req = e.request;
    if (req.method !== 'GET') return;
    const url = new URL(req.url);
    if (url.pathname.indexOf('/api') === 0 || url.pathname.endsWith('api.php')) return;      // ranking: siempre en vivo
    if (req.headers.has('range')) return;                                                    // audio por partes: que lo resuelva la red
    const sameOrigin = url.origin === self.location.origin;
    const isFont = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
    if (!sameOrigin && !isFont) return;

    const isCode = req.mode === 'navigate' || /\.(html|js|css|json|webmanifest)$/.test(url.pathname) || url.pathname.endsWith('/');
    if (isCode) {
        e.respondWith(fetch(req).then(r => {
            if (r && r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
            return r;
        }).catch(() => caches.match(req).then(r => r || caches.match('index.html'))));
        return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => {
        if (r && (r.ok || r.type === 'opaque') && r.status !== 206) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
        return r;
    })));
});
