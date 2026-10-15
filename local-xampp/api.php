<?php
// api.php  (v16)
// ---------------------------------------------------------------------------
// Perfiles de jugador + ranking.
//
//  * Cada jugador tiene UN solo registro en la tabla `players` (clave = nombre, sin distinguir
//    mayúsculas). Ahí se guardan: su MEJOR puntaje, las estadísticas de esa mejor partida
//    (ítems, powerups, monedas, gemas, enemigos, nivel...) y sus totales de por vida.
//  * Al terminar CUALQUIER partida (morir o ganar) el juego llama a  ?action=saveRun.
//    Si el puntaje nuevo supera el mejor guardado, el registro se ACTUALIZA; si no, el mejor
//    puntaje se conserva y solo se suman los contadores de por vida.
//  * `scores` queda como historial de partidas (una fila por partida) por compatibilidad.
//  * El esquema se crea / actualiza solo (ensureSchema), no hace falta volver a importar el .sql.
//
// Acciones:  saveRun (POST) · getTop · save (POST, compatibilidad) · addStar (POST)
// ---------------------------------------------------------------------------

header("Content-Type: application/json; charset=utf-8");

$host = "localhost";
$user = "root";   // Usuario por defecto de XAMPP
$pass = "";       // Contraseña por defecto (vacía en XAMPP)
$dbname = "space_game";

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $user,
        $pass,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]
    );
} catch (PDOException $e) {
    http_response_code(500);
    die(json_encode(["error" => "No se pudo conectar a la base de datos."]));
}

const DIFICULTADES_VALIDAS = ['facil', 'medio', 'dificil', 'lunatico'];
const MODOS_VALIDOS = ['moderno', 'infinito', 'clasico'];

