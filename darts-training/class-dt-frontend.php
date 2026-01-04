<?php
class DT_Frontend {

  public function register() {
    add_shortcode('darts_training', [$this, 'shortcode']);
    add_action('wp_enqueue_scripts', [$this, 'enqueue_assets']);
    // Handle onboarding choice submissions (logged-in users only).
    add_action('admin_post_dt_onboarding', [$this, 'handle_onboarding']);
  }

  public function shortcode() {
    // If the user is not logged in, show an embedded WP login form and do not boot the React app.
    if (!is_user_logged_in()) {
      $args = [
        'echo' => false,
        'remember' => true,
        'redirect' => esc_url($_SERVER['REQUEST_URI'] ?? home_url('/')),
        'form_id' => 'dt-loginform',
        'id_username' => 'dt-user_login',
        'id_password' => 'dt-user_pass',
        'id_remember' => 'dt-rememberme',
        'id_submit' => 'dt-wp-submit',
        'label_username' => __('Username or Email'),
        'label_password' => __('Password'),
        'label_remember' => __('Remember Me'),
        'label_log_in' => __('Log In'),
      ];
      $html = '<div class="dt-login-wrap">';
      $html .= '<h3 style="margin:0 0 10px">Log in to Darts Training</h3>';
      $html .= wp_login_form($args);
      $html .= '</div>';
      return $html;
    }

    // If the user is logged in but has not completed onboarding, show the onboarding chooser.
    $uid = get_current_user_id();
    $done = get_user_meta($uid, 'dt_onboarding_done', true);
    if (!$done) {
      $action = esc_url(admin_url('admin-post.php'));
      $nonce = wp_create_nonce('dt_onboarding');
      $html = '<div class="dt-onboard-wrap">';
      $html .= '<h2 style="margin:0 0 6px">Welcome!</h2>';
      $html .= '<p style="margin:0 0 14px" class="muted">Choose your starting point. You can change this later.</p>';
      $html .= '<div class="dt-onboard-split" style="display:flex; flex-direction:column; gap:10px">';

      // New player
      $html .= '<form method="post" action="'.$action.'" class="dt-onboard-opt" style="flex:1">';
      $html .= '<input type="hidden" name="action" value="dt_onboarding" />';
      $html .= '<input type="hidden" name="choice" value="new_player" />';
      $html .= '<input type="hidden" name="_wpnonce" value="'.$nonce.'" />';
      $html .= '<button type="submit" style="width:100%; padding:14px; text-align:left">'
            . '<div style="font-weight:800; font-size:18px">New player</div>'
            . '<div class="muted" style="margin-top:4px">Start at Bronze I. Best if you’re new to structured training.</div>'
            . '</button>';
      $html .= '</form>';

      // Advanced player
      $html .= '<form method="post" action="'.$action.'" class="dt-onboard-opt" style="flex:1">';
      $html .= '<input type="hidden" name="action" value="dt_onboarding" />';
      $html .= '<input type="hidden" name="choice" value="advanced_player" />';
      $html .= '<input type="hidden" name="_wpnonce" value="'.$nonce.'" />';
      $html .= '<button type="submit" style="width:100%; padding:14px; text-align:left">'
            . '<div style="font-weight:800; font-size:18px">Advanced player</div>'
            . '<div class="muted" style="margin-top:4px">Start at Silver I. Recommended if you already play league-level darts.</div>'
            . '</button>';
      $html .= '</form>';

      // Choose later (defer until next login)
      $html .= '<form method="post" action="'.$action.'" class="dt-onboard-opt" style="flex:1">';
      $html .= '<input type="hidden" name="action" value="dt_onboarding" />';
      $html .= '<input type="hidden" name="choice" value="choose_later" />';
      $html .= '<input type="hidden" name="_wpnonce" value="'.$nonce.'" />';
      $html .= '<button type="submit" style="width:100%; padding:14px; text-align:left">'
            . '<div style="font-weight:800; font-size:18px">Choose later</div>'
            . '<div class="muted" style="margin-top:4px">Skip for now. We’ll ask again next time you log in.</div>'
            . '</button>';
      $html .= '</form>';

      $html .= '</div>';
      $html .= '</div>';
      return $html;
    }

    // Logged in + onboarded: boot the React app.
    wp_enqueue_script('dt-app');
    wp_enqueue_style('dt-style');
    return '<div id="dt-app"></div>';
  }

