<?php
declare(strict_types=1);

final class FaceScan
{
    private const PROMPT = 'Deprecated. Echelon no longer uses appearance analysis for onboarding scores.';

    public static function analyze(string $jpegBytes, string $apiKey, string $model = 'gemini-2.5-flash'): array
    {
        $b64 = base64_encode($jpegBytes);
        $payload = [
            'contents' => [[
                'parts' => [
                    ['text' => self::PROMPT],
                    ['inlineData' => ['mimeType' => 'image/jpeg', 'data' => $b64]],
                ],
            ]],
            'generationConfig' => [
                'responseMimeType' => 'application/json',
                'temperature' => 0.35,
                'maxOutputTokens' => 512,
            ],
        ];

        $url = 'https://generativelanguage.googleapis.com/v1beta/models/'
            . rawurlencode($model)
            . ':generateContent';

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'x-goog-api-key: ' . $apiKey,
            ],
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => 60,
        ]);
        $raw = curl_exec($ch);
        $code = (int)curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        curl_close($ch);

        if (!$raw || $code >= 400) {
            error_log('Gemini face scan HTTP ' . $code . ' curl=' . $curlErr . ' body=' . substr((string)$raw, 0, 800));
            throw new RuntimeException('Face analysis service unavailable (HTTP ' . $code . ')');
        }

        $data = json_decode($raw, true);
        $text = $data['candidates'][0]['content']['parts'][0]['text'] ?? '';
        $finish = $data['candidates'][0]['finishReason'] ?? '';
        if (!$text || $finish === 'MAX_TOKENS') {
            error_log('Gemini face scan empty/truncated: finish=' . $finish . ' raw=' . substr((string)$raw, 0, 800));
            throw new RuntimeException('Face analysis response incomplete');
        }

        $parsed = self::parseJsonScore($text);
        if (!$parsed) {
            error_log('Gemini face scan parse fail: ' . substr($text, 0, 500));
            throw new RuntimeException('Face analysis returned invalid data');
        }

        $score = Scoring::round2(Scoring::clamp((float)$parsed['score']));
        $note = trim((string)($parsed['note'] ?? ''));

        return ['score' => $score, 'note' => $note ?: 'Baseline radiance captured. Welcome to Echelon.'];
    }

    /** @return array{score: float, note?: string}|null */
    private static function parseJsonScore(string $text): ?array
    {
        $parsed = json_decode(trim($text), true);
        if (is_array($parsed) && isset($parsed['score'])) {
            return $parsed;
        }
        if (preg_match('/\{[\s\S]*"score"[\s\S]*\}/', $text, $m)) {
            $parsed = json_decode($m[0], true);
            if (is_array($parsed) && isset($parsed['score'])) {
                return $parsed;
            }
        }
        return null;
    }
}
