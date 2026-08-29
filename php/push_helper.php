<?php
declare(strict_types=1);

define('VAPID_PUBLIC_KEY',  'BPj3AceJqjOJIS9cwtbWUQnQShL7T9yXg4XIIT9z3l_ZBT-LfXg1LetkJn-ecY95OkipK6bXQgVVHQhedz7xivM');
define('VAPID_PRIVATE_KEY', '8B6ZfdwOUzdGVJ9I21vmt-ywOjkuYGVwvFGUleDMkzM');
define('VAPID_SUBJECT',     'mailto:lucas@hello-fermetures.com');

class WebPushHelper {
    private string $subject;
    private string $pubKeyB64;
    private string $privKeyB64;

    public function __construct(string $subject, string $publicKey, string $privateKey) {
        $this->subject    = $subject;
        $this->pubKeyB64  = $publicKey;
        $this->privKeyB64 = $privateKey;
    }

    // Send to all subscribers (or filter by user_ids array)
    public function sendAll(PDO $pdo, string $title, string $body, array $options = [], array $userIds = []): int {
        $sql = 'SELECT user_id, endpoint, p256dh, auth FROM push_subscriptions';
        $params = [];
        if (!empty($userIds)) {
            $ph  = implode(',', array_fill(0, count($userIds), '?'));
            $sql .= " WHERE user_id IN ($ph)";
            $params = $userIds;
        }
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $subs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $sent = 0;
        $failed = [];
        foreach ($subs as $sub) {
            $ok = $this->send(
                $sub['endpoint'],
                $sub['p256dh'],
                $sub['auth'],
                json_encode(['title' => $title, 'body' => $body, 'icon' => '/hello-gestion/assets/icon-192.png', 'badge' => '/hello-gestion/assets/icon-192.png'] + $options)
            );
            if ($ok) {
                $sent++;
            } else {
                $failed[] = $sub['endpoint'];
            }
        }
        // Remove dead subscriptions
        if (!empty($failed)) {
            $ph = implode(',', array_fill(0, count($failed), '?'));
            $pdo->prepare("DELETE FROM push_subscriptions WHERE endpoint IN ($ph)")->execute($failed);
        }
        return $sent;
    }