  public function handle_onboarding() {
    if (!is_user_logged_in()) {
      wp_safe_redirect(wp_login_url());
      exit;
    }
    check_admin_referer('dt_onboarding');

    $uid = get_current_user_id();
    $choice = isset($_POST['choice']) ? sanitize_text_field((string)$_POST['choice']) : '';

    if ($choice === 'choose_later') {
      // Do not write dt_onboarding_done; we want to ask again on next login.
      wp_safe_redirect(wp_get_referer() ?: home_url('/'));
      exit;
    }

    if ($choice !== 'new_player' && $choice !== 'advanced_player') {
      wp_safe_redirect(wp_get_referer() ?: home_url('/'));
      exit;
    }

    // Mark onboarding as completed.
    update_user_meta($uid, 'dt_onboarding_done', 1);
    update_user_meta($uid, 'dt_onboarding_choice', $choice);

    // Seed XP only if the user has no XP yet.
    if (class_exists('DT_REST')) {
      try {
        $rest = new DT_REST();
        $state = method_exists($rest, 'build_xp_state') ? $rest->build_xp_state($uid) : null;
        $hasXp = is_array($state) && !empty($state['totalXp']) && (int)$state['totalXp'] > 0;
        if (!$hasXp) {
          if ($choice === 'advanced_player') {
            update_user_meta($uid, 'dt_xp_seed', 40000);
          } else {
            delete_user_meta($uid, 'dt_xp_seed');
          }
        }
      } catch (\Throwable $e) {
        // Ignore.
      }
    }

    wp_safe_redirect(wp_get_referer() ?: home_url('/'));
    exit;
  }

  public function enqueue_assets() {
    // Support for Vite dev server when WP_DEBUG && constant defined
    $dev = defined('DT_VITE_DEV') && DT_VITE_DEV;
    if ($dev) {
      wp_register_script('dt-app', 'http://localhost:5173/src/main.tsx', [], DT_VER, true);
      wp_add_inline_script('dt-app', 'window.__DT_DEV__=true;', 'before');
      wp_register_style('dt-style', false);
    } else {
      $manifest_path = DT_PATH . 'public/app/dist/manifest.json';
$alt_manifest_path = DT_PATH . 'public/app/dist/.vite/manifest.json';
if (!file_exists($manifest_path) && file_exists($alt_manifest_path)) {
  $manifest_path = $alt_manifest_path;
}

if (!file_exists($manifest_path)) {
  // Fallback
  wp_register_script('dt-app', DT_URL.'public/fallback/app.min.js', [], DT_VER, true);
  wp_register_style('dt-style', DT_URL.'public/fallback/app.css', [], DT_VER);
} else {
  $manifest = json_decode(file_get_contents($manifest_path), true);
  $entry = null;
  foreach ($manifest as $k=>$v) {
    if (!empty($v['isEntry'])) { $entry = $v; break; }
  }
  if ($entry) {
    $js = DT_URL.'public/app/dist/'. $entry['file'];
    wp_register_script('dt-app', $js, [], DT_VER, true);
    if (!empty($entry['css'])) {
      foreach ($entry['css'] as $css) {
        wp_register_style('dt-style', DT_URL.'public/app/dist/'.$css, [], DT_VER);
      }
    } else {
      wp_register_style('dt-style', DT_URL.'public/app/dist/style.css', [], DT_VER);
    }
  }
}
    }

    wp_localize_script('dt-app','DTAPP',[
      'root'  => esc_url_raw( rest_url('darts/v1/') ),
      'nonce' => wp_create_nonce('wp_rest'),
      'user'  => get_current_user_id() ?: 0,
      'display_name' => is_user_logged_in() ? wp_get_current_user()->display_name : '',
    ]);
  }
}
