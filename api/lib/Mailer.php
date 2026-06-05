<?php
declare(strict_types=1);

final class Mailer
{
    public static function send(string $to, string $subject, string $text, array $cfg): bool
    {
        $from = $cfg['mail_from'] ?? 'Echelon <hi@echelon.rsvp>';
        $headers = [
            'From: ' . $from,
            'Reply-To: ' . $from,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=UTF-8',
        ];
        $html = '<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">'
            . nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'))
            . '</div>';
        return mail($to, $subject, $html, implode("\r\n", $headers));
    }

    public static function magicLink(string $email, string $token, array $cfg): bool
    {
        $base = rtrim($cfg['app_url'] ?? 'https://echelon.rsvp/app/', '/');
        $url = $base . '/?magic=' . urlencode($token);
        $text = "Sign in to Echelon\n\nTap or copy this link (expires in 15 minutes):\n\n{$url}\n\nIf you didn't request this, ignore this email.";
        return self::send($email, 'Your Echelon sign-in link', $text, $cfg);
    }
}
