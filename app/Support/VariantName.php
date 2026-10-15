<?php

namespace App\Support;

/** Normalizes the free-typed color and size names that come from WhatsApp work orders. */
final class VariantName
{
    private const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', '3XL', '4XL', '5XL', 'ALLSIZE'];

    public static function color(?string $color): ?string
    {
        $color = self::squish($color);

        return $color === null ? null : mb_convert_case(mb_strtolower($color), MB_CASE_TITLE);
    }

    public static function size(?string $size): ?string
    {
        $size = self::squish($size);

        return $size === null ? null : mb_strtoupper(str_replace(' ', '', $size));
    }

    /** Sort key so S < M < L < XL; unknown sizes go last. */
    public static function sizeRank(?string $size): int
    {
        $index = array_search(self::size($size), self::SIZE_ORDER, true);

        return $index === false ? count(self::SIZE_ORDER) : $index;
    }

    private static function squish(?string $value): ?string
    {
        $value = trim((string) preg_replace('/\s+/', ' ', (string) $value));

        return $value === '' ? null : $value;
    }
}
