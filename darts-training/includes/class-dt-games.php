<?php
class DT_Games {
  public static function register_cpt() {
    register_post_type('dt_game', [
      'label' => 'Training Games',
      'public' => false,
      'show_ui' => true,
      'supports' => ['title','editor','custom-fields'],
      'menu_icon' => 'dashicons-performance',
      'show_in_rest' => true,
    ]);
    register_taxonomy('dt_category','dt_game',[
      'label'=>'Game Categories','public'=>false,'show_ui'=>true,'hierarchical'=>true,
      'show_in_rest' => true,
    ]);
  }
}
