<?php

namespace Database\Seeders;

use App\Actions\CreateTailorAssignmentAction;
use App\Actions\RecordTailorCompletionAction;
use App\Enums\ProductionArticleStatus;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\TailorAssignment;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Database\Seeder;

class OperationalDemoSeeder extends Seeder
{
    public function run(): void
    {
        $superadmin = User::query()->where('email', 'test@example.com')->first();

        $tailors = [
            ['code' => 'PNJ-SITI', 'name' => 'Ibu Siti', 'whatsapp_number' => '6281211110001'],
            ['code' => 'PNJ-AYU', 'name' => 'Ibu Ayu', 'whatsapp_number' => '6281211110002'],
            ['code' => 'PNJ-DEWI', 'name' => 'Ibu Dewi', 'whatsapp_number' => '6281211110003'],
        ];

        foreach ($tailors as $tailor) {
            Tailor::query()->updateOrCreate(
                ['code' => $tailor['code']],
                [...$tailor, 'is_active' => true]
            );
        }

        $regularWorkType = WorkType::query()->firstOrCreate(
            ['code' => 'REG-KEMEJA-DEMO'],
            [
                'name' => 'Jahit Kemeja Demo',
                'category' => 'regular',
                'unit' => 'pcs',
                'rate_amount' => 7000,
                'is_active' => true,
                'source' => 'demo_seed',
            ]
        );

        $revisionWorkType = WorkType::query()->firstOrCreate(
            ['code' => 'REV-TANGAN-DEMO'],
            [
                'name' => 'Revisi Ganti Tangan Demo',
                'category' => 'revision',
                'unit' => 'pcs',
                'rate_amount' => 6000,
                'is_active' => true,
                'source' => 'demo_seed',
            ]
        );

        $articles = [
            [
                'work_type_id' => $regularWorkType->id,
                'article_name' => 'Kemeja Linen Demo',
                'color' => 'Navy',
                'size' => 'L',
                'planned_qty' => 80,
                'assignment_tailor_code' => 'PNJ-SITI',
                'assigned_qty' => 30,
                'completed_qty' => 12,
                'notes' => 'Demo hancaan urgent untuk tampilan mobile.',
            ],
            [
                'work_type_id' => $regularWorkType->id,
                'article_name' => 'Kemeja Oxford Demo',
                'color' => 'Putih',
                'size' => 'M',
                'planned_qty' => 60,
                'assignment_tailor_code' => 'PNJ-AYU',
                'assigned_qty' => 20,
                'completed_qty' => 0,
                'notes' => 'Demo pekerjaan sedang berjalan.',
            ],
            [
                'work_type_id' => $revisionWorkType->id,
                'article_name' => 'Revisi Kemeja Demo',
                'color' => 'Hitam',
                'size' => 'XL',
                'planned_qty' => 25,
                'assignment_tailor_code' => 'PNJ-DEWI',
                'assigned_qty' => 10,
                'completed_qty' => 4,
                'notes' => 'Demo revisi dari referensi Excel.',
            ],
        ];

        foreach ($articles as $articleData) {
            $article = ProductionArticle::query()->firstOrCreate(
                [
                    'article_name' => $articleData['article_name'],
                    'color' => $articleData['color'],
                    'size' => $articleData['size'],
                ],
                [
                    'work_type_id' => $articleData['work_type_id'],
                    'created_by' => $superadmin?->id,
                    'planned_qty' => $articleData['planned_qty'],
                    'available_qty' => $articleData['planned_qty'],
                    'assigned_qty' => 0,
                    'completed_qty' => 0,
                    'status' => ProductionArticleStatus::Ready,
                    'ready_at' => today(),
                    'notes' => $articleData['notes'],
                ]
            );

            $tailor = Tailor::query()->where('code', $articleData['assignment_tailor_code'])->firstOrFail();
            $assignment = TailorAssignment::query()
                ->where('production_article_id', $article->id)
                ->where('tailor_id', $tailor->id)
                ->first();

            if (! $assignment) {
                $assignment = app(CreateTailorAssignmentAction::class)->execute([
                    'tailor_id' => $tailor->id,
                    'production_article_id' => $article->id,
                    'assigned_qty' => $articleData['assigned_qty'],
                    'assigned_at' => now()->subDays(2)->format('Y-m-d H:i:s'),
                    'created_by' => $superadmin?->id,
                    'notes' => 'Demo pengambilan hancaan.',
                ]);
            }

            if ($articleData['completed_qty'] > 0 && $assignment->completions()->doesntExist()) {
                app(RecordTailorCompletionAction::class)->execute($assignment, [
                    'completed_qty' => $articleData['completed_qty'],
                    'completed_at' => now()->subDay()->format('Y-m-d H:i:s'),
                    'created_by' => $superadmin?->id,
                    'notes' => 'Demo cicilan qty selesai.',
                ]);
            }
        }
    }
}