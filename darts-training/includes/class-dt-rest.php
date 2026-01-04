<?php
if (!defined('ABSPATH')) exit;

class DT_REST {

  public function register_routes() {
    // --- Auth ---
    register_rest_route('darts/v1','/login',[
      [
        'methods' => 'POST',
        'callback' => [$this,'login'],
        'permission_callback' => '__return_true',
      ]
    ]);

    register_rest_route('darts/v1','/logout',[
      [
        'methods' => 'POST',
        'callback' => [$this,'logout'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);

    register_rest_route('darts/v1','/me',[
      [
        'methods' => 'GET',
        'callback' => [$this,'me'],
        'permission_callback' => '__return_true',
      ]
    ]);

    // Server-synced progression snapshot for the logged-in user.
    register_rest_route('darts/v1','/me/progress',[
      [
        'methods' => 'GET',
        'callback' => [$this,'me_progress'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);

    // Onboarding choice (new | advanced)
    register_rest_route('darts/v1','/onboarding',[
      [
        'methods' => 'POST',
        'callback' => [$this,'post_onboarding'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);

    // Sessions
    register_rest_route('darts/v1','/session',[
      [
        'methods' => 'POST',
        'callback' => [$this,'start_session'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);

    register_rest_route('darts/v1','/session/(?P<id>\d+)',[
      [
        'methods' => 'POST',
        'callback' => [$this,'end_session'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);

    // Stats
    register_rest_route('darts/v1','/stats/(?P<game_key>[a-z0-9_-]+)',[
      [
        'methods' => 'GET',
        'callback' => [$this,'get_stats'],
        'permission_callback' => [$this,'auth'],
      ]
    ]);
  }

  public function auth() {
    return is_user_logged_in();
  }

  // -----------------------------
  // Helpers
  // -----------------------------

  private function me_payload($user_id) {
    $u = get_userdata($user_id);
    if (!$u) return ['id'=>0];

    return [
      'id' => (int)$u->ID,
      'login' => (string)$u->user_login,
      'display_name' => (string)$u->display_name,
      'email' => (string)$u->user_email,
    ];
  }

  private function all_game_keys() {
    // Must match your canonical keys / registry
    return [
      'bull_out',
      'doubles_world',
      'checkouts_popular_leaves',
      'checkout_121',
      'checkout_41_up',
      'checkout_25_repeat',
      't20_scoring',
      'scoring_ladder',
      'scoring_bingo',
    ];
  }

  /**
   * Builds an XP snapshot compatible with the frontend XpState.
   *
   * Shape:
   *  {
   *    totalXp: number,
   *    categoryXp: { scoring, finishing, doubles, bull, other },
   *    drillXp: { [game_key]: number }
   *  }
   */
  private function build_xp_state($user_id) {
    global $wpdb;
    $p = $wpdb->prefix;

    $rows = $wpdb->get_results(
      $wpdb->prepare("SELECT game_key, xp FROM {$p}dt_user_stats WHERE user_id=%d", $user_id),
      ARRAY_A
    );
    if (!is_array($rows)) $rows = [];

    // Merge legacy keys into canonical keys so XP does not fragment
    // across old URLs / renamed drills.
    $ALIASES = [
      'checkout_41' => 'checkout_41_up',
      'checkout_41_plus' => 'checkout_41_up',
      'finish_25' => 'checkout_25_repeat',
      'checkout_25' => 'checkout_25_repeat',
      'checkouts_popular_leaves' => 'three_dart_checkouts',
    ];

    $drillXp = [];
    $totalXp = 0;

    foreach ($rows as $r) {
      $g = isset($r['game_key']) ? (string)$r['game_key'] : '';
      $xp = isset($r['xp']) ? (int)$r['xp'] : 0;
      if ($g === '') continue;
      $canon = isset($ALIASES[$g]) ? $ALIASES[$g] : $g;
      $drillXp[$canon] = ($drillXp[$canon] ?? 0) + $xp;
      $totalXp += $xp;
    }

    // Optional: seeded overall XP for onboarding baseline
    $seed = (int)get_user_meta($user_id, 'dt_xp_seed', true);
    if ($seed > 0) $totalXp += $seed;

    // Category map is stored as usermeta game_key => category.
    $catMap = get_user_meta($user_id, 'dt_game_category_map', true);
    if (!is_array($catMap)) $catMap = [];

    $categoryXp = [
      'scoring' => 0,
      'finishing' => 0,
      'doubles' => 0,
      'bull' => 0,
      'other' => 0,
    ];

    foreach ($drillXp as $g => $xp) {
      // Prefer category mapped for the canonical key, fallback to any legacy keys.
      $cat = isset($catMap[$g]) ? (string)$catMap[$g] : null;
      if ($cat === null) {
        // Try reverse match from legacy keys
        foreach ($ALIASES as $legacy => $canon) {
          if ($canon === $g && isset($catMap[$legacy])) {
            $cat = (string)$catMap[$legacy];
            break;
          }
        }
      }
      if ($cat === null || $cat === '') $cat = 'other';
      if (!isset($categoryXp[$cat])) $cat = 'other';
      $categoryXp[$cat] += (int)$xp;
    }

    return [
      'totalXp' => (int)$totalXp,
      'categoryXp' => $categoryXp,
      'drillXp' => $drillXp,
    ];
  }

  // -----------------------------
  // Routes
  // -----------------------------

  public function me() {
    $uid = get_current_user_id();
    return [
      'user' => $uid ? $this->me_payload($uid) : ['id'=>0],
      'nonce' => wp_create_nonce('wp_rest'),
      'logged_in' => (bool)$uid,
      'needsOnboarding' => $uid ? !get_user_meta($uid, 'dt_onboarding_done', true) : false,
    ];
  }

  public function me_progress() {
    $uid = get_current_user_id();
    if (!$uid) {
      return new WP_Error('dt_not_logged_in', 'Not logged in', ['status'=>401]);
    }

    return [
      'ok' => true,
      'xpState' => $this->build_xp_state($uid),
      'needsOnboarding' => !get_user_meta($uid, 'dt_onboarding_done', true),
      'nonce' => wp_create_nonce('wp_rest'),
    ];
  }

  public function login(WP_REST_Request $r) {
    $username = (string)($r->get_param('username') ?? '');
    $password = (string)($r->get_param('password') ?? '');
    $remember = (bool)($r->get_param('remember') ?? true);

    if ($username === '' || $password === '') {
      return new WP_Error('dt_login_missing', 'Missing username or password', ['status'=>400]);
    }

    $creds = [
      'user_login' => $username,
      'user_password' => $password,
      'remember' => $remember,
    ];

    $user = wp_signon($creds, is_ssl());
    if (is_wp_error($user)) {
      return new WP_Error('dt_login_failed', $user->get_error_message(), ['status'=>401]);
    }

    // Ensure cookies set
    wp_set_current_user($user->ID);
    wp_set_auth_cookie($user->ID, $remember, is_ssl());

    return [
      'ok' => true,
      'user' => $this->me_payload($user->ID),
      'nonce' => wp_create_nonce('wp_rest'),
    ];
  }

  public function logout() {
    wp_logout();
    return [
      'ok' => true,
      'user' => ['id'=>0],
      'nonce' => wp_create_nonce('wp_rest'),
    ];
  }

  /**
   * POST /onboarding
   * Body: { choice: "new" | "advanced" }
   *
   * - "new": marks onboarding done, no XP change
   * - "advanced": sets ALL games to Silver I by seeding per-game XP >= 2000
   */
  public function post_onboarding(WP_REST_Request $req) {
    global $wpdb;
    $p = $wpdb->prefix;

    $user_id = get_current_user_id();
    if (!$user_id) {
      return new WP_REST_Response(['ok'=>false,'error'=>'not_logged_in'], 401);
    }

    $params = $req->get_json_params();
    $choice = isset($params['choice']) ? sanitize_text_field($params['choice']) : '';

    if (!in_array($choice, ['new', 'advanced'], true)) {
      return new WP_REST_Response(['ok'=>false,'error'=>'invalid_choice'], 400);
    }

    update_user_meta($user_id, 'dt_onboarding_done', 1);
    update_user_meta($user_id, 'dt_onboarding_choice', $choice);

    if ($choice === 'advanced') {
      // Silver I threshold per drill based on your engine:
      // drillTierMax=2000 => rankSize=400 => Silver I begins at XP >= 2000.
      $silver1_drill_xp = 2000;

      foreach ($this->all_game_keys() as $game_key) {
        $game_key = sanitize_key($game_key);

        $cur = (int)$wpdb->get_var($wpdb->prepare(
          "SELECT xp FROM {$p}dt_user_stats WHERE user_id=%d AND game_key=%s",
          $user_id,
          $game_key
        ));

        if ($cur <= 0) {
          // insert row if none
          $wpdb->insert("{$p}dt_user_stats", [
            'user_id' => $user_id,
            'game_key' => $game_key,
            'xp' => $silver1_drill_xp,
          ]);
        } elseif ($cur < $silver1_drill_xp) {
          // bump up to Silver I
          $wpdb->update("{$p}dt_user_stats",
            ['xp' => $silver1_drill_xp],
            ['user_id' => $user_id, 'game_key' => $game_key]
          );
        }
      }

      // Optional: overall seed so overall tier starts at Silver I too
      // overallTierMax=40000 => rankSize=8000 => Silver I begins at totalXp >= 40000
      $current_seed = (int)get_user_meta($user_id, 'dt_xp_seed', true);
      if ($current_seed < 40000) {
        update_user_meta($user_id, 'dt_xp_seed', 40000);
      }
    }

    return new WP_REST_Response([
      'ok' => true,
      'xpState' => $this->build_xp_state($user_id),
      'needsOnboarding' => false,
      'nonce' => wp_create_nonce('wp_rest'),
    ], 200);
  }

  public function start_session(WP_REST_Request $r) {
    global $wpdb;
    $p = $wpdb->prefix;

    $user_id = get_current_user_id();
    $game_key = sanitize_key($r->get_param('game_key'));
    // Canonicalize legacy keys so XP doesn't split across renamed drills.
    $ALIASES = [
      'checkout_41' => 'checkout_41_up',
      'checkout_41_plus' => 'checkout_41_up',
      'finish_25' => 'checkout_25_repeat',
      'checkout_25' => 'checkout_25_repeat',
      'checkouts_popular_leaves' => 'three_dart_checkouts',
    ];
    if (isset($ALIASES[$game_key])) $game_key = $ALIASES[$game_key];

    $wpdb->insert("{$p}dt_sessions", [
      'user_id' => $user_id,
      'game_key' => $game_key,
      'started_at' => current_time('mysql'),
    ]);

    return ['id' => (int)$wpdb->insert_id];
  }

  public function end_session(WP_REST_Request $r) {
    global $wpdb;
    $p = $wpdb->prefix;

    $id = (int)$r->get_param('id');
    $uid = get_current_user_id();

    $game_key = sanitize_key($r->get_param('game_key'));
    // Canonicalize legacy keys so XP doesn't split across renamed drills.
    $ALIASES = [
      'checkout_41' => 'checkout_41_up',
      'checkout_41_plus' => 'checkout_41_up',
      'finish_25' => 'checkout_25_repeat',
      'checkout_25' => 'checkout_25_repeat',
      'checkouts_popular_leaves' => 'three_dart_checkouts',
    ];
    if (isset($ALIASES[$game_key])) $game_key = $ALIASES[$game_key];
    $payload_arr = $r->get_param('payload');
    if (!is_array($payload_arr)) $payload_arr = [];
    $payload = wp_json_encode($payload_arr);

    // Optional standardized DrillResult metadata from the client.
    $result = $r->get_param('result');
    if (!is_array($result)) $result = [];

    $category = (string)($result['category'] ?? 'other');
    if ($category === '') $category = 'other';

    $tier = (string)($result['tier'] ?? 'Bronze');
    $level = (int)($result['level'] ?? 1);
    $win = (bool)($result['win'] ?? false);
    $aborted = (bool)($result['aborted'] ?? false);

    $throws_used = isset($result['throws_used']) ? (int)$result['throws_used'] : null;
    $max_throws = isset($result['max_throws']) ? (int)$result['max_throws'] : null;

    // Compute XP using your progression helper (must exist).
    $xp = 0;
    if (class_exists('DT_Progression') && method_exists('DT_Progression', 'compute_xp_from_result')) {
      $xp = DT_Progression::compute_xp_from_result([
        'game_key' => $game_key,
        'category' => $category,
        'tier' => $tier,
        'level' => $level,
        'win' => $win,
        'aborted' => $aborted,
        'throws_used' => $throws_used,
        'max_throws' => $max_throws,
        'payload' => $payload_arr,
      ]);
    }

    // Update session row
    $wpdb->update("{$p}dt_sessions", [
      'ended_at' => current_time('mysql'),
      'payload' => $payload,
      'xp_earned' => (int)$xp,
    ], ['id' => $id]);

    // Apply XP to per-game stats
    if (class_exists('DT_Progression') && method_exists('DT_Progression', 'apply_xp')) {
      DT_Progression::apply_xp($uid, $game_key, (int)$xp);
    } else {
      // Fallback: update dt_user_stats directly
      $cur = (int)$wpdb->get_var($wpdb->prepare(
        "SELECT xp FROM {$p}dt_user_stats WHERE user_id=%d AND game_key=%s",
        $uid,
        $game_key
      ));
      if ($cur <= 0) {
        $wpdb->insert("{$p}dt_user_stats", [
          'user_id' => $uid,
          'game_key' => $game_key,
          'xp' => (int)$xp,
        ]);
      } else {
        $wpdb->update("{$p}dt_user_stats",
          ['xp' => (int)($cur + (int)$xp)],
          ['user_id' => $uid, 'game_key' => $game_key]
        );
      }
    }

    // Persist category map for category totals
    $catMap = get_user_meta($uid, 'dt_game_category_map', true);
    if (!is_array($catMap)) $catMap = [];
    $catMap[$game_key] = $category;
    update_user_meta($uid, 'dt_game_category_map', $catMap);

    return [
      'ok' => true,
      'xp' => (int)$xp,
      'xpState' => $this->build_xp_state($uid),
      'nonce' => wp_create_nonce('wp_rest'),
    ];
  }

  public function get_stats(WP_REST_Request $r) {
    global $wpdb;
    $p = $wpdb->prefix;

    $user_id = get_current_user_id();
    $g = sanitize_key($r->get_param('game_key'));

    $row = $wpdb->get_row(
      $wpdb->prepare("SELECT * FROM {$p}dt_user_stats WHERE user_id=%d AND game_key=%s", $user_id, $g),
      ARRAY_A
    );

    return is_array($row) ? $row : [];
  }
}
