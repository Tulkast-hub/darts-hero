<?php
declare(strict_types=1);

use PHPMailer\PHPMailer\PHPMailer;

/**
 * Normalize request paths so:
 *   //login   -> /login
 *   /login/   -> /login
 * This avoids 404s caused by double slashes or trailing slashes.
 */
function norm_path(string $path): string {
  // Collapse multiple slashes
  $path = preg_replace('#/+#', '/', $path);

  // Remove trailing slash (except root)
  if ($path !== '/' && substr($path, -1) === '/') {
    $path = rtrim($path, '/');
  }

  return $path;
}


function route(string $method, string $path): bool {
  $reqPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
  $reqPath = norm_path($reqPath);

  return ($_SERVER['REQUEST_METHOD'] ?? '') === $method
    && $reqPath === $path;
}

function route_param(string $method, string $pattern, ?array &$matches = null): bool {
  if (($_SERVER['REQUEST_METHOD'] ?? '') !== $method) return false;

  $reqPath = (string) parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
  $reqPath = norm_path($reqPath);

  if (preg_match($pattern, $reqPath, $m)) { $matches = $m; return true; }
  return false;
}

/** @var array $config */
$pdo = db($config);

function json_get(array $row, string $key): array {
  $raw = $row[$key] ?? '{}';
  $arr = json_decode((string)$raw, true);
  return is_array($arr) ? $arr : [];
}

