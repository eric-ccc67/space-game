# Cambios v30 — Jefes con poderes únicos (Touhou 6 / Undertale / Deltarune)

Los **8 jefes principales** (los 7 de nivel + EL INVASOR; los mini jefes no se tocaron) tienen ataques nuevos, coherentes con el nombre de su poder, y **sprites de balas propios** por jefe. Todo vive en la carpeta nueva `jefes/` (se carga al final de `index.html`, no modifica `juego.js`, `choque.js` ni `perfil.js`).

**Cómo funciona cada pelea**
- Cada ataque es una *spell card* con nombre japonés + español (cartel arriba) y una frase del jefe en un **globo de texto estilo Undertale**.
- Fases: >75 % y 75-50 % ataques normales → al 50 % el **ESPECIAL** firma del jefe (el rótulo `BOSS_SPECIAL_NAMES` cambió para coincidir) → por debajo del 25 % alterna con su **ÚLTIMA PALABRA**.
- Mecánicas nuevas: **alma AZUL** (solo duele si te mueves) y **NARANJA**, balas que se congelan y reanudan, balas que se transforman, rayos con aviso, zonas que ralentizan/atraen, viento que empuja, tinta, charcos, entidades grandes.

| Jefe | Identidad | Ataques (último = Última Palabra) |
|---|---|---|
| 1 Kyūbi | kitsune | Fuegos fatuos serpenteantes · Hojas que se vuelven bolas de fuego · Mil portones torii (pilares de fuego) · Clones-máscara · **Nueve Colas** · Ventisca de sakura |
| 2 Rey Yeti | hielo | Carámbanos · Bola de nieve gigante que rebota y se parte · Congelación perfecta · Viento que empuja · **Rugido del Rey** · Cero absoluto (alma azul) |
| 3 Kraken | mar fantasma | Burbujas que revientan · Tentáculos del fondo · Maelstrom (atrae) · Ancla fantasma + olas · **Furia del Kraken** (tinta) · Gran marejada |
| 4 Reina Araña | araña | Gotas de veneno · Crías en estampida · Telaraña (ralentiza) · Cortina de hilos · **Seda Mortal** (6 rayos giratorios) · Vals de la viuda negra |
| 5 Archiliche | grimorios | Páginas ardientes · Gota del silencio · Hoja del milenio · Marcapáginas de hierro · Peso del libro prohibido · **Apocalipsis escrito** (letras) · Grimorio de los siete astros |
| 6 Coloso del Reloj | tiempo | Aguja detenida · Engranajes · Péndulo eterno · Manecillas (rayos) · Rebobinado · **El mundo se detiene** · Bucle eterno (el patrón se repite igual) |
| 7 Ojo Gigante | vampiro | Lágrimas + charcos de sangre · Mirada sangrienta · Murciélagos · Eclipse carmesí · **Lágrima Carmesí** (sube el mar de sangre) · Destino escarlata (4 ojos con rayos) |
| 8 EL INVASOR | arcade retro | Conserva sus ataques (Space Invaders, Pong, Tetris, Asteroids, Pac-Man) y suma **GALAGA** (rayo tractor), **SNAKE**, **FROGGER**, **DONKEY KONG** (barriles que bajan por las vigas), **CENTIPEDE** (ciempiés + setas), **MISSILE COMMAND** (misiles con estela y explosión), **Q\*BERT** (bolitas saltarinas), **TRON** (motos de luz con muros), **BOMBERMAN** (bomba con mecha y explosión en cruz), **R-TYPE** (rayo onda horizontal + orbes Bydo) y **ROBOTRON** (robots que te persiguen) |

**Archivos**: `jefes/motor.js` (sprites, balas, rayos, zonas, UI, cerebro) y `jefes/j1_kyubi.js` … `j7_ojo.js` (un jefe por archivo; cada ataque es un objeto `{ id, name, jp, line, dur, tick }` fácil de editar). Los ataques del Invasor están en `invasor.js`.
**Consola** (en una pelea de jefe): `JefesUnicos.dev.list(0)` lista los ataques del jefe del nivel 1; `JefesUnicos.dev.force('nuevecolas')` fuerza uno. La dificultad escala velocidad, cantidad e intervalos con los mismos ajustes de siempre (`difficultySettings`).

---

# Cambios v27 — Bombas renovadas

- **Stock máximo de 4 bombas** (`BOMB_MAX`). Cada `GRAZE_MAX` puntos de graze (balas rozadas y gemas verdes) rellenan 1 bomba; con 4 en stock el graze ya no se acumula. Usar una bomba gasta 1 y conserva el progreso de graze. Los HUD muestran 4 estrellas de stock y la barra de progreso hacia la siguiente. El botón táctil muestra `BOMBA xN`.
- **Una bomba distinta por nave** (módulo `bombas.js` al final de `juego.js`). Durante la bomba eres invulnerable y los rayos/ondas enemigos quedan inofensivos:
  - Tanque: FORTALEZA DE ACERO (3 ondas sísmicas hexagonales + blindaje renovado)
  - Sniper: EJECUCIÓN ORBITAL (mira que marca blancos y rayos desde el cielo)
  - Ligera: CORTES RELÁMPAGO (cortes de luz que cruzan la pantalla)
  - Omega: SINGULARIDAD DE PLASMA (agujero negro que absorbe balas y colapsa en una nova)
  - Reimu (Touhou 6): sin Shift 霊符「夢想封印」Fantasy Seal (orbes de colores teledirigidos) · con Shift 霊符「封魔陣」Evil-Sealing Circle (círculo de talismanes)
  - Marisa (Touhou 6): sin Shift 魔符「スターダストレヴァリエ」Stardust Reverie (lluvia de estrellas) · con Shift 恋符「マスタースパーク」Master Spark (rayo + círculo mágico)
  - Goku: KAMEHAMEHA (con marco de ataque) · otras naves: NOVA ESTELAR
- La Supernova del modo Caos lanza una bomba gratis sin gastar stock; la recompensa del bonus da +1 bomba y la mejora "Bomba lista" de la tienda empieza con 1.

---

# Cambios v26