// ---------------------------------------------------------------- esquema
function ensureSchema(PDO $pdo): void {
    $pdo->exec("CREATE TABLE IF NOT EXISTS `scores` (
        `id` int(11) NOT NULL AUTO_INCREMENT,
        `player_name` varchar(10) NOT NULL,
        `score` int(11) unsigned NOT NULL,
        `difficulty` varchar(10) NOT NULL,
        `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
        PRIMARY KEY (`id`),
        KEY `idx_scores_player_name` (`player_name`),
        KEY `idx_scores_score` (`score`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    $pdo->exec("CREATE TABLE IF NOT EXISTS `players` (
        `player_name` varchar(10) NOT NULL,
        `stars` int(11) NOT NULL DEFAULT 0,
        `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
        PRIMARY KEY (`player_name`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci");

    // Columnas nuevas (se agregan solo si faltan; funciona en MySQL y MariaDB).
    $nuevas = [
        'best_score'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_difficulty' => "varchar(10) NOT NULL DEFAULT 'medio'",
        'best_mode'       => "varchar(10) NOT NULL DEFAULT 'moderno'",
        'best_level'      => "tinyint(3) unsigned NOT NULL DEFAULT 0",
        'best_victory'    => "tinyint(1) NOT NULL DEFAULT 0",
        'best_items'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_powerups'   => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_coins'      => "tinyint(3) unsigned NOT NULL DEFAULT 0",
        'best_gems'       => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_kills'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_bombs'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_graze'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'best_power_lvl'  => "tinyint(3) unsigned NOT NULL DEFAULT 1",
        'best_detail'     => "text NULL",
        'last_score'      => "int(11) unsigned NOT NULL DEFAULT 0",
        'games_played'    => "int(11) unsigned NOT NULL DEFAULT 0",
        'victories'       => "int(11) unsigned NOT NULL DEFAULT 0",
        'total_items'     => "bigint(20) unsigned NOT NULL DEFAULT 0",
        'total_powerups'  => "bigint(20) unsigned NOT NULL DEFAULT 0",
        'total_kills'     => "bigint(20) unsigned NOT NULL DEFAULT 0",
        'max_coins'       => "tinyint(3) unsigned NOT NULL DEFAULT 0",
        'gems'            => "int(11) unsigned NOT NULL DEFAULT 0",
        'created_at'      => "timestamp NOT NULL DEFAULT current_timestamp()",
    ];
    $existentes = [];
    foreach ($pdo->query("SHOW COLUMNS FROM `players`")->fetchAll(PDO::FETCH_ASSOC) as $c) {
        $existentes[$c['Field']] = true;
    }
    foreach ($nuevas as $col => $def) {
        if (!isset($existentes[$col])) {
            $pdo->exec("ALTER TABLE `players` ADD COLUMN `$col` $def");
        }
    }
    try { $pdo->exec("CREATE INDEX idx_players_best ON `players` (`best_score`)"); }
    catch (PDOException $e) { /* el índice ya existe */ }
}

// Si el esquema ya está al día, esto es una sola consulta rápida.
function schemaListo(PDO $pdo): bool {
    try {
        $n = $pdo->query("SELECT COUNT(*) FROM information_schema.COLUMNS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'players' AND COLUMN_NAME IN ('best_score','created_at','gems')")->fetchColumn();
        return (int)$n === 3;
    } catch (PDOException $e) {
        return false;
    }
}
if (!schemaListo($pdo)) {
    try {
        $existiaBest = false;
        try { $pdo->query("SELECT best_score FROM players LIMIT 1"); $existiaBest = true; } catch (PDOException $e) {}
        ensureSchema($pdo);
        if (!$existiaBest) {
            // Migración única: mejor puntaje por jugador a partir del historial antiguo (`scores`).
            try {
                $pdo->exec("INSERT INTO players (player_name, best_score, best_difficulty, last_score, games_played)
                    SELECT s.player_name, MAX(s.score),
                           COALESCE((SELECT s2.difficulty FROM scores s2 WHERE s2.player_name = s.player_name ORDER BY s2.score DESC LIMIT 1), 'medio'),
                           MAX(s.score), COUNT(*)
                    FROM scores s GROUP BY s.player_name
                    ON DUPLICATE KEY UPDATE best_score = VALUES(best_score), best_difficulty = VALUES(best_difficulty),
                                            last_score = VALUES(last_score), games_played = VALUES(games_played)");
            } catch (PDOException $e) { /* sin historial que migrar */ }
        }
    } catch (PDOException $e) {
        http_response_code(500);
        die(json_encode(["error" => "No se pudo preparar la base de datos."]));
    }
}

// ---------------------------------------------------------------- utilidades
function limpiarNombre($raw): string {
    $n = trim((string)$raw);
    $n = preg_replace('/[\x00-\x1F\x7F]/u', '', $n);
    return mb_substr($n, 0, 10, 'UTF-8');
}
function entero($v, int $max = 2147483647): int {
    return max(0, min($max, (int)(is_numeric($v) ? $v : 0)));
}

// Sentencias de guardado ----------------------------------------------------
// Devuelve ['isNewBest'=>bool, 'best'=>int, 'rank'=>int]
function guardarPartida(PDO $pdo, array $r): array {
    $pdo->beginTransaction();
    try {
        // Historial (una fila por partida)
        $pdo->prepare("INSERT INTO scores (player_name, score, difficulty) VALUES (?, ?, ?)")
            ->execute([$r['name'], $r['score'], $r['difficulty']]);

        $sel = $pdo->prepare("SELECT player_name, best_score FROM players WHERE player_name = ? FOR UPDATE");
        $sel->execute([$r['name']]);
        $fila = $sel->fetch(PDO::FETCH_ASSOC);

        $detalle = json_encode($r['detail'], JSON_UNESCAPED_UNICODE);
        if (strlen($detalle) > 2000) $detalle = '{}';
        $victoria = $r['victory'] ? 1 : 0;

        if (!$fila) {
            $isNewBest = true;
            $pdo->prepare("INSERT INTO players
                (player_name, best_score, best_difficulty, best_mode, best_level, best_victory, best_items, best_powerups,
                 best_coins, best_gems, best_kills, best_bombs, best_graze, best_power_lvl, best_detail,
                 last_score, games_played, victories, total_items, total_powerups, total_kills, max_coins, gems)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,?,?,?)")
                ->execute([
                    $r['name'], $r['score'], $r['difficulty'], $r['mode'], $r['level'], $victoria, $r['items'], $r['powerups'],
                    $r['coins'], $r['gems'], $r['kills'], $r['bombs'], $r['graze'], $r['powerLevel'], $detalle,
                    $r['score'], $victoria, $r['items'], $r['powerups'], $r['kills'], $r['coins'], $r['gems'],
                ]);
            $best = $r['score'];
        } else {
            $anterior = (int)$fila['best_score'];
            $isNewBest = $r['score'] > $anterior;
            // Totales de por vida: siempre se acumulan.
            $pdo->prepare("UPDATE players SET
                    last_score = ?, games_played = games_played + 1, victories = victories + ?,
                    total_items = total_items + ?, total_powerups = total_powerups + ?, total_kills = total_kills + ?,
                    max_coins = GREATEST(max_coins, ?), gems = ?
                WHERE player_name = ?")
                ->execute([$r['score'], $victoria, $r['items'], $r['powerups'], $r['kills'], $r['coins'], $r['gems'], $r['name']]);
            if ($isNewBest) {
                // Récord personal: se reemplazan el mejor puntaje y las estadísticas de esa partida.
                $pdo->prepare("UPDATE players SET
                        best_score = ?, best_difficulty = ?, best_mode = ?, best_level = ?, best_victory = ?, best_items = ?,
                        best_powerups = ?, best_coins = ?, best_gems = ?, best_kills = ?, best_bombs = ?, best_graze = ?,
                        best_power_lvl = ?, best_detail = ?
                    WHERE player_name = ?")
                    ->execute([
                        $r['score'], $r['difficulty'], $r['mode'], $r['level'], $victoria, $r['items'], $r['powerups'],
                        $r['coins'], $r['gems'], $r['kills'], $r['bombs'], $r['graze'], $r['powerLevel'], $detalle, $r['name'],
                    ]);
                $best = $r['score'];
            } else {
                $best = $anterior;
                // Aunque no sea récord, si ganó el juego en esta partida se refleja en su perfil (best_victory solo sube).
                if ($victoria) {
                    $pdo->prepare("UPDATE players SET best_victory = 1 WHERE player_name = ?")->execute([$r['name']]);
                }
            }
        }

        $rk = $pdo->prepare("SELECT COUNT(*) + 1 FROM players WHERE best_score > ?");
        $rk->execute([$best]);
        $rank = (int)$rk->fetchColumn();

        $pdo->commit();
        return ['isNewBest' => $isNewBest, 'best' => (int)$best, 'rank' => $rank];
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $e;
    }
}

// ---------------------------------------------------------------- rutas
$action = $_GET['action'] ?? '';
$esPost = $_SERVER['REQUEST_METHOD'] === 'POST';

if ($action === 'saveRun' && $esPost) {
    $d = json_decode(file_get_contents("php://input"), true);
    $name = is_array($d) ? limpiarNombre($d['name'] ?? '') : '';
    $dificultad = is_array($d) ? ($d['difficulty'] ?? '') : '';
    if ($name === '' || !is_array($d) || !isset($d['score']) || !is_numeric($d['score']) || !in_array($dificultad, DIFICULTADES_VALIDAS, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Datos incompletos o inválidos"]);
        exit;
    }
    $modo = in_array($d['mode'] ?? '', MODOS_VALIDOS, true) ? $d['mode'] : 'moderno';
    // Detalle de powerups por tipo: solo claves cortas y valores enteros.
    $detalle = [];
    if (isset($d['powerupsDetail']) && is_array($d['powerupsDetail'])) {
        $i = 0;
        foreach ($d['powerupsDetail'] as $k => $v) {
            if (++$i > 12) break;
            $detalle[mb_substr((string)$k, 0, 24, 'UTF-8')] = entero($v, 100000);
        }
    }
    $run = [
        'name' => $name,
        'score' => entero($d['score']),
        'difficulty' => $dificultad,
        'mode' => $modo,
        'level' => entero($d['level'] ?? 0, 255),
        'victory' => !empty($d['victory']),
        'items' => entero($d['items'] ?? 0),
        'powerups' => entero($d['powerups'] ?? 0),
        'coins' => entero($d['coins'] ?? 0, 7),
        'gems' => entero($d['gems'] ?? 0),
        'kills' => entero($d['kills'] ?? 0),
        'bombs' => entero($d['bombs'] ?? 0),
        'graze' => entero($d['graze'] ?? 0),
        'powerLevel' => max(1, entero($d['powerLevel'] ?? 1, 255)),
        'detail' => $detalle,
    ];
    try {
        $res = guardarPartida($pdo, $run);
        echo json_encode(["success" => true] + $res);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo guardar la partida."]);
    }
}
elseif ($action === 'save' && $esPost) {
    // Compatibilidad con versiones anteriores: solo nombre, puntaje y dificultad.
    $d = json_decode(file_get_contents("php://input"), true);
    $name = is_array($d) ? limpiarNombre($d['name'] ?? '') : '';
    if ($name === '' || !isset($d['score']) || !is_numeric($d['score']) || !in_array($d['difficulty'] ?? '', DIFICULTADES_VALIDAS, true)) {
        http_response_code(400);
        echo json_encode(["error" => "Datos incompletos o inválidos"]);
        exit;
    }
    try {
        $res = guardarPartida($pdo, [
            'name' => $name, 'score' => entero($d['score']), 'difficulty' => $d['difficulty'], 'mode' => 'moderno', 'level' => 0,
            'victory' => false, 'items' => 0, 'powerups' => 0, 'coins' => 0, 'gems' => 0, 'kills' => 0, 'bombs' => 0,
            'graze' => 0, 'powerLevel' => 1, 'detail' => [],
        ]);
        echo json_encode(["success" => true] + $res);
    } catch (Throwable $e) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo guardar el puntaje."]);
    }
}
elseif ($action === 'getTop') {
    // Un renglón por jugador con su mejor puntaje. Se conservan los nombres de campo antiguos
    // (player_name, score, difficulty, stars) y se agregan las estadísticas de esa mejor partida.
    try {
        $stmt = $pdo->query("SELECT player_name, best_score AS score, best_difficulty AS difficulty, stars,
                best_level AS level, best_victory AS victory, best_items AS items, best_powerups AS powerups,
                best_coins AS coins, best_gems AS gems, best_kills AS kills, games_played
            FROM players WHERE best_score > 0 ORDER BY best_score DESC, updated_at ASC LIMIT 10");
        echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(["error" => "No se pudo obtener el ranking."]);
    }
}
elseif ($action === 'addStar' && $esPost) {
    // Se llama al vencer al jefe final de la Fase 7 "Luna Sangrante" en LUNÁTICO.
    $d = json_decode(file_get_contents("php://input"), true);
    $name = is_array($d) ? limpiarNombre($d['name'] ?? '') : '';
    if ($name !== '') {
        try {
            $pdo->prepare("INSERT INTO players (player_name, stars) VALUES (?, 1) ON DUPLICATE KEY UPDATE stars = 1")->execute([$name]);
            echo json_encode(["success" => true]);
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(["error" => "No se pudo guardar la estrella."]);
        }
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Datos incompletos"]);
    }
}
else {
    http_response_code(400);
    echo json_encode(["error" => "Acción no reconocida"]);
}
