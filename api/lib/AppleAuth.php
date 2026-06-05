<?php
declare(strict_types=1);

final class AppleAuth
{
    private static ?array $keys = null;

    public static function verify(string $jwt, string $clientId): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw new InvalidArgumentException('Invalid Apple identity token');
        }

        [$h64, $p64, $s64] = $parts;
        $header = json_decode(self::b64urlDecode($h64), true);
        $payload = json_decode(self::b64urlDecode($p64), true);
        if (!is_array($header) || !is_array($payload)) {
            throw new InvalidArgumentException('Invalid Apple token payload');
        }

        $kid = $header['kid'] ?? '';
        $pubKey = self::publicKey($kid);
        $ok = openssl_verify(
            $h64 . '.' . $p64,
            self::b64urlDecode($s64),
            $pubKey,
            OPENSSL_ALGO_SHA256
        );
        if ($ok !== 1) {
            throw new InvalidArgumentException('Apple token signature invalid');
        }

        $now = time();
        if (($payload['iss'] ?? '') !== 'https://appleid.apple.com') {
            throw new InvalidArgumentException('Apple token issuer invalid');
        }
        if (($payload['aud'] ?? '') !== $clientId) {
            throw new InvalidArgumentException('Apple token audience invalid');
        }
        if (($payload['exp'] ?? 0) < $now) {
            throw new InvalidArgumentException('Apple token expired');
        }
        if (empty($payload['sub'])) {
            throw new InvalidArgumentException('Apple token missing subject');
        }

        return $payload;
    }

    private static function publicKey(string $kid): string
    {
        if (!self::$keys) {
            $raw = file_get_contents('https://appleid.apple.com/auth/keys');
            if (!$raw) throw new RuntimeException('Could not fetch Apple public keys');
            $data = json_decode($raw, true);
            self::$keys = $data['keys'] ?? [];
        }
        foreach (self::$keys as $jwk) {
            if (($jwk['kid'] ?? '') === $kid) {
                return self::jwkToPem($jwk);
            }
        }
        throw new InvalidArgumentException('Apple public key not found');
    }

    private static function jwkToPem(array $jwk): string
    {
        $n = self::b64urlDecode($jwk['n']);
        $e = self::b64urlDecode($jwk['e']);
        $modulus = self::encodeAsn1Integer($n);
        $exponent = self::encodeAsn1Integer($e);
        $seq = self::encodeAsn1Sequence($modulus . $exponent);
        $bitString = "\x03" . self::encodeLength(strlen("\0" . $seq)) . "\0" . $seq;
        $algo = hex2bin('300d06092a864886f70d0101010500');
        $pub = self::encodeAsn1Sequence($algo . $bitString);
        return "-----BEGIN PUBLIC KEY-----\n" . chunk_split(base64_encode($pub), 64, "\n") . "-----END PUBLIC KEY-----\n";
    }

    private static function encodeAsn1Integer(string $bytes): string
    {
        if (ord($bytes[0]) > 127) $bytes = "\0" . $bytes;
        return "\x02" . self::encodeLength(strlen($bytes)) . $bytes;
    }

    private static function encodeAsn1Sequence(string $bytes): string
    {
        return "\x30" . self::encodeLength(strlen($bytes)) . $bytes;
    }

    private static function encodeLength(int $len): string
    {
        if ($len < 128) return chr($len);
        $bin = ltrim(pack('N', $len), "\0");
        return chr(0x80 | strlen($bin)) . $bin;
    }

    private static function b64urlDecode(string $data): string
    {
        $pad = (4 - strlen($data) % 4) % 4;
        return base64_decode(strtr($data . str_repeat('=', $pad), '-_', '+/'), true) ?: '';
    }
}