- **Velocidad estable en cualquier teléfono** (`juego.js`, inicio del archivo): el juego avanzaba "por cuadro", así que en pantallas de 90/120/144 Hz el menú y el gameplay iban 1.5-2.4x más rápido. Un limitador de cuadros (60 ticks/s) deja todo a la velocidad correcta sin importar los Hz.
- **Teléfono horizontal**: el lienzo usa una resolución lógica ~25 % mayor (`MOBILE_ZOOM_OUT` / `MOBILE_LOGICAL_MAX_H` arriba de `juego.js`), por lo que naves, hadas y balas se ven más pequeños y proporcionados, hay más espacio para esquivar y el panel lateral es más angosto (196-232 px lógicos). Los hitbox no cambian. Para volver al tamaño anterior pon `MOBILE_ZOOM_OUT = 1`.
- **Eventos especiales (mini secciones, `ondas.js` dentro de `juego.js`)**: ahora también ocurren en el Modo Infinito, arrancan antes (≈5.5 s, 17 s y 27 s de cada oleada), no se descartan por llegar tarde y el aviso es legible en teléfono.
- **Arcos de luz del PULSER renovados**: ya no se cortan; son medias lunas arcoíris con brillo, destellos y bordes que se desvanecen, y cada abertura tiene "postes" luminosos. La abertura mide siempre >= 170 px (`GAP_MIN_PX`). Nuevos estilos según dificultad: `ring` (abertura donde estás), `twin` (dos aberturas) y `sway` (la abertura se balancea despacio, con aviso ‹ ›), más un arco "eco" con la abertura levemente desplazada.

---

# Cambios v25.4

- **Arreglado el congelamiento al matar a un jefe** (todos los jefes, incluido EL INVASOR): al llegar la vida a 0, `choque.js` vaciaba el arreglo de balas desde dentro del bucle de disparos de `juego.js`, lo que producía un error (`bullets[i]` indefinido) y detenía el juego antes de empezar el choque de poderes. Ahora la limpieza de balas se hace en el primer cuadro del choque (`choque.js`) y el bucle de balas ignora entradas vacías (`juego.js`).

---

# Cambios v25.3

- **Choque de poderes más fácil** (`choque.js`): Difícil y Lunático ya no piden ~6-7 toques/s, ahora se gana desde ~4 toques/s. El jefe empuja menos (`DRIFT`), el pulso dura 14 s (`TIME_LIMIT`), las embestidas son más suaves, el bonus ¡SUPER! llega desde 5 toques/s (`SUPER_RATE`), en teléfono el jefe empuja 20 % menos (`MOBILE_EASE`) y **mantener pulsado** DISPARO/AUTO también empuja un poco (`HOLD_PUSH`).

---

# Cambios v25.2

- **El choque de poderes ahora es el final del jefe**: ya no ocurre durante el combate. Cuando la vida de un jefe final llega a **0**, no muere: dice su diálogo de "no me rindo" (uno distinto por jefe) y ahí empieza el choque. Si ganas el pulso, cae y termina el nivel. Si pierdes, te quita 1 vida, el jefe se recupera al 30 % y, cuando le vuelvas a vaciar la barra, tendrás una revancha; tras perderla también, muere normal.

---

# Cambios v25.1

- **Nombre solo al terminar**: el menú ya no tiene campo de nombre (ni en Modo Práctica ni al iniciar). Se pide únicamente al **perder definitivamente** (modo principal o infinito) o al **terminar el juego**, para guardar el puntaje en la tabla de clasificación. El Modo Práctica no guarda ni pide nombre. El último nombre usado aparece ya escrito en esa pantalla.
- **Música**: el mini jefe usa la misma pista de oleada del nivel (sin cortes ni reinicio); solo el jefe final tiene música propia.

---

# Cambios v25

- **CHOQUE DE PODERES (nuevo `choque.js`)**: cuando un jefe final baja al 20 % de vida (los 7 jefes de nivel + EL INVASOR) el juego se congela y tu nave y el jefe disparan sus rayos de frente, estilo Budokai Tenkaichi 3. **Martillea DISPARO** (Espacio / botón A / clic) para empujar el choque hacia el jefe: si lo logras, tu rayo lo arrasa y cae (+3000). Si pierdes, te golpea (-1 vida, el escudo lo absorbe), el jefe recupera hasta el 30 % y tienes una **revancha** al 8 %. Más rápido = mejor (a 7+ toques/s hay bonus ¡SUPER!). Cada jefe tiene su propio rayo, colores, fondo y partículas: Kyūbi (nueve listones de fuego + pétalos), Yeti (ventisca de cristales), Kraken (torrente con burbujas), Reina Araña (hilos venenosos), Archiliche (runas y círculo mágico), Coloso del Reloj (engranajes + reloj gigante), Ojo Gigante (venas que laten y sangre) e Invasor (rayo de píxeles 8-bit con scanlines). Ajustes arriba de `choque.js`: `TRIGGERS`, `PUSH`, `DRIFT` (dificultad), `TIME_LIMIT`.
- **Mini jefes**: sus aliados (hadas menores) ahora sueltan SIEMPRE un cuadrado **rojo** (puntos de vida: cada 5 = +1 vida), uno **verde** (graze) y uno **naranja** (puntos de poder), y vuelan solos hacia tu nave. Ajustable con `MINION_REWARD` en `juego.js`.
- **Power-ups de jefe**: mientras un jefe final está activo, cada ~3.5 s hay un **47.6 %** de que suelte un power-up (con preferencia por Doble Disparo / Súper). `DROP_CHANCE` y `DROP_EVERY` en `choque.js`.
- La muerte del jefe final ahora vive en una sola función (`defeatBoss`, `juego.js`) usada por disparo, bomba y choque.

---

# Música por nivel (carpeta /musica)
Las pistas están en `musica/` (ver `musica/LEEME.txt`): `nivelN_oleada.mp3` (oleadas y mini jefe) y `nivelN_jefe.mp3` (solo jefe final) (N = 1..7) `retro.mp3` (un solo archivo para el MODO RETRO) y `menu.mp3` (música del menú). Si falta alguna, se usa la de respaldo (`por_defecto_oleada.mp3` / `por_defecto_jefe.mp3`); sin `retro.mp3` se conserva la música de 8 bits generada por el juego.

# Cambios v16

- **Dificultades mucho más notorias** (`difficultySettings` en `juego.js`): velocidad de balas (FÁCIL 2.6 → LUNÁTICO 6.8), velocidad de enemigos, densidad y frecuencia de patrones, vida de enemigos y jefes (`enemyDef` / `bossDef`), habilidades de oleada (`DIFF` de WaveAttacks: aviso, ancho de rayos, cantidad, ondas, ráfagas, roles). Para que siga siendo justo: FÁCIL da más powerups (`dropMult`) y más invulnerabilidad tras un golpe (`invulMs`); en todas hay tope de balas en pantalla y los avisos/aberturas no desaparecen.
- **Perfil de jugador** (`perfil.js`, nuevo): al vencer al jefe del nivel 6 (nivel 7 en LUNÁTICO) sale una pantalla para escribir el nombre y guardar la partida (puntaje, ítems, powerups por tipo, monedas, gemas, enemigos, bombas, nivel). Al morir se guarda solo con el nombre ya registrado (si no hay, se pide). El nombre se recuerda en el navegador y se rellena en el menú.
- **Un registro por jugador** (`api.php`, acción `saveRun`): si superas tu mejor puntaje se actualiza (con las estadísticas de esa partida); si no, se conserva el mejor y solo suben los totales (partidas, ítems, powerups, enemigos). El TOP 10 muestra un renglón por jugador. El esquema se crea/actualiza solo; los puntajes antiguos de `scores` se migran la primera vez.
- Sin conexión: la partida queda en el navegador y se reenvía sola después.

