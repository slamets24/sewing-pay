<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Actions\ExportPayrollPeriodCsvAction;
use App\Actions\GeneratePayrollPeriodAction;
use App\Actions\LockPayrollPeriodAction;
use App\Enums\PayrollPeriodStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StorePayrollPeriodRequest;
use App\Models\PayrollPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PayrollPeriodController extends Controller
{
    public function store(StorePayrollPeriodRequest $request): RedirectResponse
    {
        $data = $request->validated();
        $startsAt = CarbonImmutable::parse($data['starts_at']);
        $endsAt = CarbonImmutable::parse($data['ends_at']);

        PayrollPeriod::create([
            'code' => 'GJ-'.$startsAt->format('Ymd').'-'.$endsAt->format('Ymd'),
            'starts_at' => $startsAt,
            'ends_at' => $endsAt,
            'status' => PayrollPeriodStatus::Draft,
            'notes' => $data['notes'] ?? null,
        ]);

        return Redirect::route('dashboard')->with('status', 'Periode gaji dibuat.');
    }

    public function generate(PayrollPeriod $period, GeneratePayrollPeriodAction $generatePayroll): RedirectResponse
    {
        $generatePayroll->execute($period);

        return Redirect::route('dashboard')->with('status', 'Slip gaji periode ini digenerate.');
    }

    public function lock(PayrollPeriod $period, LockPayrollPeriodAction $lockPayroll): RedirectResponse
    {
        $lockPayroll->execute($period);

        return Redirect::route('dashboard')->with('status', 'Periode gaji dikunci.');
    }

    public function export(PayrollPeriod $period, ExportPayrollPeriodCsvAction $exportPayroll): StreamedResponse
    {
        return $exportPayroll->execute($period);
    }
}
