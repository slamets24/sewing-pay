<?php

namespace App\Services\Sewing;

use App\Models\PayoutSlip;

/** Builds a wa.me link that sends the tailor their slip summary and public slip link. */
class PayoutSlipWhatsappService
{
    public function url(PayoutSlip $slip): ?string
    {
        $slip->loadMissing(['tailor', 'payout']);
        $phone = $this->normalizePhone((string) $slip->tailor->whatsapp_number);

        if (! $phone) {
            return null;
        }

        $message = implode("\n", [
            'Halo '.$slip->tailor->name.', berikut slip gaji jahit:',
            'Pencairan: '.$slip->payout->code.' (s.d. '.$slip->payout->cutoff_date->format('d/m/Y').')',
            'Total jahit: '.$slip->qty.' pcs',
            'Total diterima: Rp '.number_format($slip->net_amount, 0, ',', '.'),
            'Link slip: '.$this->publicUrl($slip),
        ]);

        return 'https://wa.me/'.$phone.'?text='.rawurlencode($message);
    }

    public function publicUrl(PayoutSlip $slip): string
    {
        return route('payout-slips.public', [$slip->invoice_number, $slip->public_token]);
    }

    private function normalizePhone(string $phone): ?string
    {
        $digits = (string) preg_replace('/\D+/', '', $phone);

        return match (true) {
            $digits === '' => null,
            str_starts_with($digits, '0') => '62'.substr($digits, 1),
            default => $digits,
        };
    }
}
