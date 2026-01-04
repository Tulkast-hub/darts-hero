<?php
class DT_Activator {
  public static function activate() {
    global $wpdb;
    $charset = $wpdb->get_charset_collate();
    $p = $wpdb->prefix;

    $sql = [];
    $sql[] = "CREATE TABLE {$p}dt_levels (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      game_key VARCHAR(64) NOT NULL,
      tier VARCHAR(20) NOT NULL,
      sub_tier TINYINT NOT NULL,
      xp_threshold INT NOT NULL,
      UNIQUE KEY g_key (game_key, tier, sub_tier)
    ) $charset;";

    $sql[] = "CREATE TABLE {$p}dt_user_stats (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      game_key VARCHAR(64) NOT NULL,
      xp INT NOT NULL DEFAULT 0,
      mmr INT DEFAULT NULL,
      current_tier VARCHAR(20) NOT NULL DEFAULT 'Bronze',
      current_sub_tier TINYINT NOT NULL DEFAULT 1,
      streak_days INT NOT NULL DEFAULT 0,
      last_played DATETIME NULL,
      UNIQUE KEY ugg (user_id, game_key)
    ) $charset;";

    $sql[] = "CREATE TABLE {$p}dt_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      game_key VARCHAR(64) NOT NULL,
      started_at DATETIME NOT NULL,
      ended_at DATETIME NULL,
      payload JSON NULL,
      xp_earned INT NOT NULL DEFAULT 0
    ) $charset;";

    $sql[] = "CREATE TABLE {$p}dt_rewards (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reward_key VARCHAR(64) UNIQUE NOT NULL,
      name VARCHAR(120) NOT NULL,
      type VARCHAR(32) NOT NULL,
      meta JSON NULL
    ) $charset;";

    $sql[] = "CREATE TABLE {$p}dt_user_rewards (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      reward_key VARCHAR(64) NOT NULL,
      awarded_at DATETIME NOT NULL,
      UNIQUE KEY ur (user_id, reward_key)
    ) $charset;";

    require_once ABSPATH.'wp-admin/includes/upgrade.php';
    foreach ($sql as $stmt) { dbDelta($stmt); }
  }
}
