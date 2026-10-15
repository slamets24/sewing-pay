<?php

namespace App\Policies;

use App\Models\TailorAssignmentCompletion;
use App\Models\User;

class TailorAssignmentCompletionPolicy extends OperationalRecordPolicy
{
    public function delete(User $user, TailorAssignmentCompletion $completion): bool
    {
        return $this->ownsOrSupervises($user, $completion->created_by);
    }
}
