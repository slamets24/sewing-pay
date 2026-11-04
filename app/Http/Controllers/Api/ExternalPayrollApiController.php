<?php

namespace App\Http\Controllers\Api;

use App\Enums\PayoutStatus;
use App\Http\Controllers\Controller;
use App\Models\PayoutSlip;
use App\Models\Tailor;
use App\Presenters\PayoutPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExternalPayrollApiController extends Controller
{
    public function __construct(private readonly PayoutPresenter $payouts) {}

    /**
     * GET /api/v1/external/payroll-slips
     * Used by hr-azzahra to display official sewing pay slips in the HR employee portal.
     */
    public function index(Request $request): JsonResponse
    {
        $employeeNumber = trim((string) $request->query('employee_number', ''));
        $tailorId = $request->query('tailor_id');

        $tailor = null;
        if ($tailorId) {
            $tailor = Tailor::find((int) $tailorId);
        } elseif ($employeeNumber !== '') {
            $tailor = Tailor::where('hr_employee_number', $employeeNumber)->first();
        }

        if (! $tailor) {
            return response()->json([
                'success' => false,
                'message' => 'Penjahit tidak ditemukan di sweing-pay.',
                'data' => [],
            ], 404);
        }

        $slips = PayoutSlip::query()
            ->with(['tailor', 'payout', 'lines'])
            ->where('tailor_id', $tailor->id)
            ->where('status', PayoutStatus::Paid->value)
            ->latest('id')
            ->limit(24)
            ->get()
            ->map(function (PayoutSlip $slip) {
                return [
                    'id' => $slip->id,
                    'invoice_number' => $slip->invoice_number,
                    'cutoff_date' => $slip->payout->cutoff_date->toDateString(),
                    'paid_at' => $slip->paid_at?->toDateString(),
                    'status' => $slip->status->value,
                    'status_label' => $slip->status->label(),
                    'qty' => $slip->qty,
                    'gross_amount' => $slip->gross_amount,
                    'bonus_amount' => $slip->bonus_amount,
                    'deduction_amount' => $slip->deduction_amount,
                    'net_amount' => $slip->net_amount,
                    'public_url' => route('payout-slips.public', [
                        'invoiceNumber' => $slip->invoice_number,
                        'token' => $slip->public_token,
                    ]),
                    'lines' => $slip->lines->map(fn ($line) => [
                        'type' => $line->type->value,
                        'type_label' => $line->type->label(),
                        'description' => $line->description,
                        'qty' => $line->qty,
                        'rate' => $line->rate,
                        'subtotal' => $line->subtotal,
                    ]),
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'tailor' => [
                    'id' => $tailor->id,
                    'code' => $tailor->code,
                    'name' => $tailor->name,
                    'hr_employee_number' => $tailor->hr_employee_number,
                    'joined_at' => $tailor->joined_at?->toDateString(),
                    'tenure_label' => $tailor->tenureLabel(),
                ],
                'slips' => $slips,
            ],
        ]);
    }
}
