<?php
declare(strict_types=1);

final class Scoring
{
    public static function clamp(float $s): float
    {
        return max(1.0, min(5.0, $s));
    }

    public static function round2(float $s): float
    {
        return round($s, 2);
    }

    public static function raterInfluence(float $raterScore): float
    {
        return 0.5 + ($raterScore / 5.0);
    }

    public static function nudge(float $current, int $stars, float $raterScore): float
    {
        $inf = self::raterInfluence($raterScore);
        $pull = ($stars - $current) * 0.08 * $inf;
        return self::round2(self::clamp($current + $pull));
    }

    public static function applyDelta(float $current, float $delta): float
    {
        return self::round2(self::clamp($current + $delta));
    }
}
