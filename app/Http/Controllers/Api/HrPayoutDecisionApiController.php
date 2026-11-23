<?php

namespace App\Http\Controllers\Api;

use App\Actions\Sewing\ApplyHrPayoutDecisionAction;
use App\Http\Controllers\Controller;
use App\Models\Payout;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class HrPayoutDecisionApiController extends Controller
{
    /**
     * POST /api/v1/external/payouts/{payout}/hr-decision
     * Dipanggil hr-azzahra saat HR acc atau mengembalikan pencairan gaji penjahit.
     */
    public function store(Request $request, Payout $payout, ApplyHrPayoutDecisionAction $apply): JsonResponse
    {
        $data = $request->validate([
            'decision' => ['required', Rule::in(['approved', 'returned'])],
            'decided_by' => ['nullable', 'string', 'max:255'],
            'note' => ['nullable', 'string', 'max:2000'],
            'slips' => ['nullable', 'array'],
            'slips.*.opsew_slip_id' => ['required', 'integer'],
            'slips.*.bonus_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'slips.*.kasbon_warung_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'slips.*.kasbon_mingguan_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'slips.*.deduction_amount' => ['required', 'integer', 'min:0', 'max:100000000'],
            'slips.*.notes' => ['nullable', 'string', 'max:500'],
        ]);

        $payout = $apply->execute($payout, $data);

        return response()->json([
            'success' => true,
            'message' => $payout->hr_status === Payout::HR_APPROVED
                ? "Pencairan {$payout->code} disetujui HR."
                : "Pencairan {$payout->code} dikembalikan ke OPSEW.",
            'data' => [
                'hr_status' => $payout->hr_status,
                'total_amount' => $payout->total_amount,
            ],
        ]);
    }
}
