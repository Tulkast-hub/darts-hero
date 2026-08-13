<?php

declare(strict_types=1);

$configPath = dirname(__DIR__) . '/config/config.php';

if (!file_exists($configPath)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode([
        'error' => 'Missing server config',
    ]);

    exit;
}

$config = require $configPath;

$autoloadPath = dirname(__DIR__) . '/vendor/autoload.php';

if (file_exists($autoloadPath)) {
    require $autoloadPath;
}

if (!empty($config['app']['debug'])) {
    ini_set('display_errors', '1');
    ini_set('display_startup_errors', '1');
    error_reporting(E_ALL);
} else {
    ini_set('display_errors', '0');
    ini_set('display_startup_errors', '0');
    error_reporting(E_ALL);
}

require __DIR__ . '/cors.php';
require __DIR__ . '/db.php';
require __DIR__ . '/auth.php';
require __DIR__ . '/routes.php';