<?php
class DT_Progression {
  public static function compute_xp(string $payload_json): int {
    $d = json_decode($payload_json, true) ?: [];
    $acc = min(max((int)($d['accuracy'] ?? 0), 0), 100);
    $diff = max(1, min(5, (int)($d['difficulty'] ?? 1)));
    $vol = max(1, (int)($d['volume'] ?? 30));
    $base = (int) round(($acc/100) * 50 + $diff * 20 + log(max(2,$vol), 2)*5);
    return max(5, min(150, $base));
  }

  /**
   * App-facing XP calculation.
   *
   * IMPORTANT: XP should match what is shown on the drill cards:
   * - A per-game base WIN XP
   * - A per-game base LOSS XP (applied as negative)
   * - Bonus for a "good" win
   * - Reduced penalty for a "soft" loss
   */
  public static function compute_xp_from_result(array $r): int {
    $payload = is_array($r['payload'] ?? null) ? $r['payload'] : [];

    $game_key = sanitize_key((string)($r['game_key'] ?? ($payload['game_key'] ?? '')));

    // Per-game XP config (keep in sync with public/app/src/xp/gameXp.ts).
    $GAME_XP = [
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
    $default = ['win' => 120, 'loss' => 120];
    $cfg = $GAME_XP[$game_key] ?? $default;

    $winBase = (int)($cfg['win'] ?? 120);
    $lossBase = (int)($cfg['loss'] ?? 120);

    // Accuracy: prefer explicit field, fallback to 0..100.
    $acc = null;
    if (isset($payload['accuracy'])) {
      $acc = (int)$payload['accuracy'];
    } else if (isset($r['accuracy'])) {
      $acc = (int)$r['accuracy'];
    }
    if ($acc === null) $acc = 0;
    $acc = min(max($acc, 0), 100);

    // Volume / efficiency: use throws_used and max_throws if available.
    $throws_used = isset($r['throws_used']) ? (int)$r['throws_used'] : null;
    $max_throws = isset($r['max_throws']) ? (int)$r['max_throws'] : null;
    if ($throws_used === null && isset($payload['throws_used'])) $throws_used = (int)$payload['throws_used'];
    if ($throws_used === null && isset($payload['throwsUsed'])) $throws_used = (int)$payload['throwsUsed'];
    if ($throws_used === null && isset($payload['throws'])) $throws_used = (int)$payload['throws'];
    if ($max_throws === null && isset($payload['max_throws'])) $max_throws = (int)$payload['max_throws'];
    if ($max_throws === null && isset($payload['maxThrows'])) $max_throws = (int)$payload['maxThrows'];

    $eff = 0.5;
    if ($throws_used !== null && $throws_used > 0) {
      if ($max_throws !== null && $max_throws > 0) {
        // Lower throws_used relative to max_throws => higher efficiency.
        $eff = 1.0 - min(1.0, max(0.0, ($throws_used - 1) / max(1, ($max_throws - 1))));
      } else {
        // If we only know throws used, approximate efficiency with a gentle curve.
        $eff = 1.0 / (1.0 + log(max(2, $throws_used), 2));
      }
    }

    $win = (bool)($r['win'] ?? false);
    $aborted = (bool)($r['aborted'] ?? false);

    // Objective ratio (progress / target) if provided.
    $ratio = null;
    if (isset($payload['objective']) && is_array($payload['objective'])) {
      $obj = $payload['objective'];
      $t = isset($obj['target']) ? (float)$obj['target'] : null;
      $p = isset($obj['progress']) ? (float)$obj['progress'] : null;
      if ($t !== null && $t > 0 && $p !== null) {
        $ratio = $p / $t;
      }
    }

    // Abort should behave like a loss (as the UI warns), using the base loss penalty.
    if ($aborted) {
      return (int) max(-150, -1 * $lossBase);
    }

    // --- Outcome shaping ---------------------------------------------------
    // "Good win" bonus when the player wins and also either:
    // - beats the target by 25%+ (ratio >= 1.25), OR
    // - has strong efficiency + accuracy.
    $isGoodWin = false;
    if ($win) {
      if ($ratio !== null && $ratio >= 1.25) $isGoodWin = true;
      if ($eff >= 0.75 && $acc >= 80) $isGoodWin = true;
    }

    // "Soft loss" when the player gets reasonably close (ratio >= 0.6).
    $isSoftLoss = false;
    if (!$win) {
      if ($ratio !== null && $ratio >= 0.6) $isSoftLoss = true;
      // If we don't have ratio (older payloads), use accuracy/eff as a proxy.
      if ($ratio === null && $acc >= 70) $isSoftLoss = true;
    }

    if ($win) {
      $xp = $winBase;
      if ($isGoodWin) $xp = (int) round($xp * 1.25);
      return (int) min(150, max(5, $xp));
    }

    // Loss (negative XP)
    $penalty = $lossBase;
    if ($isSoftLoss) $penalty = (int) round($penalty * 0.5);
    $xp = -1 * $penalty;
    return (int) max(-150, min(-5, $xp));
  }

  public static function apply_xp(int $user_id, string $game_key, int $xp): void {
    global $wpdb; $p=$wpdb->prefix;
    $row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$p}dt_user_stats WHERE user_id=%d AND game_key=%s",$user_id,$game_key));
    if (!$row) {
      $wpdb->insert("{$p}dt_user_stats",[
        'user_id'=>$user_id,'game_key'=>$game_key,'xp'=>0,'current_tier'=>'Bronze','current_sub_tier'=>1,'streak_days'=>1,'last_played'=>current_time('mysql')
      ]);
      $row = (object)['xp'=>0,'current_tier'=>'Bronze','current_sub_tier'=>1,'streak_days'=>1,'last_played'=>current_time('mysql')];
    }
    // Streak bonus was removed to keep XP deltas consistent with what's shown on the drill cards
    // (with only the intended "good win" and "soft loss" modifiers).
    $bonus = 0;
    $last = strtotime($row->last_played ?? '1970-01-01');
    if ( (time() - $last) >= 2*DAY_IN_SECONDS ) {
      $row->streak_days = 1;
    }
    $new_xp = (int)$row->xp + $xp;
    if ($new_xp < 0) $new_xp = 0;

    $tier_map = ['Bronze','Silver','Gold','Platinum','Diamond','Master'];
    $tier_idx = min((int) floor($new_xp / 600), count($tier_map)-1);
    $sub = min(3, max(1, (int) floor(($new_xp % 600) / 200) + 1));
    if ($tier_idx >= count($tier_map)-1) { $sub = 0; }

    $wpdb->update("{$p}dt_user_stats",[
      'xp'=>$new_xp,
      'current_tier'=>$tier_map[$tier_idx],
      'current_sub_tier'=>$sub,
      'streak_days'=>$row->streak_days,
      'last_played'=>current_time('mysql')
    ],['user_id'=>$user_id,'game_key'=>$game_key]);
  }
}
