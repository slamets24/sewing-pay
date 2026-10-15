<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Models\PayoutSlip;
use App\Presenters\PayoutPresenter;
use Inertia\Inertia;
use Inertia\Response;

class PublicPayoutSlipController extends Controller
{
    public function __invoke(string $invoiceNumber, string $token, PayoutPresenter $presenter): Response
    {
        $slip = PayoutSlip::query()
            ->with(['payout', 'tailor', 'lines'])
            ->where('invoice_number', $invoiceNumber)
            ->where('public_token', $token)
            ->firstOrFail();

        return Inertia::render('PayoutSlips/Show', [
            'slip' => [
                ...$presenter->slip($slip),
                'payout_code' => $slip->payout->code,
                'cutoff_date' => $slip->payout->cutoff_date->toDateString(),
            ],
        ]);
    }
}
