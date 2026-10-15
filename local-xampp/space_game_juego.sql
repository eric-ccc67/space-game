-- phpMyAdmin SQL Dump (corregido)
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12
--
-- CORRECCIÓN: el dump original no creaba ni seleccionaba la base de datos,
-- así que si se importaba sin tener "space_game" ya creada y seleccionada
-- en phpMyAdmin, las tablas terminaban en la base equivocada (o fallaba el
-- import) y api.php nunca las encontraba. Ahora el script crea la base con
-- el charset correcto (utf8mb4) y se posiciona en ella antes de todo.

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS `space_game`
  DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE `space_game`;

CREATE TABLE IF NOT EXISTS `scores` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `player_name` varchar(10) NOT NULL,
  `score` int(11) unsigned NOT NULL,
  `difficulty` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_scores_player_name` (`player_name`),
  KEY `idx_scores_score` (`score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- v16: UN registro por jugador (clave = nombre, sin distinguir mayúsculas).
-- Guarda su mejor puntaje, las estadísticas de esa mejor partida (ítems, powerups, monedas, gemas,
-- enemigos, nivel...) y sus totales de por vida. También la estrella por completar LUNÁTICO.
-- (api.php crea / completa estas columnas solo; importar este archivo es opcional.)
CREATE TABLE IF NOT EXISTS `players` (
  `player_name` varchar(10) NOT NULL,
  `stars` int(11) NOT NULL DEFAULT 0,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `best_score` int(11) unsigned NOT NULL DEFAULT 0,
  `best_difficulty` varchar(10) NOT NULL DEFAULT 'medio',
  `best_mode` varchar(10) NOT NULL DEFAULT 'moderno',
  `best_level` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `best_victory` tinyint(1) NOT NULL DEFAULT 0,
  `best_items` int(11) unsigned NOT NULL DEFAULT 0,
  `best_powerups` int(11) unsigned NOT NULL DEFAULT 0,
  `best_coins` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `best_gems` int(11) unsigned NOT NULL DEFAULT 0,
  `best_kills` int(11) unsigned NOT NULL DEFAULT 0,
  `best_bombs` int(11) unsigned NOT NULL DEFAULT 0,
  `best_graze` int(11) unsigned NOT NULL DEFAULT 0,
  `best_power_lvl` tinyint(3) unsigned NOT NULL DEFAULT 1,
  `best_detail` text DEFAULT NULL,
  `last_score` int(11) unsigned NOT NULL DEFAULT 0,
  `games_played` int(11) unsigned NOT NULL DEFAULT 0,
  `victories` int(11) unsigned NOT NULL DEFAULT 0,
  `total_items` bigint(20) unsigned NOT NULL DEFAULT 0,
  `total_powerups` bigint(20) unsigned NOT NULL DEFAULT 0,
  `total_kills` bigint(20) unsigned NOT NULL DEFAULT 0,
  `max_coins` tinyint(3) unsigned NOT NULL DEFAULT 0,
  `gems` int(11) unsigned NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`player_name`),
  KEY `idx_players_best` (`best_score`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