function json_set(PDO $pdo, int $uid, int $total, array $catXp, array $drillXp): void {
  $pdo->prepare("UPDATE dh_xp_state
                 SET total_xp = ?, category_xp = ?, drill_xp = ?
                 WHERE user_id = ?")
      ->execute([
        $total,
        json_encode($catXp, JSON_UNESCAPED_UNICODE),
        json_encode($drillXp, JSON_UNESCAPED_UNICODE),
        $uid
      ]);
}

function ensure_xp_row(PDO $pdo, int $uid): array {
  $stmt = $pdo->prepare("SELECT total_xp, category_xp, drill_xp FROM dh_xp_state WHERE user_id = ? LIMIT 1");
  $stmt->execute([$uid]);
  $row = $stmt->fetch();
  if ($row) return $row;

  $pdo->prepare("INSERT INTO dh_xp_state (user_id, total_xp, category_xp, drill_xp)
                 VALUES (?, 0, JSON_OBJECT(), JSON_OBJECT())")
      ->execute([$uid]);

  return ['total_xp' => 0, 'category_xp' => '{}', 'drill_xp' => '{}'];
}

function xp_category_for_game(string $gameKey, $result): string {
  // Prefer explicit category sent by the frontend in result payload if present
  if (is_array($result) && isset($result['category']) && is_string($result['category'])) {
    $c = $result['category'];
    if (in_array($c, ['scoring','finishing','doubles','bull','other'], true)) return $c;
  }

  // Hard fallback map (prevents “missing doubles/bull”)
  static $fallback = [
    // doubles
    'doubles_world' => 'doubles',
    // bull
    'bull_out' => 'doubles',

    // finishing
    'three_dart_checkouts' => 'finishing',
    'checkout_121' => 'finishing',
    'checkout_41_up' => 'finishing',
    'checkout_25_repeat' => 'finishing',
    'checkouts_popular_leaves' => 'finishing',

    // scoring
    't20_scoring' => 'scoring',
    'scoring_ladder' => 'scoring',
    'scoring_bingo' => 'scoring',
  ];

  return $fallback[$gameKey] ?? 'other';
}


function xp_values_for_game(string $gameKey): array {
  static $xp = [
    // DOUBLING
    'bull_out' => ['win' => 120, 'loss' => 120],
    'doubles_world' => ['win' => 110, 'loss' => 55],
    'checkouts_popular_leaves' => ['win' => 110, 'loss' => 55],

    // SCORING
    't20_scoring' => ['win' => 120, 'loss' => 60],
    'scoring_ladder' => ['win' => 120, 'loss' => 60],
    'scoring_bingo' => ['win' => 120, 'loss' => 60],

    // FINISHING
    'checkout_41_up' => ['win' => 120, 'loss' => 60],
    'checkout_121' => ['win' => 120, 'loss' => 60],
    'checkout_25_repeat' => ['win' => 120, 'loss' => 60],
    'three_dart_checkouts' => ['win' => 110, 'loss' => 55],
  ];

  return $xp[$gameKey] ?? ['win' => 120, 'loss' => 120];
}

function compute_used_ratio($payload): ?float {
  if (!is_array($payload)) return null;

  $used =
    $payload['throws_used'] ?? $payload['throwsUsed'] ?? $payload['throws'] ?? $payload['darts_used'] ?? null;

  $max =
    $payload['max_throws'] ?? $payload['maxThrows'] ?? $payload['max_throws_total'] ?? $payload['maxThrowsTotal'] ?? null;

  if (!is_numeric($used) || !is_numeric($max) || (float)$max <= 0) return null;
  return ((float)$used) / ((float)$max);
}

function compute_progress_ratio($result): ?float {
  if (!is_array($result)) return null;
  if (isset($result['progress']) && is_numeric($result['progress'])) {
    $p = (float)$result['progress'];
    return max(0.0, min(1.5, $p));
  }
  return null;
}

function compute_xp_award(string $gameKey, $payload, $result): int {
  $vals = xp_values_for_game($gameKey);
  $winXp  = (int)$vals['win'];
  $lossXp = (int)$vals['loss'];

  $win = is_array($result) ? !empty($result['win']) : false;
  $aborted = is_array($result) ? !empty($result['aborted']) : false;

  // Abort counts as loss (your current TS comment)
  if ($aborted) {
    $penalty = -$lossXp;
    $progress = compute_progress_ratio($result);
    if ($progress !== null && $progress >= 0.8) {
      $penalty = -(int)round($lossXp * 0.3);
    }
    return $penalty;
  }

  if ($win) {
    $award = $winXp;

    // Great win: under 50% of darts used => +50% XP
    $usedRatio = compute_used_ratio($payload);
    if ($usedRatio !== null && $usedRatio < 0.5) {
      $award = (int)round($award * 1.5);
    }

    return $award;
  }

  // Loss
  $penalty = -$lossXp;

  // Close loss: progress >= 0.8 => only lose 30% of XP
  $progress = compute_progress_ratio($result);
  if ($progress !== null && $progress >= 0.8) {
    $penalty = -(int)round($lossXp * 0.3);
  }

  return $penalty;
}


function leaderboard_excluded_user_ids(): array {
  return [
    1,
    5,
    6,
  ];
}


function send_reset_email(    array $config,
string $toEmail,
string $name,
string $resetUrl
): bool {

  $m = $config['mail'];

  $mail = new PHPMailer(true);
  try {
    $mail->isSMTP();
    $mail->Host = $m['smtp_host'];
    $mail->SMTPAuth = true;
    $mail->Username = $m['smtp_user'];
    $mail->Password = $m['smtp_pass'];
    $mail->SMTPSecure = $m['smtp_secure'];
    $mail->Port = (int)$m['smtp_port'];

    $mail->setFrom($m['from_email'], $m['from_name']);
    $mail->addAddress($toEmail);

    $mail->isHTML(true);
    $mail->Subject = 'Reset your password';
    $mail->Body =
    '<p>Hello ' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . ',</p>' .
    '<p>We received a request to reset your Darts Hero password.</p>' .
    '<p><a href="' . htmlspecialchars($resetUrl, ENT_QUOTES, 'UTF-8') . '">Reset password</a></p>' .
    '<p>If you did not request this, you can ignore this email.</p>';
    $mail->AltBody =
    "Hello {$name},\n\n" .
    "Reset your Darts Hero password:\n{$resetUrl}\n\n" .
    "If you did not request this, you can ignore this email.";

    $mail->send();
    return true;
  } catch (Throwable $e) {
    error_log("Reset email send failed: " . $e->getMessage());
    return false;
  }
}


function make_reset_token(): string {
  return bin2hex(random_bytes(32)); // 64 chars
}

// Health
if (route('GET', '/health')) {
  json_out(200, ['ok' => true]);
}

// POST /admin/create-user  { admin_key, username, password, email?, display_name? }
if (route('POST', '/admin/create-user')) {
  $body = read_json_body();

  $adminKey = (string)($body['admin_key'] ?? '');
  $expected = (string)($config['admin']['admin_key'] ?? '');

  if ($expected === '' || !hash_equals($expected, $adminKey)) {
    json_out(403, ['error' => 'Forbidden']);
  }

  $username = trim((string)($body['username'] ?? ''));
  $password = (string)($body['password'] ?? '');
  $email = trim((string)($body['email'] ?? ''));
  $display = trim((string)($body['display_name'] ?? ''));

  if ($username === '' || $password === '') {
    json_out(400, ['error' => 'username and password required']);
  }
  if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    json_out(400, ['error' => 'Invalid email']);
  }

  // Prevent duplicates
  $stmt = $pdo->prepare("SELECT id FROM dh_users WHERE username = ? LIMIT 1");
  $stmt->execute([$username]);
  if ($stmt->fetch()) {
    json_out(409, ['error' => 'Username already exists']);
  }

  if ($email !== '') {
    $stmt = $pdo->prepare("SELECT id FROM dh_users WHERE email = ? LIMIT 1");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
      json_out(409, ['error' => 'Email already exists']);
    }
  }

  $hash = password_hash($password, PASSWORD_DEFAULT);
  $pdo->prepare("INSERT INTO dh_users (username, email, display_name, password_hash)
                 VALUES (?, ?, ?, ?)")
      ->execute([
        $username,
        $email !== '' ? $email : null,
        $display !== '' ? $display : null,
        $hash
      ]);

  $uid = (int)$pdo->lastInsertId();

  // Ensure XP row exists
  $pdo->prepare("INSERT IGNORE INTO dh_xp_state (user_id, total_xp, category_xp, drill_xp)
                 VALUES (?, 0, JSON_OBJECT(), JSON_OBJECT())")
      ->execute([$uid]);

  json_out(200, ['ok' => true, 'user' => ['id' => $uid, 'username' => $username]]);
}


// POST /login  { username, password, remember }
if (route('POST', '/login')) {
  $body = read_json_body();
  $username = trim((string)($body['username'] ?? ''));
  $password = (string)($body['password'] ?? '');

  if ($username === '' || $password === '') {
    json_out(400, ['error' => 'Username and password required']);
  }

  $stmt = $pdo->prepare("SELECT id, username, email, display_name, password_hash
                         FROM dh_users WHERE username = ? LIMIT 1");
  $stmt->execute([$username]);
  $u = $stmt->fetch();

  if (!$u || !password_verify($password, (string)$u['password_hash'])) {
    json_out(401, ['error' => 'Invalid credentials']);
  }

  $token = make_reset_token();
  $pdo->prepare("INSERT INTO dh_sessions (token, user_id, expires_at)
                 VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))")
      ->execute([$token, (int)$u['id']]);

  set_session_cookie($config, $token);

  json_out(200, [
    'ok' => true,
    'user' => ['id' => (int)$u['id']],
    'nonce' => make_nonce(),
  ]);
}

// POST /admin/reset-password
if (route('POST', '/admin/reset-password')) {
  $body = read_json_body();

  $adminKey = (string)($body['admin_key'] ?? '');
  $expected = (string)($config['admin']['admin_key'] ?? '');

  if ($expected === '' || !hash_equals($expected, $adminKey)) {
    json_out(403, ['error' => 'Forbidden']);
  }

  $username = trim((string)($body['username'] ?? ''));
  $password = (string)($body['password'] ?? '');

  if ($username === '' || $password === '') {
    json_out(400, ['error' => 'username and password required']);
  }

  $hash = password_hash($password, PASSWORD_DEFAULT);

  $stmt = $pdo->prepare("UPDATE dh_users SET password_hash = ? WHERE username = ?");
  $stmt->execute([$hash, $username]);

  json_out(200, ['ok' => true]);
}

// POST /logout
if (route('POST', '/logout')) {
  $token = get_session_token($config);
  if ($token) {
    $pdo->prepare("DELETE FROM dh_sessions WHERE token = ?")->execute([$token]);
  }
  clear_session_cookie($config);
  json_out(200, ['ok' => true, 'nonce' => make_nonce(), 'user' => ['id' => 0]]);
}

// POST /password/request-reset
if (route('POST', '/password/request-reset')) {
  $body = read_json_body();
  $identifier = trim((string)($body['identifier'] ?? ''));

  $okResponse = [
      'ok' => true,
      'nonce' => make_nonce(),
  ];

  if ($identifier === '') {
      json_out(200, $okResponse);
  }

  $stmt = $pdo->prepare("
      SELECT id, username, email, display_name
      FROM dh_users
      WHERE username = ? OR email = ?
      LIMIT 1
  ");

  $stmt->execute([
      $identifier,
      $identifier,
  ]);

  $u = $stmt->fetch();

  // Always return success so an attacker cannot determine
  // whether an account exists.
  if (!$u || empty($u['email'])) {
      json_out(200, $okResponse);
  }

  $uid = (int)$u['id'];

  $token = make_reset_token();

  $tokenHash = password_hash(
      $token,
      PASSWORD_DEFAULT
  );

  // Remove old unused reset tokens for this user.
  $pdo->prepare("
      DELETE FROM dh_password_resets
      WHERE user_id = ?
        AND used_at IS NULL
  ")->execute([$uid]);

  $pdo->prepare("
      INSERT INTO dh_password_resets (
          user_id,
          token_hash,
          expires_at
      )
      VALUES (
          ?,
          ?,
          DATE_ADD(NOW(), INTERVAL 30 MINUTE)
      )
  ")->execute([
      $uid,
      $tokenHash,
  ]);

  $appBase = rtrim(
      (string)($config['app']['base_url'] ?? ''),
      '/'
  );

  if ($appBase !== '') {
      $resetUrl =
          $appBase .
          "/#/reset-password?uid={$uid}&token={$token}";

      $name = (string)(
          $u['display_name']
          ?: $u['username']
      );

      send_reset_email(
          $config,
          (string)$u['email'],
          $name,
          $resetUrl
      );
  }

  json_out(200, $okResponse);
}


// POST /password/confirm-reset
if (route('POST', '/password/confirm-reset')) {
  $body = read_json_body();

  $uid = (int)($body['uid'] ?? 0);
  $token = (string)($body['token'] ?? '');
  $newPw = (string)($body['new_password'] ?? '');

  if (
      $uid <= 0 ||
      strlen($token) < 20 ||
      strlen($newPw) < 6
  ) {
      json_out(400, [
          'error' => 'Invalid request',
      ]);
  }

  $stmt = $pdo->prepare("
      SELECT id, token_hash
      FROM dh_password_resets
      WHERE user_id = ?
        AND used_at IS NULL
        AND expires_at > NOW()
      ORDER BY id DESC
      LIMIT 1
  ");

  $stmt->execute([$uid]);

  $row = $stmt->fetch();

  if (
      !$row ||
      !password_verify(
          $token,
          (string)$row['token_hash']
      )
  ) {
      json_out(400, [
          'error' => 'Reset link expired or invalid',
      ]);
  }

  $pdo->beginTransaction();

  try {
      $pdo->prepare("
          UPDATE dh_users
          SET password_hash = ?
          WHERE id = ?
      ")->execute([
          password_hash(
              $newPw,
              PASSWORD_DEFAULT
          ),
          $uid,
      ]);

      $pdo->prepare("
          UPDATE dh_password_resets
          SET used_at = NOW()
          WHERE id = ?
      ")->execute([
          (int)$row['id'],
      ]);

      // Force logout on all devices after a password reset.
      $pdo->prepare("
          DELETE FROM dh_sessions
          WHERE user_id = ?
      ")->execute([$uid]);

      $pdo->commit();

  } catch (Throwable $e) {
      $pdo->rollBack();

      throw $e;
  }

  json_out(200, [
      'ok' => true,
      'nonce' => make_nonce(),
  ]);
}

// GET /me  -> MeResponse
if (route('GET', '/me')) {
  $user = auth_user($pdo, $config);
  if (!$user) {
    json_out(200, [
      'logged_in' => false,
      'nonce' => make_nonce(),
      'user' => ['id' => 0],
      'needsOnboarding' => true,
    ]);
  }

  // onboarding?
  $onb = $pdo->prepare("SELECT choice FROM dh_onboarding WHERE user_id = ? LIMIT 1");
  $onb->execute([(int)$user['id']]);
  $needs = $onb->fetch() ? false : true;

  json_out(200, [
    'logged_in' => true,
    'nonce' => make_nonce(),
    'user' => [
      'id' => (int)$user['id'],
      'login' => $user['username'],
      'display_name' => $user['display_name'] ?: $user['username'],
      'email' => $user['email'],
    ],
    'needsOnboarding' => $needs,
  ]);
}

// GET /me/progress -> MeProgressResponse
if (route('GET', '/me/progress')) {
  $user = auth_user($pdo, $config);
  if (!$user) json_out(401, ['error' => 'Not authenticated']);

  $uid = (int)$user['id'];

  // ensure row exists
  $stmt = $pdo->prepare("SELECT total_xp, category_xp, drill_xp FROM dh_xp_state WHERE user_id = ? LIMIT 1");
  $stmt->execute([$uid]);
  $row = $stmt->fetch();

  if (!$row) {
    $pdo->prepare("INSERT INTO dh_xp_state (user_id, total_xp, category_xp, drill_xp)
                   VALUES (?, 0, JSON_OBJECT(), JSON_OBJECT())")
        ->execute([$uid]);
    $row = ['total_xp' => 0, 'category_xp' => '{}', 'drill_xp' => '{}'];
  }

  $onb = $pdo->prepare("SELECT choice FROM dh_onboarding WHERE user_id = ? LIMIT 1");
  $onb->execute([$uid]);
  $needs = $onb->fetch() ? false : true;

  json_out(200, [
    'ok' => true,
    'nonce' => make_nonce(),
    'xpState' => [
      'totalXp' => (int)$row['total_xp'],
      'categoryXp' => json_decode((string)$row['category_xp'], true) ?: [],
      'drillXp' => json_decode((string)$row['drill_xp'], true) ?: [],
    ],
    'needsOnboarding' => $needs,
  ]);
}

// POST /onboarding { choice }
if (route('POST', '/onboarding')) {
  $user = auth_user($pdo, $config);
  if (!$user) json_out(401, ['error' => 'Not authenticated']);
  $uid = (int)$user['id'];

  $body = read_json_body();
  $choice = (string)($body['choice'] ?? '');
  if (!in_array($choice, ['new_player', 'advanced_player'], true)) {
    json_out(400, ['error' => 'Invalid choice']);
  }

  $pdo->prepare("INSERT INTO dh_onboarding (user_id, choice)
                 VALUES (?, ?)
                 ON DUPLICATE KEY UPDATE choice = VALUES(choice)")
      ->execute([$uid, $choice]);

  // Ensure XP row exists
  ensure_xp_row($pdo, $uid);

  // Seed XP based on choice
  if ($choice === 'advanced_player') {
    $total = 18000;

    // Each category to 6000
    $catXp = [
      'scoring' => 6000,
      'finishing' => 6000,
      'doubles' => 6000,
      'bull' => 6000,
      'other' => 6000,
    ];

    // Each drill to 200 (include all known drills + legacy key)
    $drillXp = [
      'bull_out' => 2000,
      'doubles_world' => 2000,
      'three_dart_checkouts' => 2000,
      'checkouts_popular_leaves' => 2000, // legacy / alias safety
      'checkout_121' => 2000,
      'checkout_41_up' => 2000,
      'checkout_25_repeat' => 2000,
      't20_scoring' => 2000,
      'scoring_ladder' => 2000,
      'scoring_bingo' => 2000,
    ];

    json_set($pdo, $uid, $total, $catXp, $drillXp);
  } else {
    // new_player: reset to clean baseline (Bronze I)
    $total = 0;
    $catXp = [
      'scoring' => 0,
      'finishing' => 0,
      'doubles' => 0,
      'bull' => 0,
      'other' => 0,
    ];
    $drillXp = [];
    json_set($pdo, $uid, $total, $catXp, $drillXp);
  }

  // Return progress snapshot
  $stmt = $pdo->prepare("SELECT total_xp, category_xp, drill_xp FROM dh_xp_state WHERE user_id = ? LIMIT 1");
  $stmt->execute([$uid]);
  $row = $stmt->fetch() ?: ['total_xp' => 0, 'category_xp' => '{}', 'drill_xp' => '{}'];

  json_out(200, [
    'ok' => true,
    'nonce' => make_nonce(),
    'xpState' => [
      'totalXp' => (int)$row['total_xp'],
      'categoryXp' => json_decode((string)$row['category_xp'], true) ?: [],
      'drillXp' => json_decode((string)$row['drill_xp'], true) ?: [],
    ],
    'needsOnboarding' => false,
  ]);
}

// POST /session { game_key } -> { id }
if (route('POST', '/session')) {
  $user = auth_user($pdo, $config);
  if (!$user) json_out(401, ['error' => 'Not authenticated']);
  $uid = (int)$user['id'];

  $body = read_json_body();
  $gameKey = trim((string)($body['game_key'] ?? ''));
  if ($gameKey === '') json_out(400, ['error' => 'game_key required']);

  $pdo->prepare("INSERT INTO dh_sessions_run (user_id, game_key) VALUES (?, ?)")
      ->execute([$uid, $gameKey]);

  $id = (int)$pdo->lastInsertId();
  json_out(200, ['id' => $id]);
}

// POST /session/{id} -> EndSessionResponse
if (route_param('POST', '#^/session/(\d+)$#', $m)) {
  $user = auth_user($pdo, $config);
  if (!$user) json_out(401, ['error' => 'Not authenticated']);
  $uid = (int)$user['id'];

  $id = (int)$m[1];
  $body = read_json_body();

  $gameKey = trim((string)($body['game_key'] ?? ''));
  if ($gameKey === '') json_out(400, ['error' => 'game_key required']);

  $payload = $body['payload'] ?? null;
  $result  = $body['result'] ?? null;

  // Compute XP
  $xpAwarded = compute_xp_award($gameKey, $payload, $result);
  $cat = xp_category_for_game($gameKey, $result);

  // Persist session run
  $pdo->prepare("UPDATE dh_sessions_run
                 SET ended_at = NOW(), payload = ?, result = ?, xp_awarded = ?, game_key = ?
                 WHERE id = ? AND user_id = ?")
      ->execute([
        json_encode($payload),
        json_encode($result),
        $xpAwarded,
        $gameKey,
        $id,
        $uid,
      ]);
  
  // Load + update XP state
  $row = ensure_xp_row($pdo, $uid);

  $total = (int)$row['total_xp'];
  $catXp = json_get($row, 'category_xp');
  $drillXp = json_get($row, 'drill_xp');

  // Ensure all category keys exist so UI never sees “missing”
  foreach (['scoring','finishing','doubles','bull','other'] as $k) {
    if (!isset($catXp[$k]) || !is_numeric($catXp[$k])) $catXp[$k] = 0;
  }

  $total += $xpAwarded;
  $catXp[$cat] = (int)$catXp[$cat] + $xpAwarded;
  $drillXp[$gameKey] = (int)($drillXp[$gameKey] ?? 0) + $xpAwarded;

  // Don’t allow negative XP
  $total = max(0, $total);
  $catXp[$cat] = max(0, (int)$catXp[$cat]);
  $drillXp[$gameKey] = max(0, (int)$drillXp[$gameKey]);

  json_set($pdo, $uid, $total, $catXp, $drillXp);

  json_out(200, [
    'ok' => true,
    'xp' => $xpAwarded,
    'xpState' => [
      'totalXp' => $total,
      'categoryXp' => $catXp,
      'drillXp' => $drillXp,
    ],
    'nonce' => make_nonce(),
  ]);
}

// GET /leaderboard -> list users sorted by total_xp desc
if (route('GET', '/leaderboard')) {
  $user = auth_user($pdo, $config);
  if (!$user) json_out(401, ['error' => 'Not authenticated']);

$excludeIds = leaderboard_excluded_user_ids();


  // Build placeholders for NOT IN (?, ?, ?)
  $placeholders = implode(',', array_fill(0, count($excludeIds), '?'));

  $sql = "
    SELECT
      u.id AS user_id,
      u.username,
      COALESCE(u.display_name, u.username) AS display_name,
      x.total_xp,
      x.category_xp
    FROM dh_users u
    JOIN dh_xp_state x ON x.user_id = u.id
    WHERE u.id NOT IN ($placeholders)
    ORDER BY x.total_xp DESC
    LIMIT 200
  ";

  $stmt = $pdo->prepare($sql);
  $stmt->execute($excludeIds);

  $rows = [];
  while ($r = $stmt->fetch()) {
    $rows[] = [
      'user_id' => (int)$r['user_id'],
      'username' => (string)$r['username'],
      'display_name' => (string)$r['display_name'],
      'total_xp' => (int)$r['total_xp'],
      'category_xp' => json_decode((string)$r['category_xp'], true) ?: [],
    ];
  }

  json_out(200, [
    'ok' => true,
    'rows' => $rows,
    'nonce' => make_nonce(),
  ]);
}

json_out(404, ['error' => 'Not found']);
