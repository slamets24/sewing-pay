<?php

namespace App\Http\Controllers\Sewing;

use App\Actions\Sewing\CreateMakloonPaymentAction;
use App\Actions\Sewing\DeleteMakloonPaymentAction;
use App\Enums\TailorType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Sewing\StoreMakloonPaymentRequest;
use App\Models\MakloonPayment;
use App\Models\SewingDelivery;
use App\Models\Tailor;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

class MakloonPaymentController extends Controller
{
    public function index(Request $request): Response
    {
        $selectedTailorId = $request->integer('tailor_id') ?: null;

        $paymentsQuery = MakloonPayment::query()
            ->with(['tailor', 'creator'])
            ->orderByDesc('payment_date')
            ->orderByDesc('id');

        if ($selectedTailorId) {
            $paymentsQuery->where('tailor_id', $selectedTailorId);
        }

        $payments = $paymentsQuery->paginate(25)->withQueryString();

        $makloonTailors = Tailor::query()
            ->where('type', TailorType::Makloon)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $unpaidStats = SewingDelivery::query()
            ->selectRaw('tailor_id, count(*) as count, sum(qty) as total_qty, sum(subtotal) as total_amount')
            ->where('is_payable', true)
            ->whereDoesntHave('makloonPaymentLine')
            ->whereHas('tailor', fn ($q) => $q->where('type', TailorType::Makloon->value))
            ->groupBy('tailor_id')
            ->get()
            ->keyBy('tailor_id');

        $tailorsWithStats = $makloonTailors->map(fn (Tailor $t) => [
            'id' => $t->id,
            'name' => $t->name,
            'code' => $t->code,
            'whatsapp_number' => $t->whatsapp_number,
            'unpaid_count' => (int) ($unpaidStats->get($t->id)?->count ?? 0),
            'unpaid_qty' => (int) ($unpaidStats->get($t->id)?->total_qty ?? 0),
            'unpaid_amount' => (int) ($unpaidStats->get($t->id)?->total_amount ?? 0),
        ]);

        $totalUnpaidAmount = $unpaidStats->sum('total_amount');
        $totalUnpaidQty = $unpaidStats->sum('total_qty');
        $totalPaidThisMonth = MakloonPayment::query()
            ->whereBetween('payment_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()])
            ->sum('net_amount');

        return Inertia::render('MakloonPayments/Index', [
            'payments' => $payments,
            'tailors' => $tailorsWithStats,
            'selectedTailorId' => $selectedTailorId,
            'summary' => [
                'total_unpaid_amount' => (int) $totalUnpaidAmount,
                'total_unpaid_qty' => (int) $totalUnpaidQty,
                'total_paid_this_month' => (int) $totalPaidThisMonth,
            ],
        ]);
    }

    public function create(Request $request): Response
    {
        $makloonTailors = Tailor::query()
            ->where('type', TailorType::Makloon)
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $selectedTailorId = $request->integer('tailor_id') ?: null;
        if (! $selectedTailorId && $makloonTailors->isNotEmpty()) {
            $selectedTailorId = $makloonTailors->first()->id;
        }

        $deliveries = collect();
        if ($selectedTailorId) {
            $deliveries = SewingDelivery::query()
                ->with(['workOrderItem.article', 'workOrderItem.workOrder'])
                ->where('tailor_id', $selectedTailorId)
                ->where('is_payable', true)
                ->whereDoesntHave('makloonPaymentLine')
                ->orderBy('delivered_at', 'asc')
                ->get()
                ->map(fn (SewingDelivery $d) => [
                    'id' => $d->id,
                    'delivered_at' => $d->delivered_at?->format('Y-m-d H:i'),
                    'date_formatted' => $d->delivered_at?->format('d/m/Y H:i'),
                    'wo_number' => $d->workOrderItem?->workOrder?->number ?? '-',
                    'article_name' => $d->workOrderItem?->article?->displayName() ?? 'Artikel',
                    'variant' => trim(($d->workOrderItem?->color ?? '').' '.($d->workOrderItem?->size ?? '')),
                    'qty' => $d->qty,
                    'rate' => $d->sewing_rate,
                    'subtotal' => $d->subtotal,
                    'notes' => $d->notes,
                ]);
        }

        return Inertia::render('MakloonPayments/Create', [
            'tailors' => $makloonTailors->map(fn (Tailor $t) => [
                'id' => $t->id,
                'name' => $t->name,
                'code' => $t->code,
                'whatsapp_number' => $t->whatsapp_number,
            ]),
            'selectedTailorId' => $selectedTailorId,
            'unpaidDeliveries' => $deliveries,
        ]);
    }

    public function store(StoreMakloonPaymentRequest $request, CreateMakloonPaymentAction $create): RedirectResponse
    {
        $payment = $create->execute($request->validated(), $request->user()->id);

        return Redirect::route('makloon-payments.show', $payment)
            ->with('status', "Pembayaran maklun {$payment->code} berhasil dicatat.");
    }

    public function show(MakloonPayment $makloonPayment): Response
    {
        $makloonPayment->load([
            'tailor',
            'creator',
            'lines.workOrderItem.article',
            'lines.workOrderItem.workOrder',
        ]);

        return Inertia::render('MakloonPayments/Show', [
            'payment' => [
                'id' => $makloonPayment->id,
                'code' => $makloonPayment->code,
                'payment_date' => $makloonPayment->payment_date?->format('Y-m-d'),
                'payment_date_formatted' => $makloonPayment->payment_date?->format('d M Y'),
                'paid_at' => $makloonPayment->paid_at?->format('Y-m-d H:i'),
                'status' => $makloonPayment->status,
                'total_qty' => $makloonPayment->total_qty,
                'gross_amount' => $makloonPayment->gross_amount,
                'adjustment_amount' => $makloonPayment->adjustment_amount,
                'net_amount' => $makloonPayment->net_amount,
                'payment_method' => $makloonPayment->payment_method,
                'notes' => $makloonPayment->notes,
                'tailor' => [
                    'id' => $makloonPayment->tailor->id,
                    'name' => $makloonPayment->tailor->name,
                    'code' => $makloonPayment->tailor->code,
                    'whatsapp_number' => $makloonPayment->tailor->whatsapp_number,
                    'address' => $makloonPayment->tailor->address,
                ],
                'creator' => $makloonPayment->creator ? [
                    'name' => $makloonPayment->creator->name,
                ] : null,
                'lines' => $makloonPayment->lines->map(fn ($line) => [
                    'id' => $line->id,
                    'description' => $line->description,
                    'wo_number' => $line->wo_number,
                    'color' => $line->color,
                    'size' => $line->size,
                    'qty' => $line->qty,
                    'rate' => $line->rate,
                    'subtotal' => $line->subtotal,
                    'delivered_at' => $line->delivered_at?->format('d/m/Y H:i'),
                ]),
            ],
        ]);
    }

    public function destroy(MakloonPayment $makloonPayment, DeleteMakloonPaymentAction $delete): RedirectResponse
    {
        $code = $makloonPayment->code;
        $delete->execute($makloonPayment);

        return Redirect::route('makloon-payments.index')
            ->with('status', "Pembayaran maklun {$code} dibatalkan. Setoran dikembalikan ke daftar belum dibayar.");
    }
}
