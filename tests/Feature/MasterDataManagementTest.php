<?php

namespace Tests\Feature;

use App\Enums\ProductionArticleStatus;
use App\Enums\UserRole;
use App\Models\ProductionArticle;
use App\Models\Tailor;
use App\Models\User;
use App\Models\WorkType;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MasterDataManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_update_and_toggle_tailor_status(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $tailor = Tailor::create([
            'code' => 'PNJ-001',
            'name' => 'Nama Lama',
            'whatsapp_number' => '0812',
            'is_active' => true,
        ]);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('tailors.update', $tailor), [
                'code' => 'PNJ-EDIT',
                'name' => 'Nama Baru',
                'whatsapp_number' => '0812-9999',
                'address' => 'Bandung',
                'joined_at' => '2026-07-01',
                'notes' => 'Catatan edit',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $tailor->refresh();
        $this->assertSame('PNJ-EDIT', $tailor->code);
        $this->assertSame('Nama Baru', $tailor->name);

        $this->actingAs($superadmin)->post(route('tailors.deactivate', $tailor))->assertSessionHasNoErrors();
        $this->assertFalse($tailor->refresh()->is_active);

        $this->actingAs($superadmin)->post(route('tailors.activate', $tailor))->assertSessionHasNoErrors();
        $this->assertTrue($tailor->refresh()->is_active);
    }

    public function test_admin_cannot_manage_master_data(): void
    {
        $admin = User::factory()->admin()->create();
        $tailor = Tailor::create(['code' => 'PNJ-002', 'name' => 'Admin Blocked', 'is_active' => true]);

        $this->actingAs($admin)
            ->patch(route('tailors.update', $tailor), [
                'code' => 'PNJ-HACK',
                'name' => 'Should Not Update',
            ])
            ->assertForbidden();

        $this->assertSame('PNJ-002', $tailor->refresh()->code);
    }

    public function test_superadmin_can_update_and_toggle_work_type_status(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $workType = $this->workType('Jahit Lama', 5000);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('work-types.update', $workType), [
                'code' => 'WRK-EDIT',
                'name' => 'Jahit Baru',
                'category' => 'revision',
                'unit' => 'pcs',
                'rate_amount' => 7500,
                'notes' => 'Tarif edit',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $workType->refresh();
        $this->assertSame('WRK-EDIT', $workType->code);
        $this->assertSame('Jahit Baru', $workType->name);
        $this->assertSame(7500, $workType->rate_amount);

        $this->actingAs($superadmin)->post(route('work-types.deactivate', $workType))->assertSessionHasNoErrors();
        $this->assertFalse($workType->refresh()->is_active);

        $this->actingAs($superadmin)->post(route('work-types.activate', $workType))->assertSessionHasNoErrors();
        $this->assertTrue($workType->refresh()->is_active);
    }

    public function test_superadmin_can_update_ready_hancaan_and_available_qty_follows_plan(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $workType = $this->workType('Jahit Kemeja', 5000);
        $article = $this->article($workType, plannedQty: 20, assignedQty: 5);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('hancaan.update', $article), [
                'work_type_id' => $workType->id,
                'article_name' => 'Kemeja Edit',
                'color' => 'Navy',
                'size' => 'L',
                'planned_qty' => 30,
                'ready_at' => '2026-07-01',
                'notes' => 'Hancaan edit',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $article->refresh();
        $this->assertSame('Kemeja Edit', $article->article_name);
        $this->assertSame(30, $article->planned_qty);
        $this->assertSame(25, $article->available_qty);
        $this->assertSame(ProductionArticleStatus::InProgress, $article->status);
    }

    public function test_hancaan_update_rejects_plan_below_assigned_qty(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $workType = $this->workType('Jahit Celana', 6000);
        $article = $this->article($workType, plannedQty: 20, assignedQty: 8);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('hancaan.update', $article), [
                'work_type_id' => $workType->id,
                'article_name' => 'Celana Edit',
                'color' => 'Hitam',
                'size' => 'M',
                'planned_qty' => 7,
            ])
            ->assertSessionHasErrors('planned_qty')
            ->assertRedirect(route('dashboard'));

        $this->assertSame(20, $article->refresh()->planned_qty);
    }

    public function test_superadmin_can_cancel_unassigned_hancaan_but_not_assigned_hancaan(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $workType = $this->workType('Jahit Rok', 4500);
        $unassigned = $this->article($workType, plannedQty: 10, assignedQty: 0);
        $assigned = $this->article($workType, plannedQty: 10, assignedQty: 2);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->post(route('hancaan.cancel', $unassigned))
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $this->assertSame(ProductionArticleStatus::Cancelled, $unassigned->refresh()->status);
        $this->assertSame(0, $unassigned->available_qty);

        $this->actingAs($superadmin)
            ->from(route('dashboard'))
            ->post(route('hancaan.cancel', $assigned))
            ->assertSessionHasErrors('production_article_id')
            ->assertRedirect(route('dashboard'));

        $this->assertNotSame(ProductionArticleStatus::Cancelled, $assigned->refresh()->status);
    }

    private function workType(string $name, int $rateAmount): WorkType
    {
        return WorkType::create([
            'code' => fake()->unique()->numerify('WRK-###'),
            'name' => $name,
            'category' => 'regular',
            'unit' => 'pcs',
            'rate_amount' => $rateAmount,
            'is_active' => true,
        ]);
    }

    private function article(WorkType $workType, int $plannedQty, int $assignedQty): ProductionArticle
    {
        return ProductionArticle::create([
            'work_type_id' => $workType->id,
            'article_name' => 'Artikel Test',
            'color' => 'Hitam',
            'size' => 'M',
            'planned_qty' => $plannedQty,
            'available_qty' => $plannedQty - $assignedQty,
            'assigned_qty' => $assignedQty,
            'completed_qty' => 0,
            'status' => $assignedQty > 0 ? ProductionArticleStatus::InProgress : ProductionArticleStatus::Ready,
            'ready_at' => '2026-07-01',
        ]);
    }
}
