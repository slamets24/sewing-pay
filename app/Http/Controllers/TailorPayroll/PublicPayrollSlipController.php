<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Http\Controllers\Controller;
use App\Models\PayrollSlip;
use App\Services\PayrollSlipWhatsappService;
use Inertia\Inertia;
use Inertia\Response;

class PublicPayrollSlipController extends Controller
{
    public function __invoke(string $invoiceNumber, string $token, PayrollSlipWhatsappService $whatsapp): Response
    {
        $slip = PayrollSlip::query()
            ->with(['period', 'tailor', 'lines' => fn ($query) => $query->orderBy('completed_at')])
            ->where('invoice_number', $invoiceNumber)
            ->where('public_token', $token)
            ->firstOrFail();

        return Inertia::render('PayrollSlips/Show', [
            'slip' => [
                'id' => $slip->id,
                'invoice_number' => $slip->invoice_number,
                'status' => $slip->status->value,
                'status_label' => $slip->status->label(),
                'completed_qty' => $slip->completed_qty,
                'gross_amount' => $slip->gross_amount,
                'bonus_amount' => $slip->bonus_amount,
                'deduction_amount' => $slip->deduction_amount,
                'net_amount' => $slip->net_amount,
                'whatsapp_url' => $whatsapp->url($slip),
                'tailor' => [
                    'name' => $slip->tailor->name,
                    'code' => $slip->tailor->code,
                    'whatsapp_number' => $slip->tailor->whatsapp_number,
                ],
                'period' => [
                    'code' => $slip->period->code,
                    'starts_at' => $slip->period->starts_at->format('Y-m-d'),
                    'ends_at' => $slip->period->ends_at->format('Y-m-d'),
                    'status_label' => $slip->period->status->label(),
                ],
                'lines' => $slip->lines->map(fn ($line) => [
                    'id' => $line->id,
                    'article_name' => $line->article_name,
                    'color' => $line->color,
                    'size' => $line->size,
                    'work_type_name' => $line->work_type_name,
                    'completed_qty' => $line->completed_qty,
                    'unit_rate_amount' => $line->unit_rate_amount,
                    'subtotal_amount' => $line->subtotal_amount,
                    'completed_at' => $line->completed_at->format('Y-m-d H:i'),
                ]),
            ],
        ]);
    }
}