---

# Cambios v15

- **Joystick en el bonus retro (portal secreto)**: no movía la nave porque `mobile.js` buscaba `window.Extras`, pero `Extras` es una `const` global y no existe en `window`; ahora detecta el bonus bien y manda las direcciones.
- **Mapas menos saturados**: `DENS` 0.42 → 0.20 y `DENS_ANIM` 0.35 → 0.15, menos voladores (`FLY`) y un velo oscuro suave sobre el fondo (`BG_VEIL_ALPHA`, 0 = sin velo) para que balas y enemigos destaquen.

---

# Cambios v12: fondos más limpios y tensión en la última vida

- **Fondos de los 7 niveles menos saturados** (`fondos_retro_detalles.js`): se conserva ~42 % de los adornos (estanques, rocas, hongos, libros, lápidas...), ~35 % de los destellos/ondas y menos de la mitad de los voladores (linternas, copos, mariposas, murciélagos...). Para ajustarlo: `DENS`, `DENS_ANIM` y la tabla `FLY` al inicio de ese módulo.
- **Tensión permanente en la última vida** (`tension_ultima_vida.js`, al final de `juego.js`): con exactamente 1 vida suena un pitido doble agudo más un latido grave, sin parar, al estilo de poca vida de Pokémon/Zelda. Se calla al pausar, en CONTINUAR, al morir, al volver al menú o al recuperar vida. Ajustes por consola o en el código: `TENSION.vol`, `TENSION.beep`, `TENSION.heart`, `TENSION.period`.

- **Oleadas de 50 s**: `WAVE1_DURATION`, `WAVE2_DURATION` y `MODERN_WAVE_DURATION` = 3000 frames; los eventos de oleada se reubicaron para caber.

- **Pausa → AJUSTES**: nuevo botón en el menú de pausa que abre la configuración sobre la partida (CRT, rendimiento, controles táctiles y un nuevo volumen de música). Vidas, HUD compacto, modo vertical y modo teléfono quedan bloqueados en partida. Esc cierra solo los ajustes.
- **CONTINUAR / FIN DEL JUEGO en teléfono vertical**: los carteles suben a la mitad de arriba del área de juego para no quedar bajo los botones (`uiCenterY()`).

---

# Space Game — Cómo correrlo en localhost y ver la tabla de puntajes

Este juego usa PHP + MySQL para guardar los puntajes, así que **no se puede
abrir con doble clic** (eso abre el archivo como `file:///...` y ahí PHP no
funciona). Necesitas un servidor local que corra PHP y MySQL a la vez.
La forma más simple es **XAMPP**.

## 1. Instalar XAMPP

1. Descarga XAMPP desde https://www.apachefriends.org (incluye Apache,
   MySQL/MariaDB y PHP, todo junto).
2. Instálalo con las opciones por defecto.

## 2. Copiar el proyecto a `htdocs`

Copia **toda esta carpeta** (con `index.html`, `game.js`, `api.php`,
`space_game_juego.sql`, las imágenes, etc.) dentro de:

- Windows: `C:\xampp\htdocs\space_game\`
- Mac: `/Applications/XAMPP/htdocs/space_game/`
- Linux: `/opt/lampp/htdocs/space_game/`

El nombre de la carpeta (`space_game`) puede ser el que quieras, pero debe
estar **dentro** de `htdocs`.

## 3. Iniciar Apache y MySQL

1. Abre el **XAMPP Control Panel**.
2. Dale **Start** a `Apache` y a `MySQL`. Los dos deben quedar en verde.
   - Si `MySQL` no arranca, normalmente es porque otro programa está usando
     el puerto 3306. Cierra ese programa o cambia el puerto en la
     configuración de XAMPP.

## 4. Crear la base de datos

1. En el navegador, entra a: `http://localhost/phpmyadmin`
2. Ve a la pestaña **Importar**.
3. Selecciona el archivo `space_game_juego.sql` de este proyecto.
4. Dale **Continuar / Ejecutar**.

Este archivo ya trae `CREATE DATABASE space_game`, así que crea la base y
las tablas solo — no hace falta crear nada a mano antes.

Al terminar, en el panel izquierdo de phpMyAdmin debería aparecer la base
**`space_game`** con dos tablas adentro:

- **`scores`** — cada partida jugada (nombre, puntaje, dificultad, fecha).
- **`players`** — qué jugadores ya se ganaron la ⭐ por completar el juego
  en dificultad Lunático.

## 5. Abrir el juego

En el navegador entra a (ajusta el nombre de carpeta si le pusiste otro):

```
http://localhost/space_game/
```

**Importante:** tiene que cargar por `http://localhost/...`, nunca abrir el
`index.html` con doble clic.

Juega una partida, deja que termine (Game Over o victoria), y el puntaje se
guarda automáticamente.

## 6. Ver la tabla de usuarios con mayor puntaje (el ranking)

Hay dos formas de verlo:

### A) Dentro del juego
En el menú principal, la caja **"TOP 10 MEJORES"** ya muestra el ranking en
vivo (los 10 puntajes más altos, con la ⭐ si el jugador se pasó el juego en
Lunático). Se actualiza solo después de cada partida.

### B) Directamente en la base de datos (phpMyAdmin)
1. Ve a `http://localhost/phpmyadmin`.
2. En el panel izquierdo, haz clic en la base **`space_game`**.
3. Haz clic en la tabla **`scores`**.
4. Pestaña **Examinar** (Browse): ahí ves cada partida guardada
   (`player_name`, `score`, `difficulty`, `created_at`).
5. Para ver el Top 10 ordenado como lo hace el juego, ve a la pestaña
   **SQL** y ejecuta:

   ```sql
   SELECT s.player_name, s.score, s.difficulty, COALESCE(p.stars, 0) AS stars
   FROM scores s
   LEFT JOIN players p ON p.player_name = s.player_name
   ORDER BY s.score DESC
   LIMIT 10;
   ```

## Solución de problemas

- **El ranking dice "Error al cargar."**: entra directo a
  `http://localhost/space_game/api.php?action=getTop` en el navegador. Ahí
  vas a ver el error real de PHP/MySQL (ej. base de datos inexistente,
  MySQL apagado, o usuario/contraseña incorrectos).
