<?php

declare(strict_types=1);

function json_out(int $code, array $data): void {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');

    echo json_encode($data);

    exit;
}

function read_json_body(): array {
    $raw = file_get_contents('php://input');

    $data = json_decode(
        $raw ?: '[]',
        true
    );

    return is_array($data)
        ? $data
        : [];
}

function make_nonce(): string {
    return '';
}

function get_session_token(array $config): ?string {
    $cookieName = (string)($config['auth']['cookie_name'] ?? '');

    if ($cookieName === '') {
        return null;
    }

    $token = $_COOKIE[$cookieName] ?? null;

    return is_string($token) && $token !== ''
        ? $token
        : null;
}


function set_session_cookie(array $config, string $token): void {
    $auth = $config['auth'];

    setcookie(
        $auth['cookie_name'],
        $token,
        [
            'expires' => time() + (60 * 60 * 24 * 30),
            'path' => $auth['cookie_path'] ?? '/',
            'domain' => $auth['cookie_domain'] ?? '',
            'secure' => (bool)($auth['cookie_secure'] ?? true),
            'httponly' => true,
            'samesite' => $auth['cookie_samesite'] ?? 'None',
        ]
    );
}


function clear_session_cookie(array $config): void {
    $auth = $config['auth'];

    setcookie(
        $auth['cookie_name'],
        '',
        [
            'expires' => time() - 3600,
            'path' => $auth['cookie_path'] ?? '/',
            'domain' => $auth['cookie_domain'] ?? '',
            'secure' => (bool)($auth['cookie_secure'] ?? true),
            'httponly' => true,
            'samesite' => $auth['cookie_samesite'] ?? 'None',
        ]
    );
}


function auth_user(PDO $pdo, array $config): ?array {
    $token = get_session_token($config);

    if (!$token) {
        return null;
    }

    $stmt = $pdo->prepare("
        SELECT
            u.id,
            u.username,
            u.email,
            u.display_name
        FROM dh_sessions s
        JOIN dh_users u
            ON u.id = s.user_id
        WHERE s.token = ?
          AND s.expires_at > NOW()
        LIMIT 1
    ");

    $stmt->execute([$token]);

    $user = $stmt->fetch();

    return $user ?: null;
}