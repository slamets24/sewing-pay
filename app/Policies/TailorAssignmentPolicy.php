<?php

namespace App\Policies;

use App\Models\TailorAssignment;
use App\Models\User;

class TailorAssignmentPolicy extends OperationalRecordPolicy
{
    public function cancel(User $user, TailorAssignment $assignment): bool
    {
        return $assignment->isCancellable() && $this->ownsOrSupervises($user, $assignment->created_by);
    }
}
