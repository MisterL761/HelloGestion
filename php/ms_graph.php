<?php
declare(strict_types=1);
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/supplier_email_lib.php';

class MsGraph {
    private PDO $pdo;
    private ?string $accessToken = null;
    public ?string $lastError = null;
    private const SCOPES = 'offline_access Mail.ReadWrite Mail.Send';
    private const GRAPH  = 'https://graph.microsoft.com/v1.0';

    public function __construct(PDO $pdo) { $this->pdo = $pdo; }

    private function tokenEndpoint(): string {
        return 'https://login.microsoftonline.com/' . MSGRAPH_TENANT . '/oauth2/v2.0/token';
    }

    public function authorizeUrl(string $state): string {
        return 'https://login.microsoftonline.com/' . MSGRAPH_TENANT . '/oauth2/v2.0/authorize?' . http_build_query([
            'client_id' => MSGRAPH_CLIENT_ID, 'response_type' => 'code',
            'redirect_uri' => MSGRAPH_REDIRECT_URI, 'response_mode' => 'query',
            'scope' => self::SCOPES, 'state' => $state,
        ]);
    }

    private function curlPostForm(string $url, array $fields): array {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true, CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($fields), CURLOPT_TIMEOUT => 20,
        ]);
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['status' => $status, 'json' => is_string($res) ? json_decode($res, true) : null];
    }

    public function handleCallback(string $code): bool {
        $r = $this->curlPostForm($this->tokenEndpoint(), [
            'client_id' => MSGRAPH_CLIENT_ID, 'client_secret' => MSGRAPH_CLIENT_SECRET,
            'grant_type' => 'authorization_code', 'code' => $code,
            'redirect_uri' => MSGRAPH_REDIRECT_URI, 'scope' => self::SCOPES,
        ]);
        if ($r['status'] !== 200 || empty($r['json']['refresh_token'])) {
            $err  = $r['json']['error'] ?? '';
            $desc = $r['json']['error_description'] ?? '';
            $this->lastError = 'Échange du jeton — HTTP ' . $r['status']
                . ($err  ? ' | ' . $err  : '')
                . ($desc ? ' | ' . $desc : '')
                . ($r['status'] === 200 && empty($r['json']['refresh_token']) ? ' | pas de refresh_token (offline_access non consenti ?)' : '');
            return false;
        }
        $this->accessToken = $r['json']['access_token'] ?? null;
        $me = $this->api('GET', '/me');
        $email = $me['json']['mail'] ?? ($me['json']['userPrincipalName'] ?? null);
        $this->pdo->prepare("INSERT INTO ms_graph_tokens (id, refresh_token, mailbox_email, delta_inbox, delta_sent)
            VALUES (1, ?, ?, NULL, NULL)
            ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), mailbox_email = VALUES(mailbox_email), delta_inbox = NULL, delta_sent = NULL")
            ->execute([sendersEncrypt($r['json']['refresh_token']), $email]);
        return true;
    }

    public function isConnected(): bool {
        $row = $this->pdo->query("SELECT refresh_token FROM ms_graph_tokens WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
        return !empty($row['refresh_token']);
    }

    public function getAccessToken(): ?string {
        if ($this->accessToken !== null) return $this->accessToken;
        $row = $this->pdo->query("SELECT refresh_token FROM ms_graph_tokens WHERE id = 1")->fetch(PDO::FETCH_ASSOC);
        if (empty($row['refresh_token'])) return null;
        $refresh = sendersDecrypt($row['refresh_token']);
        if ($refresh === null) return null;
        $r = $this->curlPostForm($this->tokenEndpoint(), [
            'client_id' => MSGRAPH_CLIENT_ID, 'client_secret' => MSGRAPH_CLIENT_SECRET,
            'grant_type' => 'refresh_token', 'refresh_token' => $refresh, 'scope' => self::SCOPES,
        ]);
        if ($r['status'] !== 200 || empty($r['json']['access_token'])) {
            if (in_array($r['status'], [400, 401], true)) { // token révoqué → forcer la reconnexion
                $this->pdo->exec("UPDATE ms_graph_tokens SET refresh_token = NULL WHERE id = 1");
            }
            return null;
        }
        if (!empty($r['json']['refresh_token'])) { // rolling refresh token
            $this->pdo->prepare("UPDATE ms_graph_tokens SET refresh_token = ? WHERE id = 1")
                ->execute([sendersEncrypt($r['json']['refresh_token'])]);
        }
        return $this->accessToken = $r['json']['access_token'];
    }

    /** Appel Graph JSON. $url relatif (/me/...) ou absolu (liens delta/nextLink). */
    public function api(string $method, string $url, ?array $body = null): array {
        $token = $this->getAccessToken();
        if ($token === null) return ['status' => 401, 'json' => null];
        $full = str_starts_with($url, 'https://') ? $url : self::GRAPH . $url;
        $ch = curl_init($full);
        $headers = ['Authorization: Bearer ' . $token];
        $opts = [CURLOPT_RETURNTRANSFER => true, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_TIMEOUT => 30];
        if ($body !== null) {
            $headers[] = 'Content-Type: application/json';
            $opts[CURLOPT_POSTFIELDS] = json_encode($body);
        }
        $opts[CURLOPT_HTTPHEADER] = $headers;
        curl_setopt_array($ch, $opts);
        $res = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return ['status' => $status, 'json' => is_string($res) && $res !== '' ? json_decode($res, true) : null];
    }
}
