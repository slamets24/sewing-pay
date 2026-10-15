<?php

namespace Database\Seeders;

use App\Actions\Sewing\CreatePickupAction;
use App\Actions\Sewing\CreateWorkOrderAction;
use App\Actions\Sewing\RecordDeliveryAction;
use App\Enums\ArticleSource;
use App\Enums\TailorType;
use App\Enums\UserRole;
use App\Models\Article;
use App\Models\Tailor;
use App\Models\User;
use App\Models\WorkOrder;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/** Local-only sample floor: staff logins, tailors, articles and one work order in progress. */
class SewingDemoSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['admin@example.com', 'Admin Gudang', UserRole::Admin],
            ['qc@example.com', 'Anak QC', UserRole::Qc],
        ] as [$email, $name, $role]) {
            User::query()->updateOrCreate(['email' => $email], [
                'name' => $name,
                'role' => $role,
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]);
        }

        $tailors = collect([
            ['PNJ-001', 'Bu Siti', TailorType::Internal],
            ['PNJ-002', 'Pak Darto', TailorType::Internal],
            ['PNJ-003', 'Bu Yanti', TailorType::Internal],
            ['MKL-001', 'Makloon Berkah', TailorType::Makloon],
        ])->map(fn (array $row) => Tailor::query()->firstOrCreate(['code' => $row[0]], [
            'name' => $row[1],
            'type' => $row[2],
            'whatsapp_number' => '081200000000',
            'is_active' => true,
        ]));

        $tailors->each(function (Tailor $tailor) {
            if (blank($tailor->portal_token)) {
                $tailor->generatePortal();
            }
        });

        $articles = collect([
            ['Marina', 'One Set', 7000],
            ['Cecilia', 'One Set', 7500],
            ['Taleena', 'One Set', 7000],
            ['Vella', 'Dress', 6000],
        ])->map(fn (array $row) => Article::query()->firstOrCreate(['name' => $row[0]], [
            'source' => ArticleSource::Manual,
            'category_name' => $row[1],
            'sewing_rate' => $row[2],
            'is_active' => true,
        ]));

        if (WorkOrder::query()->where('number', 'LOKA 324')->exists()) {
            return;
        }

        $workOrder = app(CreateWorkOrderAction::class)->execute([
            'number' => 'LOKA 324',
            'channel' => 'Orderan reseller & toko online',
            'category' => 'PRINT',
            'due_at' => today()->addDays(5)->toDateString(),
            'is_opening_stock' => true,
            'items' => [
                ['article_id' => $articles[0]->id, 'color' => 'Teal blue', 'size' => 'S', 'planned_qty' => 4],
                ['article_id' => $articles[0]->id, 'color' => 'Teal blue', 'size' => 'M', 'planned_qty' => 4],
                ['article_id' => $articles[0]->id, 'color' => 'Brown', 'size' => 'L', 'planned_qty' => 5],
                ['article_id' => $articles[3]->id, 'color' => 'Khaki', 'size' => 'M', 'planned_qty' => 3],
            ],
        ]);

        app(CreateWorkOrderAction::class)->execute([
            'number' => 'LOKA 325',
            'channel' => 'Orderan reseller',
            'category' => 'PRINT',
            'due_at' => today()->addDays(10)->toDateString(),
            'items' => [
                ['article_id' => $articles[1]->id, 'color' => 'Coffe', 'size' => 'XL', 'planned_qty' => 2],
                ['article_id' => $articles[2]->id, 'color' => 'Black', 'size' => 'M', 'planned_qty' => 4],
            ],
        ]);

        $items = $workOrder->items;
        $pickup = app(CreatePickupAction::class)->execute([
            'tailor_id' => $tailors[0]->id,
            'items' => [
                ['work_order_item_id' => $items[0]->id, 'qty' => 2],
                ['work_order_item_id' => $items[3]->id, 'qty' => 1],
            ],
        ]);

        app(RecordDeliveryAction::class)->execute($pickup->items->first(), 1);

        app(CreatePickupAction::class)->execute([
            'tailor_id' => $tailors[3]->id,
            'items' => [['work_order_item_id' => $items[2]->id, 'qty' => 5]],
        ]);
    }
}
