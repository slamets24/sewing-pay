<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\MarkPayrollSlipPaidAction;
use App\Actions\UpdatePayrollSlipAdjustmentAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\UpdatePayrollSlipAdjustmentRequest;
use App\Models\PayrollSlip;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

class PayrollSlipController extends Controller
{
    public function markPaid(PayrollSlip $slip, MarkPayrollSlipPaidAction $markPaid): RedirectResponse
    {
        $markPaid->execute($slip);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Slip gaji ditandai dibayar.');
    }

    public function updateAdjustment(
        UpdatePayrollSlipAdjustmentRequest $request,
        PayrollSlip $slip,
        UpdatePayrollSlipAdjustmentAction $updateAdjustment
    ): RedirectResponse {
        $updateAdjustment->execute($slip, $request->validated());

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Adjustment slip gaji disimpan.');
    }
}
