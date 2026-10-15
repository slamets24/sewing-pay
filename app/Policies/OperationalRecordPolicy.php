<?php

namespace App\Policies;

use App\Models\User;

/**
 * Shared rule for operational input (pickups, completions): admins may only correct
 * what they entered themselves, superadmins may correct anyone's entries.
 */
abstract class OperationalRecordPolicy
{
    protected function ownsOrSupervises(User $user, ?int $createdBy): bool
    {
        return $user->isSuperadmin() || ($createdBy !== null && $createdBy === $user->id);
    }
}
