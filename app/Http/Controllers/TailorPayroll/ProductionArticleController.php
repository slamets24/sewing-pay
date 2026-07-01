<?php

namespace App\Http\Controllers\TailorPayroll;

use App\Enums\ProductionArticleStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\TailorPayroll\StoreProductionArticleRequest;
use App\Http\Requests\TailorPayroll\UpdateProductionArticleRequest;
use App\Models\ProductionArticle;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Validation\ValidationException;

class ProductionArticleController extends Controller
{
    public function store(StoreProductionArticleRequest $request): RedirectResponse
    {
        $data = $request->validated();

        ProductionArticle::create([
            ...$data,
            'created_by' => $request->user()?->id,
            'available_qty' => $data['planned_qty'],
            'assigned_qty' => 0,
            'completed_qty' => 0,
            'status' => ProductionArticleStatus::Ready,
            'ready_at' => $data['ready_at'] ?? today(),
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Hancaan siap diambil.');
    }

    public function update(UpdateProductionArticleRequest $request, ProductionArticle $article): RedirectResponse
    {
        $data = $request->validated();

        if ($article->status === ProductionArticleStatus::Cancelled) {
            throw ValidationException::withMessages([
                'production_article_id' => 'Hancaan yang sudah dibatalkan tidak bisa diedit.',
            ]);
        }

        if ((int) $data['planned_qty'] < $article->assigned_qty) {
            throw ValidationException::withMessages([
                'planned_qty' => 'Qty rencana tidak boleh lebih kecil dari qty yang sudah diambil penjahit.',
            ]);
        }

        $article->update([
            ...$data,
            'available_qty' => (int) $data['planned_qty'] - $article->assigned_qty,
            'status' => $article->completed_qty >= (int) $data['planned_qty']
                ? ProductionArticleStatus::Completed
                : ($article->assigned_qty > 0 ? ProductionArticleStatus::InProgress : ProductionArticleStatus::Ready),
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Hancaan diperbarui.');
    }

    public function cancel(ProductionArticle $article): RedirectResponse
    {
        if ($article->assigned_qty > 0 || $article->completed_qty > 0) {
            throw ValidationException::withMessages([
                'production_article_id' => 'Hancaan yang sudah diambil atau selesai tidak bisa dibatalkan.',
            ]);
        }

        $article->update([
            'available_qty' => 0,
            'status' => ProductionArticleStatus::Cancelled,
        ]);

        return Redirect::back(fallback: route('dashboard'))->with('status', 'Hancaan dibatalkan.');
    }
}
