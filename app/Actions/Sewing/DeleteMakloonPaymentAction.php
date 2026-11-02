<?php

namespace App\Actions\Sewing;

use App\Models\MakloonPayment;
use Illuminate\Support\Facades\DB;

class DeleteMakloonPaymentAction
{
    public function execute(MakloonPayment $payment): void
    {
        DB::transaction(function () use ($payment) {
            $payment = MakloonPayment::query()->lockForUpdate()->findOrFail($payment->id);
            $payment->delete();
        });
    }
}
