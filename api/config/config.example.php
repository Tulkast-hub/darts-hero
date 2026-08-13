<?php

return [
  'db' => [
    'host' => 'localhost',
    'name' => '',
    'user' => '',
    'pass' => '',
    'charset' => 'utf8mb4',
  ],

  'auth' => [
    'cookie_name' => 'dh_session',
    'cookie_domain' => '.darts-hero.com',
    'cookie_path' => '/',
    'cookie_secure' => true,
    'cookie_samesite' => 'None',
  ],

  'cors' => [
    'allowed_origins' => [],
  ],

  'admin' => [
    'admin_key' => '',
  ],

  'app' => [
    'base_url' => '',
    'debug' => false,
  ],

  'mail' => [
    'smtp_host' => '',
    'smtp_user' => '',
    'smtp_pass' => '',
    'smtp_secure' => 'tls',
    'smtp_port' => 587,
    'from_email' => '',
    'from_name' => 'Darts Hero',
  ],
];