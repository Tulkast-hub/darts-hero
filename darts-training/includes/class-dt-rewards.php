<?php
class DT_Rewards {
  public static function maybe_award(int $user_id, string $game_key, array $metrics): array {
    // Example rule: first session completion
    $awarded = [];
    // TODO: implement real rules; return list of reward_keys granted
    return $awarded;
  }
}
