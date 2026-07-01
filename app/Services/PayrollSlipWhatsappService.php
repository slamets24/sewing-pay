<?php

namespace App\Services;

use App\Models\PayrollSlip;

class PayrollSlipWhatsappService
{
    public function url(PayrollSlip $slip): ?string
    {
        $slip->loadMissing(['tailor', 'period']);

        if (! $slip->tailor->whatsapp_number) {
            return null;
        }

        $phone = $this->normalizePhone($slip->tailor->whatsapp_number);

        if (! $phone) {
            return null;
        }

        $publicUrl = route('payroll-slips.public', [$slip->invoice_number, $slip->public_token]);
        $message = implode("\n", [
            'Halo '.$slip->tailor->name.', berikut slip gaji jahit:',
            'Periode: '.$slip->period->starts_at->format('d/m/Y').' - '.$slip->period->ends_at->format('d/m/Y'),
            'Total qty: '.$slip->completed_qty.' pcs',
            'Total gaji: Rp '.number_format($slip->net_amount, 0, ',', '.'),
            'Link slip: '.$publicUrl,
        ]);

        return 'https://wa.me/'.$phone.'?text='.rawurlencode($message);
    }

    private function normalizePhone(string $phone): ?string
    {
        $digits = preg_replace('/\D+/', '', $phone);

        if (! $digits) {
            return null;
        }

        if (str_starts_with($digits, '0')) {
            return '62'.substr($digits, 1);
        }

        if (str_starts_with($digits, '62')) {
            return $digits;
        }

        return $digits;
    }
}
