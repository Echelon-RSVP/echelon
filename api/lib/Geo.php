<?php
declare(strict_types=1);

final class Geo
{
    public static function haversineMiles(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 3958.7613;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;
        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }

    /** Bearing from point 1 to point 2 in degrees (0 = north, clockwise). */
    public static function bearingDeg(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $lat1r = deg2rad($lat1);
        $lat2r = deg2rad($lat2);
        $dLng = deg2rad($lng2 - $lng1);
        $y = sin($dLng) * cos($lat2r);
        $x = cos($lat1r) * sin($lat2r) - sin($lat1r) * cos($lat2r) * cos($dLng);
        return fmod(rad2deg(atan2($y, $x)) + 360, 360);
    }

    /** Map bearing to Lens HUD coordinates (percent). */
    public static function lensHudFromBearing(float $bearingDeg, float $distMiles, float $maxMiles = 1.0): array
    {
        $rad = deg2rad($bearingDeg);
        $fade = max(0.35, 1 - ($distMiles / max(0.1, $maxMiles)) * 0.45);
        $radius = 38 * $fade;
        return [
            'lensX' => (int) round(50 + $radius * sin($rad)),
            'lensY' => (int) round(50 - $radius * cos($rad)),
        ];
    }

    public static function boundingBox(float $lat, float $lng, float $miles): array
    {
        $latDelta = $miles / 69.0;
        $lngDelta = $miles / max(0.01, cos(deg2rad($lat)) * 69.0);
        return [$lat - $latDelta, $lat + $latDelta, $lng - $lngDelta, $lng + $lngDelta];
    }
}
