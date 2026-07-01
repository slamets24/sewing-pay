<?php

namespace App\Actions;

use App\Models\PayrollPeriod;
use App\Models\PayrollSlip;
use App\Models\PayrollSlipLine;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportPayrollPeriodCsvAction
{
    public function execute(PayrollPeriod $period): StreamedResponse
    {
        $period->load([
            'slips' => fn ($query) => $query->orderBy('invoice_number'),
            'slips.tailor',
            'slips.lines' => fn ($query) => $query->orderBy('completed_at')->orderBy('id'),
        ]);

        $filename = 'laporan-gaji-'.$period->code.'.csv';

        return response()->streamDownload(function () use ($period): void {
            $handle = fopen('php://output', 'w');

            if ($handle === false) {
                return;
            }

            fwrite($handle, "\xEF\xBB\xBF");
            fputcsv($handle, [
                'invoice_number',
                'period_code',
                'period_start',
                'period_end',
                'tailor_code',
                'tailor_name',
                'completed_at',
                'article_name',
                'color',
                'size',
                'work_type_name',
                'completed_qty',
                'unit_rate_amount',
                'line_subtotal_amount',
                'slip_gross_amount',
                'slip_bonus_amount',
                'slip_deduction_amount',
                'slip_net_amount',
                'slip_status',
                'slip_notes',
                'line_notes',
            ]);

            $period->slips->each(function (PayrollSlip $slip) use ($handle, $period): void {
                $slip->lines->each(function (PayrollSlipLine $line) use ($handle, $period, $slip): void {
                    fputcsv($handle, [
                        $slip->invoice_number,
                        $period->code,
                        $period->starts_at->format('Y-m-d'),
                        $period->ends_at->format('Y-m-d'),
                        $slip->tailor->code,
                        $slip->tailor->name,
                        $line->completed_at?->format('Y-m-d H:i:s'),
                        $line->article_name,
                        $line->color,
                        $line->size,
                        $line->work_type_name,
                        $line->completed_qty,
                        $line->unit_rate_amount,
                        $line->subtotal_amount,
                        $slip->gross_amount,
                        $slip->bonus_amount,
                        $slip->deduction_amount,
                        $slip->net_amount,
                        $slip->status->value,
                        $slip->notes,
                        $line->notes,
                    ]);
                });
            });

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }
}
