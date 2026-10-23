// ============================================================================
//  eventos_fase.js — v46 · UN EVENTO ESPECIAL ÚNICO E INTERACTIVO POR CADA FASE (niveles 1-7)
// ----------------------------------------------------------------------------
//  Una vez por oleada (a ≈23 s, sin jefes ni mini jefes) arranca el evento de ese nivel:
//   1 FUEGOS FATUOS  · atrapa llamas que bajan en zigzag
//   2 ALUD           · muros de nieve con una abertura móvil: cuélate por ella (roce = graze)
//   3 BURBUJA DE AIRE· quédate dentro de la burbuja que se escapa para cargarla
//   4 TELARAÑA       · hilos que se marcan sobre ti y luego se tensan: sal de su línea
//   5 ALMAS          · recoge almas mientras calaveras te persiguen
//   6 TEMBLOR        · el suelo tiembla: ve al cuarto de pantalla seguro antes del golpe
//   7 MIRADA         · el Ojo te marca: muévete antes de que estalle
//  Si lo completas: escudo + puntos. Si fallas no pasa nada (solo pierdes el premio).
//  OPTIMIZADO: sin balas enemigas nuevas, sin sombras/gradientes, arrays fijos, 0 trabajo si no hay evento,
//  menos elementos en modo rendimiento. Se carga DESPUÉS de juego.js; si lo quitas todo sigue igual.
//  Consola: FaseEvents.force(1..7) · FaseEvents.stop() · FaseEvents.cfg.enabled = false
// ============================================================================
(function () {
    'use strict';
    if (typeof Player === 'undefined' || typeof enemies === 'undefined' || typeof createExplosion === 'undefined') return;

    const TAU = Math.PI * 2, S = Math.sin, C = Math.cos;
    const CFG = { enabled: true, START_AT: 1400 };
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const R = (a, b) => a + Math.random() * (b - a);
    const lite = () => { try { return !!performanceMode; } catch (e) { return false; } };
    const KD = { facil: 0.85, medio: 1, dificil: 1.1, lunatico: 1.2 };
    const K = () => KD[currentDiff] || 1;
    const W = () => playAreaW, H = () => playAreaH;
    const pcx = () => player.x + player.width / 2, pcy = () => player.y + player.height / 2;
    const hx = () => player.hitboxX() + 1.1, hy = () => player.hitboxY() + 1.1;
    const snd = n => { try { if (typeof window[n] === 'function') window[n](); } catch (e) {} };
    const FONT = s => s + 'px "Press Start 2P", monospace';

    let act = null, fired = false, lastWT = 0, hitCool = 0;
    const floats = [];
    function fl(x, y, txt, col) { if (floats.length < 8) floats.push({ x, y, t: 0, txt, col }); }

    function hurt() {
        if (hitCool > 0 || Date.now() <= invulnerableUntil) return;
        hitCool = 20;
        if (powerUps.shield > Date.now()) { try { createExplosion(pcx(), pcy(), '#0ff', 8, true); } catch (e) {} return; }
        try { if (typeof shipHitDamage === 'function' && shipHitDamage() === 0) return; } catch (e) {}
        createExplosion(pcx(), pcy(), player.color, 30);
        lives--; invulnerableUntil = Date.now() + (difficultySettings[currentDiff].invulMs || 2000);
        powerLevel = Math.max(1, Math.floor(powerLevel / 2)); enemiesDefeatedForPower = 0;
        powerPoints = Math.max(0, powerPoints - 50);
        screenShake = Math.max(screenShake, 14);
        if (lives <= 0) gameOver();
    }
    function reward(ms, pts) {
        powerUps.shield = Math.max(powerUps.shield, Date.now() + ms); score += pts;
        snd('playLevelUpSound'); fl(W() / 2, H() * 0.34, '+' + pts + '  ESCUDO', '#ffe066');
    }
    function segd(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay; const t = clamp(((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy), 0, 1);
        const X = ax + t * dx - px, Y = ay + t * dy - py; return Math.sqrt(X * X + Y * Y);
    }
    const circ = (x, y, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
    const quad = () => (hy() >= H() / 2 ? 2 : 0) + (hx() >= W() / 2 ? 1 : 0);

    const E = [];
    // ---------------------------------------------------------------- 1 · FUEGOS FATUOS
    E[0] = {
        name: 'FUEGOS FATUOS', hint: '¡Atrapa las llamas!', col: '#ffb050', dur: 800, rw: [5000, 1000],
        start(s) { s.n = lite() ? 5 : 6; s.got = 0; s.o = []; for (let i = 0; i < s.n; i++) s.o.push({ x: R(60, W() - 60), y: -20 - i * 70, p: R(0, TAU), v: R(0.9, 1.3), on: 1 }); },
        tick(s, t) {
            let live = 0; const px = pcx(), py = pcy();
            for (const o of s.o) {
                if (!o.on) continue;
                o.y += o.v; o.x = clamp(o.x + S(t * 0.05 + o.p) * 1.7, 20, W() - 20);
                if (o.y > H() + 20) { o.on = 0; continue; }
                const dx = o.x - px, dy = o.y - py;
                if (dx * dx + dy * dy < 676) { o.on = 0; s.got++; score += 150; fl(o.x, o.y, '+150', '#ffd070'); snd('playShootSound'); continue; }
                live++;
            }
            s.prog = s.got / s.n; return live === 0 && t > 60;
        },
        ok: s => s.got === s.n,
        draw(s, t) { for (const o of s.o) if (o.on) { circ(o.x, o.y, 11, 'rgba(255,140,40,0.25)'); circ(o.x, o.y, 5, '#ffd070'); ctx.fillStyle = 'rgba(255,120,30,0.5)'; ctx.fillRect(o.x - 2, o.y - 16, 4, 12); } }
    };
    // ---------------------------------------------------------------- 2 · ALUD
    E[1] = {
        name: 'ALUD', hint: '¡Cuélate por la abertura!', col: '#bff6ff', dur: 900, rw: [4000, 900],
        start(s) { s.n = 4; s.got = 0; s.w = []; for (let i = 0; i < 4; i++) s.w.push({ t0: 30 + i * 100, y: -30, gx: R(120, W() - 120), a: R(50, 110), p: R(0, TAU), gw: lite() ? 150 : 136, cx: 0, done: 0, hit: 0, gone: 0 }); },
        tick(s, t) {
            let alive = 0; const px = hx(), py = hy(), v = 2.3 * K();
            for (const w of s.w) {
                if (w.gone) continue; alive++;
                w.cx = clamp(w.gx + w.a * S(t * 0.03 + w.p), w.gw / 2 + 8, W() - w.gw / 2 - 8);
                if (t < w.t0) continue;
                w.y += v;
                if (!w.hit && py >= w.y && py <= w.y + 22 && Math.abs(px - w.cx) > w.gw / 2) { w.hit = 1; hurt(); }
                if (!w.done && w.y > py + 14) { w.done = 1; if (!w.hit) { s.got++; addGraze(1); score += 200; fl(px, py - 18, '+200', '#bff6ff'); } }
                if (w.y > H() + 30) w.gone = 1;
            }
            s.prog = s.got / s.n; return alive === 0;
        },
        ok: s => s.got === s.n,
        draw(s, t) {
            for (const w of s.w) {
                if (w.gone) continue; const g = w.gw / 2;
                if (t < w.t0) { if (t > w.t0 - 45) { ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + 0.25 * S(t * 0.5)) + ')'; ctx.fillRect(0, 0, w.cx - g, 4); ctx.fillRect(w.cx + g, 0, W(), 4); } continue; }
                ctx.fillStyle = 'rgba(215,240,255,0.88)'; ctx.fillRect(0, w.y, w.cx - g, 22); ctx.fillRect(w.cx + g, w.y, W() - w.cx - g, 22);
                ctx.fillStyle = '#fff'; ctx.fillRect(0, w.y + 18, w.cx - g, 4); ctx.fillRect(w.cx + g, w.y + 18, W() - w.cx - g, 4);
            }
        }
    };
    // ---------------------------------------------------------------- 3 · BURBUJA DE AIRE
    E[2] = {
        name: 'BURBUJA DE AIRE', hint: '¡Quédate dentro para cargarla!', col: '#8ff', dur: 1000, rw: [6000, 800],
        start(s) { s.b = { x: W() / 2, y: H() * 0.55, r: 56 }; s.p = R(0, TAU); s.m = 0; },
        tick(s, t) {
            const b = s.b; b.x = W() / 2 + W() * 0.34 * S(t * 0.017 + s.p); b.y = H() * 0.55 + H() * 0.2 * S(t * 0.023 + s.p * 1.7);
            const dx = pcx() - b.x, dy = pcy() - b.y;
            s.m = dx * dx + dy * dy < (b.r - 6) * (b.r - 6) ? Math.min(1, s.m + 1 / 210) : Math.max(0, s.m - 1 / 420);
            s.prog = s.m; return s.m >= 1;
        },
        ok: s => s.m >= 1,
        draw(s, t) {
            const b = s.b; circ(b.x, b.y, b.r, 'rgba(120,220,255,' + (0.16 + s.m * 0.22) + ')');
            ctx.lineWidth = 2; ctx.strokeStyle = '#8ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.stroke();
            ctx.lineWidth = 5; ctx.strokeStyle = '#ffe066'; ctx.beginPath(); ctx.arc(b.x, b.y, b.r - 10, -Math.PI / 2, -Math.PI / 2 + TAU * s.m); ctx.stroke();
            circ(b.x - b.r * 0.4, b.y - b.r * 0.4, 5, 'rgba(255,255,255,0.6)');
        }
    };
    // ---------------------------------------------------------------- 4 · TELARAÑA
    function webRound(s) {
        const n = 2 + (s.rd >= 2 ? 1 : 0); s.L = [];
        for (let i = 0; i < n; i++) { const th = R(0, Math.PI), dx = C(th), dy = S(th), cx = pcx() + R(-70, 70), cy = pcy() + R(-70, 70); s.L.push([cx - dx * 900, cy - dy * 900, cx + dx * 900, cy + dy * 900]); }
        s.ph = 0; s.k = 0; s.rh = 0;
    }
    E[3] = {
        name: 'TELARAÑA', hint: '¡Sal de la línea del hilo!', col: '#d9a0ff', dur: 900, rw: [4000, 600],
        start(s) { s.R = lite() ? 3 : 4; s.rd = 0; s.hit = 0; webRound(s); },
        tick(s) {
            s.k++; const warn = Math.round(75 / K());
            if (s.ph === 0 && s.k >= warn) { s.ph = 1; s.k = 0; screenShake = Math.max(screenShake, 4); }
            else if (s.ph === 1) {
                if (!s.rh) { const px = hx(), py = hy(); for (const l of s.L) if (segd(px, py, l[0], l[1], l[2], l[3]) < 6) { s.rh = 1; s.hit++; hurt(); break; } }
                if (s.k >= 14) { s.ph = 2; s.k = 0; s.rd++; if (!s.rh) { addGraze(1); score += 250; fl(pcx(), pcy() - 20, '+250', '#d9a0ff'); } }
            } else if (s.k >= 22) { if (s.rd >= s.R) return true; webRound(s); }
            s.prog = s.rd / s.R; return false;
        },
        ok: s => s.hit === 0,
        draw(s, t) {
            if (s.ph === 2) return; const fire = s.ph === 1;
            for (const l of s.L) {
                ctx.beginPath(); ctx.moveTo(l[0], l[1]); ctx.lineTo(l[2], l[3]);
                if (fire) { ctx.lineWidth = 12; ctx.strokeStyle = 'rgba(190,110,255,0.35)'; ctx.stroke(); ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.stroke(); }
                else { ctx.lineWidth = 1.5; ctx.strokeStyle = 'rgba(255,255,255,' + (0.25 + 0.35 * Math.abs(S(s.k * 0.3))) + ')'; ctx.stroke(); }
            }
            if (fire) player.draw();
        }
    };
    // ---------------------------------------------------------------- 5 · ALMAS
    E[4] = {
        name: 'ALMAS ERRANTES', hint: '¡Recoge las almas y huye de las calaveras!', col: '#aef', dur: 1000, rw: [5000, 1000],
        start(s) {
            s.n = lite() ? 4 : 5; s.got = 0; s.o = []; s.sk = [];
            for (let i = 0; i < s.n; i++) s.o.push({ ax: R(70, W() - 70), ay: R(80, H() * 0.55), p: R(0, TAU), on: 1, x: 0, y: 0 });
        },
        tick(s, t) {
            const px = pcx(), py = pcy(); let live = 0;
            for (const o of s.o) {
                if (!o.on) continue; o.x = o.ax + 40 * S(t * 0.02 + o.p); o.y = o.ay + 30 * C(t * 0.027 + o.p);
                const dx = o.x - px, dy = o.y - py;
                if (dx * dx + dy * dy < 784) { o.on = 0; s.got++; score += 200; fl(o.x, o.y, '+200', '#aef'); snd('playShootSound'); } else live++;
            }
            if ((t === 60 || t === 220 || t === 380) && live) s.sk.push({ x: s.sk.length % 2 ? W() - 30 : 30, y: -20, vx: 0, vy: 1, life: 330 });
            const hx0 = hx(), hy0 = hy();
            for (let i = s.sk.length - 1; i >= 0; i--) {
                const k = s.sk[i], dx = hx0 - k.x, dy = hy0 - k.y, d = Math.sqrt(dx * dx + dy * dy) + 0.01;
                k.vx += dx / d * 0.05 * K(); k.vy += dy / d * 0.05 * K();
                const sp = Math.sqrt(k.vx * k.vx + k.vy * k.vy), mx = 1.7 * K(); if (sp > mx) { k.vx *= mx / sp; k.vy *= mx / sp; }
                k.x += k.vx; k.y += k.vy;
                if (d < 14) { hurt(); k.life = 0; }
                if (--k.life <= 0) s.sk[i] = s.sk[s.sk.length - 1], s.sk.pop();
            }
            s.prog = s.got / s.n; return live === 0;
        },
        ok: s => s.got === s.n,
        draw(s, t) {
            for (const o of s.o) if (o.on) { circ(o.x, o.y, 11, 'rgba(160,240,255,0.22)'); circ(o.x, o.y, 6, '#aef'); ctx.fillStyle = 'rgba(160,240,255,0.45)'; ctx.fillRect(o.x - 2, o.y + 5, 4, 8 + 3 * S(t * 0.2 + o.p)); }
            for (const k of s.sk) { circ(k.x, k.y, 9, k.life < 40 && (k.life & 4) ? 'rgba(255,255,255,0.35)' : '#f4f4f4'); ctx.fillStyle = '#101018'; ctx.fillRect(k.x - 5, k.y - 3, 3, 4); ctx.fillRect(k.x + 2, k.y - 3, 3, 4); ctx.fillRect(k.x - 3, k.y + 5, 6, 3); }
        }
    };
    // ---------------------------------------------------------------- 6 · TEMBLOR
    E[5] = {
        name: 'TEMBLOR', hint: '¡Ve al cuarto verde antes del golpe!', col: '#ffa060', dur: 900, rw: [4000, 800],
        start(s) { s.R = lite() ? 3 : 4; s.rd = 0; s.k = 0; s.hit = 0; s.safe = Math.floor(Math.random() * 4); },
        tick(s) {
            s.k++; const q = Math.round(84 / K());
            if (s.k === q) { screenShake = Math.max(screenShake, 8); if (quad() !== s.safe) { s.hit++; hurt(); } else { score += 250; fl(pcx(), pcy() - 20, '+250', '#9f9'); } }
            if (s.k >= q + 46) { s.rd++; if (s.rd >= s.R) return true; s.safe = (s.safe + 1 + Math.floor(Math.random() * 3)) & 3; s.k = 0; }
            s.prog = s.rd / s.R; return false;
        },
        ok: s => s.hit === 0,
        draw(s, t) {
            const q = Math.round(84 / K()), w = W() / 2, h = H() / 2;
            for (let i = 0; i < 4; i++) {
                const x = (i & 1) * w, y = (i >> 1) * h;
                if (s.k < q) { ctx.fillStyle = i === s.safe ? 'rgba(80,255,140,0.18)' : 'rgba(255,50,50,' + (0.10 + 0.08 * S(s.k * 0.4)) + ')'; ctx.fillRect(x, y, w, h); if (i === s.safe) { ctx.strokeStyle = '#6f9'; ctx.lineWidth = 3; ctx.strokeRect(x + 2, y + 2, w - 4, h - 4); } }
                else if (i !== s.safe) { ctx.fillStyle = 'rgba(255,120,60,' + 0.5 * Math.max(0, 1 - (s.k - q) / 30) + ')'; ctx.fillRect(x, y, w, h); }
            }
        }
    };
    // ---------------------------------------------------------------- 7 · MIRADA
    E[6] = {
        name: 'LA MIRADA', hint: '¡Muévete: el Ojo te marca!', col: '#ff5a78', dur: 1000, rw: [7000, 1500],
        start(s) { s.m = []; s.total = lite() ? 7 : 9; s.sp = 0; s.res = 0; s.hits = 0; s.next = 40; },
        tick(s) {
            const cd = Math.round(55 / K());
            if (--s.next <= 0 && s.sp < s.total && s.m.length < 3) { s.m.push({ x: clamp(hx(), 30, W() - 30), y: clamp(hy(), 30, H() - 30), k: 0 }); s.sp++; s.next = s.sp > 4 ? 46 : 62; }
            for (let i = s.m.length - 1; i >= 0; i--) {
                const m = s.m[i]; m.k++;
                if (m.k === cd) { screenShake = Math.max(screenShake, 5); const dx = hx() - m.x, dy = hy() - m.y; if (dx * dx + dy * dy < 1444) { s.hits++; hurt(); } }
                if (m.k >= cd + 12) { s.m[i] = s.m[s.m.length - 1]; s.m.pop(); s.res++; }
            }
            s.prog = s.res / s.total; return s.res >= s.total;
        },
        ok: s => s.hits === 0,
        draw(s) {
            const cd = Math.round(55 / K());
            for (const m of s.m) {
                if (m.k < cd) { const r = 38 + 32 * (1 - m.k / cd); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,90,120,0.9)'; ctx.beginPath(); ctx.arc(m.x, m.y, r, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.arc(m.x, m.y, 38, 0, TAU); ctx.strokeStyle = 'rgba(255,90,120,0.35)'; ctx.stroke(); circ(m.x, m.y, 5, '#ff5a78'); }
                else circ(m.x, m.y, 38, 'rgba(255,230,240,' + 0.7 * (1 - (m.k - cd) / 12) + ')');
            }
        }
    };

    // ---------------------------------------------------------------- control
    const level = () => ((Math.max(1, currentWave | 0) - 1) % 7);
    function start(l) { const d = E[l]; act = { d, s: { col: d.col, prog: 0 }, t: 0 }; d.start(act.s); fired = true; snd('playSpecialAlertSound'); }
    function eligible() {
        if (!CFG.enabled || !isPlaying || currentMode === 'clasico' || activeBoss || activeMiniBoss || typeof player === 'undefined' || !player) return false;
        try { if (window.Choque && Choque.active && Choque.active()) return false; } catch (e) {}
        return true;
    }
    function banner(a) {
        const p = a.t / 120; if (p >= 1) return;
        const kb = clamp(1 / (typeof viewScale === 'number' && viewScale > 0 ? viewScale : 1), 1, 1.4), al = Math.min(1, p * 6) * Math.min(1, (1 - p) * 4);
        ctx.globalAlpha = al; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W() / 2 - 200 * kb, 70, 400 * kb, 50 * kb);
        ctx.fillStyle = a.d.col; ctx.font = FONT(Math.round(12 * kb)); ctx.fillText(a.d.name, W() / 2, 92 * kb + 0);
        ctx.fillStyle = '#fff'; ctx.font = FONT(Math.round(7 * kb)); ctx.fillText(a.d.hint, W() / 2, 108 * kb + 4); ctx.globalAlpha = 1;
    }
    function frame() {
        if (hitCool > 0) hitCool--;
        if (!eligible()) { act = null; floats.length = 0; return; }
        if (waveTimer < lastWT - 60) { fired = false; act = null; }
        lastWT = waveTimer;
        if (!act && !fired && waveTimer >= CFG.START_AT) start(level());
        if (!act && !floats.length) return;
        ctx.save();
        if (act) {
            const a = act, d = a.d; a.t++;
            const done = d.tick(a.s, a.t) || a.t >= d.dur;
            d.draw(a.s, a.t); banner(a);
            ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(W() * 0.3, 6, W() * 0.4, 6); ctx.fillStyle = d.col; ctx.fillRect(W() * 0.3, 6, W() * 0.4 * clamp(a.s.prog, 0, 1), 6);
            if (done) { const ok = d.ok(a.s); if (ok) reward(d.rw[0], d.rw[1]); else fl(W() / 2, H() * 0.34, 'FIN DEL EVENTO', '#ccc'); act = null; }
        }
        ctx.textAlign = 'center'; ctx.font = FONT(9);
        for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.t++; f.y -= 0.5; if (f.t > 70) { floats.splice(i, 1); continue; } ctx.globalAlpha = 1 - f.t / 70; ctx.fillStyle = f.col; ctx.fillText(f.txt, f.x, f.y); }
        ctx.restore();
    }
    const _hud = window.drawHud;
    window.drawHud = function () {
        try { frame(); } catch (e) { console.warn('[FaseEvents]', e); act = null; }
        return _hud.apply(this, arguments);
    };
    window.FaseEvents = { cfg: CFG, force(n) { if (isPlaying) { act = null; start(clamp((n | 0) || 1, 1, 7) - 1); } }, stop() { act = null; } };
})();