    private function send(string $endpoint, string $p256dhB64, string $authB64, string $payload): bool {
        $encrypted = $this->encrypt($payload, $p256dhB64, $authB64);
        if ($encrypted === null) return false;

        $jwt = $this->buildVapidJwt($endpoint);

        $headers = [
            'Authorization: vapid t=' . $jwt . ',k=' . $this->pubKeyB64,
            'Content-Type: application/octet-stream',
            'Content-Encoding: aes128gcm',
            'TTL: 86400',
            'Content-Length: ' . strlen($encrypted),
        ];

        if (!function_exists('curl_init')) return false;

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $encrypted,
            CURLOPT_HTTPHEADER     => $headers,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 15,
            CURLOPT_SSL_VERIFYPEER => true,
        ]);
        $response = curl_exec($ch);
        $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        return in_array($code, [200, 201, 202]);
    }

    private function encrypt(string $payload, string $p256dhB64, string $authB64): ?string {
        $userPubRaw = self::b64uDecode($p256dhB64);
        $authSecret  = self::b64uDecode($authB64);

        // Build user public key object
        $userPubPem = $this->buildPublicKeyPem($userPubRaw);
        $userPubKey = openssl_pkey_get_public($userPubPem);
        if (!$userPubKey) return null;

        // Generate ephemeral ECDH key pair
        $ephKey = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        if (!$ephKey) return null;
        $ephDetails     = openssl_pkey_get_details($ephKey);
        $ephPublicRaw   = "\x04" . $ephDetails['ec']['x'] . $ephDetails['ec']['y'];

        // ECDH shared secret — requires PHP 8.1+
        if (!function_exists('openssl_pkey_derive')) return null;
        $sharedSecret = openssl_pkey_derive($userPubKey, $ephKey);
        if (!$sharedSecret) return null;

        // Salt
        $salt = random_bytes(16);

        // RFC 8291 key derivation (HKDF with HMAC-SHA-256)
        // PRK_key = HKDF-Extract(auth_secret, shared_secret)
        $prkKey = hash_hmac('sha256', $sharedSecret, $authSecret, true);

        // IKM = HKDF-Expand(PRK_key, "WebPush: info\x00" || ua_public || as_public, 32)
        $keyInfo = "WebPush: info\x00" . $userPubRaw . $ephPublicRaw;
        $ikm = substr(hash_hmac('sha256', $keyInfo . "\x01", $prkKey, true), 0, 32);

        // PRK = HKDF-Extract(salt, IKM)
        $prk = hash_hmac('sha256', $ikm, $salt, true);

        // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\x00", 16)
        $cek = substr(hash_hmac('sha256', "Content-Encoding: aes128gcm\x00\x01", $prk, true), 0, 16);

        // NONCE = HKDF-Expand(PRK, "Content-Encoding: nonce\x00", 12)
        $nonce = substr(hash_hmac('sha256', "Content-Encoding: nonce\x00\x01", $prk, true), 0, 12);

        // Encrypt AES-128-GCM
        $plaintext = $payload . "\x02"; // padding delimiter
        $tag = '';
        $ciphertext = openssl_encrypt($plaintext, 'aes-128-gcm', $cek, OPENSSL_RAW_DATA, $nonce, $tag, '', 16);
        if ($ciphertext === false) return null;

        // Build RFC 8291 output: salt(16) + rs(4) + idlen(1) + keyid(65) + ciphertext+tag
        $rs = pack('N', 4096); // record size
        return $salt . $rs . chr(65) . $ephPublicRaw . $ciphertext . $tag;
    }

    private function buildVapidJwt(string $endpoint): string {
        $parts    = parse_url($endpoint);
        $audience = $parts['scheme'] . '://' . $parts['host'];

        $header  = self::b64u(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $claims  = self::b64u(json_encode(['aud' => $audience, 'exp' => time() + 43200, 'sub' => $this->subject]));
        $sigInput = $header . '.' . $claims;

        $privPem = $this->buildPrivateKeyPem();
        $privKey = openssl_pkey_get_private($privPem);
        openssl_sign($sigInput, $derSig, $privKey, OPENSSL_ALGO_SHA256);

        return $sigInput . '.' . self::b64u($this->derSigToRaw($derSig));
    }

    private function buildPrivateKeyPem(): string {
        $d   = self::b64uDecode($this->privKeyB64);   // 32 bytes
        $pub = self::b64uDecode($this->pubKeyB64);     // 65 bytes

        // SEC 1 DER for EC private key on prime256v1
        // 30 77 02 01 01 04 20 [d:32] a0 0a 06 08 2a 86 48 ce 3d 03 01 07 a1 44 03 42 00 [pub:65]
        $der = "\x30\x77"
             . "\x02\x01\x01"
             . "\x04\x20" . $d
             . "\xa0\x0a\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"
             . "\xa1\x44\x03\x42\x00" . $pub;

        return "-----BEGIN EC PRIVATE KEY-----\n"
             . chunk_split(base64_encode($der), 64, "\n")
             . "-----END EC PRIVATE KEY-----\n";
    }

    private function buildPublicKeyPem(string $rawPub): string {
        // SubjectPublicKeyInfo DER for P-256 (length = 0x59 = 89)
        // 30 59 30 13 06 07 2a 86 48 ce 3d 02 01 06 08 2a 86 48 ce 3d 03 01 07 03 42 00 [pub:65]
        $der = "\x30\x59"
             . "\x30\x13"
             . "\x06\x07\x2a\x86\x48\xce\x3d\x02\x01"
             . "\x06\x08\x2a\x86\x48\xce\x3d\x03\x01\x07"
             . "\x03\x42\x00" . $rawPub;

        return "-----BEGIN PUBLIC KEY-----\n"
             . chunk_split(base64_encode($der), 64, "\n")
             . "-----END PUBLIC KEY-----\n";
    }

    private function derSigToRaw(string $der): string {
        $pos  = 2; // skip SEQUENCE tag + length
        $pos++; $rLen = ord($der[$pos++]);
        $r    = substr($der, $pos, $rLen); $pos += $rLen;
        $pos++; $sLen = ord($der[$pos++]);
        $s    = substr($der, $pos, $sLen);
        $r    = str_pad(ltrim($r, "\x00"), 32, "\x00", STR_PAD_LEFT);
        $s    = str_pad(ltrim($s, "\x00"), 32, "\x00", STR_PAD_LEFT);
        return $r . $s;
    }

    private static function b64u(string $data): string {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64uDecode(string $data): string {
        return base64_decode(strtr($data, '-_', '+/') . str_repeat('=', (4 - strlen($data) % 4) % 4));
    }
}

// ── Helper function ──────────────────────────────────────────

function notifyAll(PDO $pdo, string $title, string $body, array $options = [], array $userIds = []): void {
    try {
        $push = new WebPushHelper(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        $push->sendAll($pdo, $title, $body, $options, $userIds);
    } catch (\Throwable $e) {
        error_log('WebPush error: ' . $e->getMessage());
    }
}