- **Usuario/contraseña de la base de datos**: `api.php` usa por defecto
  usuario `root` sin contraseña (configuración estándar de XAMPP). Si tu
  MySQL tiene otro usuario o contraseña, edita estas líneas al principio de
  `api.php`:

  ```php
  $host = "localhost";
  $user = "root";
  $pass = "";
  $dbname = "space_game";
  ```

- **MySQL no arranca en XAMPP**: revisa el botón "Logs" del Control Panel
  para ver el motivo (puerto ocupado es lo más común).

---

# Novedades: misiones diarias, portal secreto, mundos retro y nave Reimu

Archivos nuevos: `extras.js` (misiones, portal, warp, monedas, nave Reimu), `retro.js` (motor del mundo de 8 bits)
y `retro_art.js` (sprites, fuente y definición de los 7 mundos). `game.js` solo tiene unas pocas líneas
nuevas que llaman a `Extras.onXxx()` (búscalas con `Extras.` en el archivo).

## Misiones diarias
- Cada día salen 3 misiones nuevas (fácil ★, media ★★, difícil ★★★), iguales para todo ese navegador y que cambian a medianoche.
- Se ven en el menú principal, con barra de progreso. Al completar una sale un aviso dentro del juego.
- Recompensas: 40 / 80 / 150 ★ por misión. Si completas las 3, +100 ★ y **+1 vida inicial** en tu próxima partida.
- Hay racha de días seguidos y un rango (Cadete → Piloto → Capitán → As Estelar → Leyenda).
- Tipos: vencer enemigos, jefes, mini jefes, rozar balas (graze), usar bomba, recoger poderes, niveles sin perder vidas,
  sobrevivir minutos, puntos en una partida, puntos con una nave concreta, llegar a un nivel, Nivel de Ataque,
  portales secretos, enemigos retro y monedas gigantes.

## Portal secreto (los mundos de plataformas de abajo fueron REEMPLAZADOS por el nivel bonus, ver la última sección)
- En el **Modo Moderno**, cada nivel esconde un portal que aparece una vez, en un momento al azar de las oleadas,
  y dura ~13 segundos. Brilla más cuando te acercas. Al tocarlo: animación de warp y entras al mundo retro.
- Controles retro: **← →** mover · **↑ / Z** saltar (también pisar enemigos) · **Espacio** disparar · **Esc** salir.
  En el celular: joystick + botón A (disparar) + botón B (saltar).
- Vence la cuota de enemigos del mundo (8 en el mundo 1, hasta 14 en el 7) y aparece la **moneda gigante** al final.
  Tienes 3 corazones. Si mueres, vuelves a la nave sin moneda.
