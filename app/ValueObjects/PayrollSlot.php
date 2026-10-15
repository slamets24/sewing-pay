<?php

namespace App\ValueObjects;

use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;

/**
 * One of the two official payroll windows of a month: day 1-14 or day 15 to the end of the month.
 */
final class PayrollSlot
{
    private function __construct(
        public readonly CarbonImmutable $startsAt,
        public readonly CarbonImmutable $endsAt,
    ) {}

    public static function containing(CarbonInterface $date): self
    {
        $day = CarbonImmutable::instance($date)->startOfDay();

        return $day->day <= 14
            ? new self($day->startOfMonth(), $day->setDay(14))
            : new self($day->setDay(15), $day->endOfMonth()->startOfDay());
    }

    public static function isOfficial(CarbonInterface $startsAt, CarbonInterface $endsAt): bool
    {
        $slot = self::containing($startsAt);

        return $slot->startsAt->isSameDay($startsAt) && $slot->endsAt->isSameDay($endsAt);
    }

    public function daysLeftFrom(CarbonInterface $date): int
    {
        return max(0, (int) CarbonImmutable::instance($date)->startOfDay()->diffInDays($this->endsAt));
    }
}
