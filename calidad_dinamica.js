// ============================================================================
//  calidad_dinamica.js — v49 · CALIDAD GRÁFICA ADAPTATIVA (casi invisible)
// ----------------------------------------------------------------------------
//  Reduce SOLO el dibujo (estelas, brillos, sombras) usando el modo ligero que ya existe en el juego,
//  y solo en lo que el jugador casi no mira. Hitboxes, daño y movimiento NO se tocan.
//   1) DISPARAS DESDE ABAJO: si tu nave está en la parte baja y estás disparando, los enemigos y balas
//      de la franja SUPERIOR de la pantalla se dibujan en calidad ligera.
//   2) MUCHAS BALAS: si hay muchas balas (o el juego va por debajo de ~45 FPS), las balas lejanas a tu nave
//      y las de la mitad superior pasan a calidad ligera. Las que están cerca de ti siguen en calidad normal.
//  Con histéresis (no parpadea) y coste mínimo por cuadro. Se carga DESPUÉS de juego.js; si lo quitas, todo igual.
//  Consola: CalidadDinamica.cfg.enabled = false · CalidadDinamica.state
// ============================================================================
(function () {
    'use strict';
    if (typeof Bullet === 'undefined' || typeof Enemy === 'undefined' || typeof bullets === 'undefined') return;

    const CFG = {
        enabled: true,
        MANY_ON: 150, MANY_ON_SLOW: 90,   // balas totales para activar (normal / si va lento)
        SLOW_MS: 22,                      // tiempo de cuadro medio (ms) que se considera "lento"
        TOP: 0.30,                        // franja superior (fracción del alto) que se aligera al disparar desde abajo
        BOTTOM: 0.72,                     // la nave cuenta como "abajo" si está por debajo de esta fracción del alto
        NEAR: 180                         // las balas a menos de estos píxeles de tu nave no se aligeran
    };
    const ST = { many: false, bottomFire: false, ms: 16, lowCount: 0 };
    let last = 0;

    function tick() {
        const now = performance.now();
        if (last) ST.ms += (Math.min(now - last, 100) - ST.ms) * 0.05;   // media móvil del tiempo de cuadro
        last = now;
        if (!CFG.enabled || typeof isPlaying === 'undefined' || !isPlaying || currentMode === 'clasico' || typeof player === 'undefined' || !player) { ST.many = ST.bottomFire = false; return; }
        const total = bullets.length + enemyBullets.length;
        const th = ST.ms > CFG.SLOW_MS ? CFG.MANY_ON_SLOW : CFG.MANY_ON;
        ST.many = ST.many ? total > th * 0.75 : total > th;                  // histéresis: apaga al 75 %
        const low = player.y > playAreaH * CFG.BOTTOM, firing = bullets.length >= 4;
        ST.bottomFire = ST.bottomFire ? (low && bullets.length >= 1) : (low && firing);
    }

    function lowBullet(b) {
        if (ST.bottomFire && b.y < playAreaH * CFG.TOP) return true;
        if (!ST.many) return false;
        if (b.y < playAreaH * 0.5) return true;
        const dx = b.x - (player.x + player.width / 2), dy = b.y - (player.y + player.height / 2);
        return dx * dx + dy * dy > CFG.NEAR * CFG.NEAR;
    }
    const lowEnemy = e => ST.bottomFire && !e.isBoss && e.y < playAreaH * CFG.TOP;

    function wrap(proto, test) {
        const orig = proto.draw;
        proto.draw = function (a) {
            if ((!ST.many && !ST.bottomFire) || performanceMode || !test(this)) return orig.call(this, a);
            performanceMode = true; ST.lowCount++;
            try { return orig.call(this, a); } finally { performanceMode = false; }
        };
    }
    wrap(Bullet.prototype, lowBullet);
    wrap(Enemy.prototype, lowEnemy);

    const _hud = window.drawHud;
    window.drawHud = function () {
        try { tick(); } catch (e) { ST.many = ST.bottomFire = false; }
        return _hud.apply(this, arguments);
    };
    window.CalidadDinamica = { cfg: CFG, state: ST };
})();
