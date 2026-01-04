<?php
/**
 * Plugin Name: Darts Training
 * Description: Training games, ranks, and rewards for darts players. React-powered frontend.
 * Version: 0.1.0
 * Author: You
 */

if ( ! defined('ABSPATH') ) exit;

define('DT_VER', '0.1.0');
define('DT_PATH', plugin_dir_path(__FILE__));
define('DT_URL', plugin_dir_url(__FILE__));

require_once DT_PATH.'includes/class-dt-activator.php';
require_once DT_PATH.'includes/class-dt-games.php';
require_once DT_PATH.'includes/class-dt-progression.php';
require_once DT_PATH.'includes/class-dt-rewards.php';
require_once DT_PATH.'includes/class-dt-rest.php';
require_once DT_PATH.'public/class-dt-frontend.php';

register_activation_hook(__FILE__, ['DT_Activator','activate']);

add_action('init', function () {
  DT_Games::register_cpt();
});

add_action('rest_api_init', function () {
  (new DT_REST())->register_routes();
});

add_action('init', function () {
  (new DT_Frontend())->register();
});

// Optional: simple role for coaches.
register_activation_hook(__FILE__, function () {
  add_role('darts_coach','Darts Coach',['read'=>true]);
});
