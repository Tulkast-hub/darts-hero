<?php

declare(strict_types=1);

/** @var array $config */

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

$allowedOrigins = $config['cors']['allowed_origins'] ?? [];

if (
    $origin !== '' &&
    in_array($origin, $allowedOrigins, true)
) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Headers: Content-Type, Authorization');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
    http_response_code(204);
    exit;
}