- Mundo 1 Reino Champiñón · 2 Tierra de Hyrule · 3 Inframundo · 4 Planeta Zeeb · 5 Castillo Nocturno ·
  6 Fábrica Robótica · 7 Mansión Encantada (cada uno con 4 enemigos distintos, inspirados en Mario, Zelda,
  Kid Icarus, Metroid, Castlevania, Mega Man y Luigi's Mansion, pero no son los originales).
- Recompensas: moneda nueva +10.000 puntos; repetida +3.000; cada enemigo retro +150.
- El mundo 7 solo existe en dificultad Lunático (es el único con 7 niveles), así que para las 7 monedas hay que
  llegar al nivel 7 en Lunático al menos una vez.

## Nave 5: Reimu
Se desbloquea con las 7 monedas gigantes. Dispara una aguja al frente y amuletos teledirigidos desde dos orbes yin-yang.

## Probar rápido (consola del navegador, F12)
```js
Extras.dev.portal()     // hace aparecer el portal ya mismo (con una partida en curso)
Extras.dev.retro(0)     // entra directo al mundo retro 1..7 (0..6)
Extras.dev.coins(7)     // regala monedas; 7 desbloquea a Reimu
Extras.dev.reset()      // borra monedas, misiones y estadísticas
```
Los datos (monedas, misiones, estrellas) se guardan en el navegador (localStorage), no en la base de datos.

---

# Novedades: sprites pixel art retro + controles táctiles v2

- `pixelart.js` (nuevo, se carga antes de `criaturas.js`): convierte enemigos, mini jefes y jefes en pixel art real (paleta fija de 40 colores, tramado, contorno de 1 px, animación por pasos ~9 fps). Poses de ataque: **carga** (se aplasta, tiembla y parpadea con chispas que se juntan), **disparo/lanzamiento** (rebote + anillo de puntos) y parpadeo blanco al recibir un golpe. El ojo gigante del nivel 7 no se tocó. Para volver al dibujo vectorial: `PX.enabled = false` en la consola.
- `mobile.js` (nuevo): joystick analógico y flotante, **A** disparo, **B** bomba (salto en los portales retro), **SLOW** para moverte lento y preciso (en PC: Shift), **AUTO** disparo automático, **❚❚** pausa (en PC: P o Esc; también se pausa sola al cambiar de app) y **SALIR** dentro de los portales retro. Opciones nuevas en el menú: modo zurdo, tamaño, transparencia, vibración y joystick fijo.

---

# Novedades del MODO RETRO (portales de 8 bits)

- **Personaje nuevo**: el piloto (astronauta con visor) y la sacerdotisa (miko) tienen cuerpo rediseñado con animación de 4 cuadros al correr, sprite propio de salto, caída y agachado, y respiración en reposo.
- **Pistola dibujada para cada dirección**: frente, arriba, diagonal arriba, y ahora también **abajo y diagonal abajo (en el aire, con ↓)**. La bala sale exactamente de la boca del cañón, con fogonazo, retroceso, chispas y casquillo.
- **Doble salto**: pulsa saltar otra vez en el aire (en el móvil, toca B de nuevo). Deja estela fantasma y un anillo de destellos. Se recupera al aterrizar o al pisar un enemigo.
- **Efectos de movimiento**: polvo al correr, frenar, saltar y aterrizar; el personaje se aplasta y se estira; sombra proyectada en el suelo (también bajo los enemigos); balas con estela y chispas al chocar; los enemigos voladores dejan rastro y se aplastan al recibir un golpe.
- **Fondos con vida** en los 7 mundos: nubes y pájaros, mariposas, almas flotantes con relámpagos, esporas luminosas, antorchas con luz, engranajes que giran con vapor, velas y fantasmitas. El cielo tiene transición tramada.
- **Niveles rediseñados**: relieve más alto (colinas de hasta 3 bloques), **torres** de plataformas, **puentes de tablones con huecos**, y **gemas** que forman arcos sobre los abismos (contador GEMAS en pantalla). Los niveles siguen siendo siempre completables.

---

# Novedades: balas con borde, filas rígidas y jefes más fuertes (modo bullet hell)

- **Balas enemigas** (`shmup_retro.js`): ahora se dibujan a escala x3 (antes x2) y con un **borde blanco** alrededor del contorno oscuro, para leerse bien sobre cualquier fondo. La hitbox real no cambió.
- **Ataques periódicos** (`Enemy.maybeShoot` en `game.js`): las hadas disparan cada ~1.3–1.8 s (según dificultad). Las básicas tiran apuntado y, cada tercer disparo, abanico de 3; las resistentes alternan abanico apuntado y anillo de orbes.
- **Formaciones rígidas** (`spawnRigidFormation`): fila horizontal, columna y V perfectas (4–6 enemigos según dificultad). Bajan lento, misma velocidad, separación fija y el mismo balanceo, sin temblor. Disparan en "ola" de izquierda a derecha. No entra un grupo nuevo hasta que el anterior terminó de entrar.
- **Jefes y mini jefes**: ataques ~20–25 % más seguidos, mínimo de 4 balas por patrón en dificultad Fácil, movimiento vertical suave, y una capa extra de ataques por nivel (`bossExtraAttacks`: lluvia de pétalos, cortinas de carámbanos/páginas con carril libre, ondas de burbujas, abanicos de luciérnagas, manecillas de reloj). **Bug corregido:** la fase 3 de cada jefe nunca se usaba porque el ataque especial (50 %) la reemplazaba; ahora por debajo del 25 % de vida el jefe alterna entre su especial y su fase 3. El ojo gigante del nivel 7 no se modificó.


---

# NUEVO: Nivel bonus de 8 bits (nave + scroll horizontal) y TIENDA

Archivos nuevos: `bonus.js` (motor), `bonus_art.js` (naves, 7 mini jefes, 7 temas), `shop.js` (tienda).
`retro.js` (el plataformas) ya no existe; `retro_art.js` solo sirve de librería de sprites y fuente.

## El portal ahora lleva a un NIVEL BONUS
- Sigues controlando **tu nave** (con la skin que tengas equipada), vista de lado y con scroll horizontal, estilo aviones de Cuphead pero en 8 bits tipo NES.
- Cada nivel tiene su bonus con **su temática**: Sakura, Picos Helados, Lago Espectral, Bosque Encantado, Biblioteca Arcana, Torre del Reloj y Luna Sangrante (este solo en Lunático, como antes).
- Enemigos retro distintos en cada bonus (4 por nivel, con comportamientos propios: ondas, zigzag, picada, perseguidores, torretas, tanques, anillos de balas).
- **Power-ups** (cápsulas): P arma (4 niveles) · S escudo · H vida · B bomba · M imán de gemas · R disparo rápido. Salen de enemigos con asterisco (*), del jefe al cambiar de fase y de la "estación de suministros" a mitad del nivel.
- **Gemas**: azules (1) y verdes (5). Se guardan para la tienda.
- Al final, **mini jefe propio** con 3 fases y muchos ataques (abanicos, anillos, espirales, lluvia, cortinas con hueco, rayos con aviso, rayos verticales, rayo giratorio, embestida, invocaciones, balas teledirigidas):
  Rey Hongo · Golem Glacial · Rey Fantasma · Árbol Ancestral · Gran Grimorio · Relojero · Conde Lunar.
- Controles: **flechas** mover · **Espacio** disparar · **Z** bomba · **Shift** lento (muestra tu hitbox) · **Esc** salir. En móvil: joystick + A (disparo) + B (bomba) + SALIR.
- Si vences al jefe: moneda gigante (como antes), **gemas** = recogidas + 40 del jefe + bono por nota (S +30, A +15, B +5 según golpes recibidos) + 50 la primera vez en ese nivel. Al volver a la partida: **bomba lista + escudo 5 s**.
- Si mueres o sales con Esc solo guardas el 30 % de las gemas recogidas.

## Tienda (botón 🛒 TIENDA en el menú)
- **Skins**: Clásica, Neón Magenta, Cristal Glacial, Magma, Sakura, Sombra, Oro Real, Arcoíris (colores + estelas; se ven en la partida y en el bonus).
- **Poderes de nave** (con niveles): vidas extra, escudo de arranque, cadencia turbo, propulsores, nivel de ataque inicial, bomba lista, imán, satélites aliados y Fénix (reviver una vez por partida).
- **Mejoras bonus**: armadura (+corazones), bombas extra, arsenal inicial y cazagemas (+% gemas).
- Todo se guarda en el navegador (localStorage `sg_shop_v1`).
- Misiones diarias nuevas: "Recoge N gemas en niveles bonus".

## Probar rápido (consola F12)
```js
Extras.dev.retro(0)     // entra al bonus 1..7 (0..6) con una partida en curso
Shop.dev.gems(5000)     // regala gemas
Shop.dev.reset()        // borra gemas y compras
Bonus.dbg()             // estado interno del bonus (p.ej. Bonus.dbg().boss.hp = 1)
```


---

# NUEVO: Cinemáticas (`cinematicas.js`)

Archivo nuevo, cargado después de `extras.js`. Se engancha con pocas líneas (busca `Cine.` en `game.js`, `extras.js`,
`shmup_retro.js` y `criaturas.js`); si lo quitas del `index.html`, el juego vuelve a la animación antigua.

## 1. Llegada de la nave (inicio de partida y cada nivel)
La nave ya no aparece quieta: llega de forma distinta en cada nivel. En el nivel 1 se suma un fundido desde negro (es la cinemática de inicio de partida).
- **Sakura**: barrida en arco entre una ráfaga de pétalos.
- **Picos Helados**: cae con la nariz hacia abajo entre la ventisca y frena con retro-impulso y onda de escarcha.
- **Lago Espectral**: emerge del agua con chapoteo, ondas, burbujas y distorsión de agua.
- **Bosque Encantado**: las luciérnagas se juntan y forman la nave entre enredaderas.
- **Biblioteca Arcana**: círculo rúnico, columna de luz y teletransporte por escaneo con páginas volando.
- **Torre del Reloj**: avanza a "ticks" de reloj sobre una esfera gigante y engranajes; termina con un gong.
- **Luna Sangrante**: sale de la luna roja entre murciélagos y relámpagos.
El cartel del nivel aparece a mitad de la llegada. **ENTER** salta la cinemática.

## 2. Transición bullet hell → mundo retro
Al tocar el portal, el remolino se **pixela hasta 8 bits** (líneas de CRT, glitch y rótulo "ENTRANDO A 8 BITS" con el nombre del mundo).
Ya dentro del bonus, la nave **sale disparada por un portal pixelado** de la izquierda, con estela fantasma, y frena en su sitio
antes de mostrarse el cartel del nivel (`bonus.js`: `INTRO_LEN`, `ARR_LEN`).

## 3. Presentación de jefes (una distinta por jefe, ~4.5 s)
Barras de cine, viñeta y cartel con nombre y epíteto, cada uno con su propia animación de letras (edita los textos en `BOSS_CARDS`).
- **Sakura Eterna**: vendaval de pétalos que se hace remolino; la jefa nace girando.
- **Soberana Glacial**: la pantalla se congela, aparece una marca de impacto y cae estrellándose con grietas y esquirlas.
- **La Dama del Lago**: el agua tiembla y emerge desde el fondo con ondas y gotas.
- **Madre Espina**: enredaderas y luciérnagas que se funden en una esfera que estalla.
- **La Gran Archivista**: libros orbitando, círculo rúnico y ella "escrita" de arriba abajo.
- **El Relojero Eterno**: esfera gigante cuyas manecillas paran en las 12 y el jefe baja en 3 ticks.
- **El Ojo Carmesí**: oscuridad, luna roja, murciélagos y goteo; el ojo abre el párpado.
Durante la presentación el jefe es invulnerable (como antes). **ENTER** la salta.

## Probar rápido (consola F12, con una partida en curso)
```js
Cine.dev.arrival(3)     // llegada del nivel 4 (0..6)
Cine.dev.boss(5)        // presentación del jefe del nivel 6 (el 7º solo existe en Lunático)
Extras.dev.retro(2)     // portal + transición retro + llegada al bonus 3
```


---

# Cambios: skin en la nave, nave y balas más grandes, oleadas de 1 minuto y jefes arreglados

- **Skin en el sprite retro**: la nave de 8 bits (`shmup_retro.js`) ahora se tiñe con el color de la skin equipada (casco y sombras; contorno y cabina no cambian). Funciona igual en el dibujo vectorial. `shop.js` reaplica la skin en cada cuadro, así que también vale si equipas otra con la partida empezada. La skin Arcoíris cambia de color en vivo.
- **Nave más grande**: `SHIP_SCALE = 1.5` en `game.js` (vectorial) y `ps = 3` en `shmup_retro.js` (retro). Es solo dibujo: el hitbox (el punto verde) no cambia. Las órbitas de Reimu se abren acorde.
- **Balas del jugador más grandes** (constructor de `Bullet`): +3×+5 px las normales y +4×+6 las súper, centradas en el mismo punto de disparo.
- **Oleadas de 1 minuto** (Moderno): `MODERN_WAVE_DURATION = 3600`. Las mini secciones de `ondas.js` (`EVENT_TIMES`) y el portal secreto de `extras.js` se reajustaron para caber en los 60 s. El modo Infinito conserva sus oleadas cortas.
- **Jefes y mini jefes, bug corregido**: la ayuda `spiral` de `criaturas.js` llamaba a `shot()` con los argumentos en otro orden. Esas habilidades (Nueve Colas, Ventisca Total, Tentáculos, Abismo, Seda Mortal, Apocalipsis Escrito, Remolino de Hojas…) creaban balas con velocidad `NaN` que nunca desaparecían: no se veían, se acumulaban hasta el tope de balas y entonces ningún ataque nuevo aparecía.
- **Más protección** (`pushEnemyBullet`): una bala con posición/velocidad inválida ya no entra, y el bucle principal descarta las que se corrompan. Las balas de jefes tienen cupo propio (×2.6 del tope de la dificultad) y no compiten con las de las hadas, así que los anillos y abanicos ya no se cortan a la mitad. Los jefes también esperan menos entre habilidades (`restFrames`).


---

# Cambios: niveles retro de 40 s, nivel de ataque que se conserva, CONTINUAR y HUD nuevo

## 1. Niveles retro (bonus de 8 bits) — `bonus.js`
- **Duración**: las oleadas duran **~40 segundos** (`STAGE_END = 2440` cuadros; antes ~70 s). Después viene el mini jefe como siempre.
- **Más rápidos**: los enemigos se mueven más rápido (`S.fm`, de x1.12 en el mundo 1 a x1.27 en el 7) y el fondo avanza más deprisa.
- **Cada mundo es más complejo** (`genScript(wi)`):
  - Más oleadas: 10 en el mundo 1 … 16 en el mundo 7, cada vez más juntas (se solapan).
  - Formaciones nuevas según el mundo: **doble** (mundo 3+), **muro con hueco** (4+), **fuego cruzado** (5+), **enjambre** (6+).
  - Los disparos enemigos se vuelven más variados (apuntado → abanico → anillo) y más frecuentes; las balas van más rápido (`dm()`).
- Los power-ups (cápsulas, estación de suministros) se conservan, solo que más seguidos.

## 2. Nivel de ataque (1-15) — `game.js`
- Al perder una vida **ya no baja el Nivel de Ataque** ni se reinicia el progreso de enemigos hacia el siguiente nivel.

## 3. CONTINUAR (2 intentos) — `game.js` (`openContinue`, `reviveFromContinue`)
- Al quedarte sin vidas aparece **¿CONTINUAR?** con cuenta atrás de 10 s. **ENTER / C / clic en SI** = revivir; **ESC / N / clic en NO** = terminar.
- Tienes **2 intentos** por partida (`MAX_CONTINUES`). Al revivir recuperas las vidas iniciales de Opciones, conservas **puntaje y partners**; el Nivel de Ataque, Power, Graze y power-ups vuelven a empezar. Tienes 3,5 s de escudo.
- Funciona junto con el Fénix de la tienda (el Fénix se gasta primero).

## 4. HUD nuevo — `hud.js`
- Mismo estilo que el menú (cian/magenta, esquinas tipo visor, logo con aberración cromática, líneas CRT).
- Dinámico: puntaje que rueda con rebote y "+N" flotantes, corazones que laten (más rápido con 1 vida), sacudida y viñeta roja al ser golpeado, viñeta azul al revivir, 15 pips de ataque por colores con "LEVEL UP", partners como orbes, bomba lista que pulsa en dorado, efectos con cuenta atrás, barra de oleada y de vida del jefe.
- Funciona en los 3 formatos (lateral, vertical estilo Touhou y barra inferior del móvil). Si algo falla, usa el HUD antiguo (sigue en `game.js`).

## Naves (remake)

| Nave | Habilidad |
|------|-----------|
| 1 Tanque | Blindaje: absorbe 1 golpe y se recarga a los 22 s |
| 2 Sniper | Mira láser, carga más corta y disparo perforante |
| 3 Ligera | Cadencia alta, graze x2 y estela |
| 4 Omega | Su bala de plasma borra balas enemigas |
| 5 Reimu (6 monedas) | Amuletos teledirigidos; con Shift, agujas rectas y órbitas juntas |
| 6 Marisa (7 monedas) | Estrellas + misiles; con Shift, Illusion Laser; bomba = Master Spark |

Al revivir con CONTINUAR, los pedazos de la nave se juntan sobre fondo negro antes de volver a la partida.
Para probar rápido en la consola del navegador: `Extras.dev.coins(7)`.


---

# NUEVO: Intro, menú y HUD estilo Touhou 6 + Modo Práctica

Archivos nuevos: `touhou_ui.js` (intro, menú, práctica) y `touhou_ui.css` (estilo escarlata). Cambios pequeños en `index.html`
(fuentes Noto Serif JP + Cinzel, `<canvas id="thStage">`, enlaces a los dos archivos), `game.js` (busca `practiceStage` / `TouhouUI`),
`extras.js` (la práctica no cuenta misiones ni genera portal) y `hud.js` (panel lateral nuevo).

## Intro (~12 s, cualquier tecla o clic la salta)
Tarjeta "SPACE GAME PROJECT presents" → niebla escarlata y luna roja que sube sobre la torre del reloj → el círculo mágico se dibuja →
la nave emerge entre pétalos y murciélagos → el título 宇宙遊戯 se estampa kanji por kanji (遊 en rojo, dentro de un aro) con el subtítulo
girado "the Embodiment of Scarlet Stars". Sale una vez por sesión; **Quit** la repite. Para verla otra vez: `TouhouUI.dev.intro()`.

## Menú
`Start · Practice Start · Score · Shop · Option · Quit` con lista escalonada. **↑↓** mover · **Z/Enter** aceptar · **X/Esc** volver
(en Start/Practice: **←→** cambia la dificultad; en Practice **↑↓** cambia el nivel). También funciona con ratón y táctil.
Los controles de antes (nave, nombre, modo, dificultad, JUGAR, ranking, misiones, tienda, opciones) se reutilizan: solo cambian de sitio.

## Modo Práctica
- Se desbloquea al **pasarte el juego**: vencer al jefe del nivel 6 en cualquier dificultad (Moderno).
- El **nivel 7 (Luna Sangrante)** se desbloquea al pasarte el juego en **Lunático** (vencer al jefe 7). Elegirlo cambia la dificultad a Lunático.
- Juegas un solo nivel (oleadas → mini jefe → jefe) y al vencer sale "PRACTICE CLEAR" y vuelves al menú.
- No guarda puntaje, no da estrella, no cuenta misiones diarias y no hay portal secreto. Siempre es modo Moderno.
- Progreso en el navegador (`localStorage` clave `sg_practice_v1`).
- Probar rápido (F12): `TouhouUI.dev.unlock(true)` abre práctica + nivel 7 · `TouhouUI.dev.lock()` lo bloquea otra vez.

## HUD
Panel lateral (y modo vertical) con celosía carmesí, texto serif con contorno: 最高得点 / 得点, **Player** (estrellas = vidas),
**Bomb** (estrella verde → dorada cuando está lista), **Power** (barra violeta = Nivel de Ataque 1-15), **Graze**, Partner, Continue,
Stage + barra de oleada/jefe, efectos activos, emblema del título y contador de fps. Etiqueta **Enemy ★★★** arriba a la izquierda con jefe.
La barra inferior del móvil vertical conserva su diseño, solo recoloreado.


---

# NUEVO: Interfaces rediseñadas (Comenzar, Puntajes, Opciones)

- **Comenzar / Modo Práctica**: dos columnas. A la izquierda el **HANGAR**: la nave en su círculo mágico giratorio, flechas ◀ ▶ para
  cambiarla (también con las teclas ←→), descripción de su habilidad, barras de VELOCIDAD / PODER / DEFENSA (valoración orientativa) y
  miniaturas numeradas; las naves bloqueadas se ven en gris con su candado y lo que falta para abrirlas. A la derecha: dificultad,
  modo (o lista de niveles en práctica), piloto y botón JUGAR. En Comenzar, ↑↓ cambia la dificultad; en Práctica, ↑↓ el nivel y Q/E la dificultad.
- **Puntajes**: pestañas **RANKING** y **MISIONES** (←→ para alternar). El ranking muestra un **podio** con los 3 mejores (corona, medallas,
  estrella si se pasó Lunático, dificultad con color) y una lista animada del 4.º al 10.º. Las misiones diarias se ven como tarjetas.
- **Opciones**: pestañas **JUEGO** (vidas con − / +, modo rendimiento), **PANTALLA** (CRT, HUD compacto, modo vertical, pantalla completa) y
  **CONTROLES** (modo teléfono y controles táctiles). Cada ajuste tiene icono y una explicación corta. **Esc / X** cierra.
- Los ids de todos los controles (`optLives`, `optCRT`, `optTouchSize`, `playerName`, ...) no cambiaron: el resto del juego los sigue leyendo igual.


---

# Código Konami (menú principal)
En el menú principal pulsa: **↑ ↑ ↓ ↓ ← → ← → B A** → se desbloquean **Reimu** y **Marisa** (equivale a `Extras.dev.coins(7)`; se guarda en el navegador).
Si ya las tienes, te avisa. Solo funciona con teclado y en la lista principal (no dentro de Comenzar/Opciones).


---

# Estructura de archivos
Todo el JavaScript está unido en `juego.js` (cada módulo con una cabecera `/* ===== nombre.js ===== */`), los estilos están dentro de `index.html` y los sprites/fondos van incrustados en `juego.js`. Quedan: `index.html`, `juego.js`, `api.php`, `space_game_juego.sql`, `archivo3.mp3`, `archivo5.mp3` y este README.


---

# NUEVO: Bonus de gemas con CÁMARA VERTICAL (espacio)

El nivel bonus (el del portal secreto) ahora se juega **hacia arriba**, como un shmup vertical, en pleno **espacio**.
Todo está en `bonus.js` (dentro de `juego.js`); `bonus_art.js` (jefes y enemigos) no cambió.

- **Cámara vertical**: la pantalla interna es de 192x256. La lógica del juego sigue igual y solo se gira el dibujo
  (`pantalla = (y, W - x)`), así que los enemigos entran por arriba, tus disparos suben y la nave mira hacia arriba.
  Controles: **↑ ↓ ← →** mover · **Espacio** disparar · **Z** bomba · **Shift** lento · **Esc** salir.
- **Fondo espacial** de 3 capas con paralaje (nebulosa tramada, estrellas que titilan, rocas y un planeta). Cada bonus
  usa los colores de su temática: Sakura (planeta rosa con lunita), Hielo (planeta con anillo), Lago (océano),
  Bosque, Biblioteca (anillo y franjas), Reloj (planeta con engranajes) y Luna Sangrante (luna con cráteres).
- **Enemigos que caen al azar**: además de las oleadas, caen enemigos sueltos en posiciones aleatorias. El guion se
  regenera cada vez que entras (ya no es siempre igual en la misma partida).
- **Filas de gemas**: cada ~3 s cae una formación (línea, onda, V, arco, zigzag, rombo, anillo o columna).
  Si atrapas **todas** las gemas de la fila: **FILA PERFECTA** y bonus de gemas.
- **Convoyes**: una fila de enemigos con una gema encima. Si destruyes a **todos**, sueltan una fila de gemas.
- **Mini jefe con la temática del nivel** al final (Rey Hongo, Golem Glacial, Rey Fantasma, Árbol Ancestral, Gran
  Grimorio, Relojero y Conde Lunar), con todos sus ataques adaptados a la caída: lluvia desde arriba, cortinas con
  hueco, rayos verticales/horizontales, embestida en picada, etc. Antes del jefe cae un gran premio de gemas.
- HUD y pantallas (intro, alerta, K.O., resultados) rediseñados para formato vertical. En la pantalla de resultados
  salen las filas perfectas y los convoyes.

Ajustes rápidos (en `bonus.js`): `PX_MIN` / `PX_MAX` (hasta dónde sube la nave), `STAGE_END` (duración antes del jefe),
`rowPat` y los bucles de "NUEVO (cámara vertical)" en `genScript` (frecuencia de filas, convoyes y enemigos al azar).
Para probar: `Extras.dev.retro(0)` (1..7 = 0..6) con una partida en curso.

## Nave 7 · Goku (secreta)

- En el menú aparece de vez en cuando una **esfera del dragón de 4 estrellas**. Tócala para desbloquear a Goku (se guarda en `localStorage`, clave `sg_goku_v1`).
- Disparo: bolas de ki en abanico · con **Shift**: ráfaga de ki · **Bomba (Z): Kamehameha**.
- Se transforma en Super Saiyajin al llegar al Nivel de Ataque 10 y durante el Kamehameha.
- Pruebas desde la consola: `Goku.dev.spawn()`, `Goku.dev.unlock()`, `Goku.dev.lock()`.


# Novedades: sprites de jefes y mini jefes rediseñados (modo bullet hell)

- Los **6 jefes** y los **7 mini jefes** tienen sprites nuevos de pixel art con más resolución (jefes 58×46 px, mini jefes 30×30 px; antes 24×20 y 16×16, por eso se veían como bloques enormes). Siguen siendo simétricos (espejados) y con 2 cuadros de animación; llevan sombreado con luz desde arriba, contorno y paleta propia por nivel.
- **Jefes:** 1 Kyūbi (zorro de nueve colas con hitodama y collar de magatamas) · 2 Rey Yeti (corona y carámbanos de hielo) · 3 Kraken Espectral (tentáculos con ventosas brillantes) · 4 Reina Araña (corona, patas articuladas, reloj de arena) · 5 Archiliche Bibliotecario (sombrero, cráneo, libro abierto y páginas flotantes) · 6 Coloso del Reloj (esfera de reloj en el pecho y engranajes). El ojo gigante del nivel 7 no se tocó.
- **Mini jefes:** Tengu · Golem de cristal · Pez abisal (con señuelo) · Búho · Golem de pergaminos · Reloj centinela · Ángel caído.
- Solo cambió el dibujo (la entrada `SHMUP_ART` b0–b5 y m0–m6 en `juego.js`). Hitboxes, patrones, vida, auras y presentaciones no se modificaron. El motor escala cada sprite en múltiplos enteros al tamaño del jefe, así que se ven nítidos en PC y teléfono.

# Novedades: enemigos con el mismo estilo que los jefes

- Los **21 enemigos** (3 por nivel) tienen sprites nuevos con más resolución (tipo 1: 18×18, tipo 2: 24×24, tipo 3: 14×14; antes 12×12), mismo sombreado, contorno y simetría que los jefes, y 2 cuadros de animación. Cada uno tiene **variante de color** (aparece ~42 % de las veces, como antes): ahora las 21 tienen variante.
- Nivel 1: cíclope rosa · oni · llama hitodama. Nivel 2: copo de nieve · mini yeti · carámbano. Nivel 3: medusa fantasma · cangrejo · invader. Nivel 4: seta · tocón con cara · araña. Nivel 5: libro vivo · gárgola · pluma. Nivel 6: engranaje-ojo · robot de acero · murciélago mecánico. Nivel 7: ángel · demonio · diablillo alado.
- Solo cambió el dibujo (entradas `e00`–`e62` de `SHMUP_ART` en `juego.js`): hitboxes, vida, velocidad y disparos son los mismos. El motor los escala en múltiplos enteros (×4).


---

## v17 · Jefe secreto del modo LUNÁTICO: «¡¡EL INVASOR!!» (`invasor.js`)

Al vencer al **Ojo Gigante** (nivel 7, Lunático) ya no aparece la victoria directamente:

1. La pantalla se oscurece y empiezan unos **créditos falsos**.
2. A mitad de los créditos se cuela el sprite del invasor clásico de *Space Invaders*, la pantalla se agrieta, **rompe la cuarta pared** y el fondo negro estalla en pedazos.
3. Combate contra el jefe más loco del juego, con **barra de vida blanca** y 3 fases (a 66 % y 33 % de vida).
   Ataques de arcade: Zigzag y Plunger (las balas originales), Invasión (formación de esbirros que marchan), Escudos 1978
   (bunkers que se erosionan), OVNI misterioso (si lo derribas suelta un ítem), Pong, Tetris, Asteroids, Pac-Man y
   fantasmas, Space Invaders hecho de balas, Insert Coin (espiral) y Cañón Láser. Cuanto menos vida, más rápido marcha (como el original).
4. Al vencerlo se muestra la pantalla de victoria de siempre (estrella de Lunático, perfil, etc.).

`invasor.js` se carga después de `perfil.js` y no modifica `juego.js`: engancha `triggerGameWin()`,
`Extras.takeover()`, `Extras.busy()` y `Extras.afterFrame()`. También funciona en el Modo Práctica del nivel 7.
Ajustes rápidos: vida del jefe → `this.maxHp` en `InvaderBoss`; duración de los créditos → velocidad `1.5` en `creditsFrame()`.

## v17 · Secreto: Modo Práctica con los 7 niveles

Toca **50 veces la nave del menú principal** (con pausas menores a 3 s entre toques) y se desbloquea el Modo Práctica
con los 7 niveles, sin tener que pasarte el juego. A partir del toque 10 aparece un aviso con los toques que faltan.
Se guarda en `localStorage` (`sg_practice_v1`). En la pantalla de práctica eliges nave con el hangar, como siempre.
