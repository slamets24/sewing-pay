<?php

namespace Tests\Feature\Sewing;

use App\Enums\Ability;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    private function logs()
    {
        return DB::table('activity_logs')->orderBy('id')->get();
    }

    public function test_a_pickup_records_who_gave_what_to_which_tailor(): void
    {
        $admin = User::factory()->admin()->create(['name' => 'Hari']);
        $tailor = $this->tailor(name: 'Bu Siti');
        $item = $this->readyItem(10, $this->article('Cecilia'));
        DB::table('activity_logs')->delete();

        $this->actingAs($admin)->post(route('pickups.store'), ['tailor_id' => $tailor->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 3]]])->assertSessionHasNoErrors();

        $logs = $this->logs();
        $header = $logs->firstWhere('event', 'action');
        $this->assertSame('Penjahit ambil barang', $header->action_label);
        $this->assertSame('Hari', $header->user_name);
        $this->assertSame('Admin Divisi Jahit', $header->user_role);

        $pickupItem = $logs->firstWhere('subject_type', 'PickupItem');
        $this->assertSame('created', $pickupItem->event);
        $this->assertSame($header->batch_id, $pickupItem->batch_id);
        $this->assertSame($tailor->id, (int) $pickupItem->tailor_id);
        $this->assertSame($item->work_order_id, (int) $pickupItem->work_order_id);
        $this->assertStringContainsString('3 pcs · Cecilia · Black · M', $pickupItem->subject_label);
        $this->assertStringContainsString('→ Bu Siti', $pickupItem->subject_label);

        // The WO line changing its counters is part of the same action.
        $itemUpdate = $logs->first(fn ($row) => $row->subject_type === 'WorkOrderItem' && $row->event === 'updated');
        $this->assertNotNull($itemUpdate);
        $this->assertSame($header->batch_id, $itemUpdate->batch_id);
    }

    public function test_an_edit_keeps_the_old_and_new_value(): void
    {
        $owner = $this->owner();
        $item = $this->readyItem(10);
        DB::table('activity_logs')->delete();

        $this->actingAs($owner)->patch(route('work-order-items.update', $item), ['planned_qty' => 14])->assertSessionHasNoErrors();

        $change = DB::table('activity_logs')->where('subject_type', 'WorkOrderItem')->where('event', 'updated')->sole();
        $this->assertSame(['planned_qty' => 10], json_decode($change->old_values, true));
        $this->assertSame(['planned_qty' => 14], json_decode($change->new_values, true));
    }

    public function test_a_rejected_submit_leaves_no_trace_and_passwords_are_never_stored(): void
    {
        $owner = $this->owner();
        $admin = User::factory()->admin()->create();
        DB::table('activity_logs')->delete();

        $this->actingAs($owner)->post(route('pickups.store'), ['tailor_id' => 999999, 'items' => []])->assertSessionHasErrors();
        $this->assertSame(0, DB::table('activity_logs')->count());

        $this->actingAs($owner)->patch(route('users.password.update', $admin), ['password' => 'rahasia-baru-123', 'password_confirmation' => 'rahasia-baru-123'])->assertSessionHasNoErrors();
        $change = DB::table('activity_logs')->where('subject_type', 'User')->where('event', 'updated')->sole();
        $this->assertSame(['password' => '(disembunyikan)'], json_decode($change->new_values, true));
        $this->assertStringNotContainsString('rahasia', (string) DB::table('activity_logs')->pluck('new_values')->implode(' '));
    }

    public function test_sign_ins_are_recorded_including_failed_attempts(): void
    {
        $user = User::factory()->admin()->create(['email' => 'hari@opsew.com']);

        $this->post('/login', ['email' => 'hari@opsew.com', 'password' => 'salah'])->assertSessionHasErrors();
        $this->post('/login', ['email' => 'hari@opsew.com', 'password' => 'password']);
        $this->post('/logout');

        $events = DB::table('activity_logs')->whereIn('event', ['login', 'logout', 'login_failed'])->orderBy('id')->pluck('event')->all();
        $this->assertSame(['login_failed', 'login', 'logout'], $events);
        $this->assertSame($user->id, (int) DB::table('activity_logs')->where('event', 'login')->value('user_id'));
    }

    public function test_history_page_filters_by_tailor_and_is_guarded_by_its_ability(): void
    {
        $owner = $this->owner();
        $siti = $this->tailor(name: 'Bu Siti');
        $rina = $this->tailor(name: 'Bu Rina');
        $item = $this->readyItem(10);
        DB::table('activity_logs')->delete();

        $this->actingAs($owner)->post(route('pickups.store'), ['tailor_id' => $siti->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 2]]]);
        $this->actingAs($owner)->post(route('pickups.store'), ['tailor_id' => $rina->id, 'items' => [['work_order_item_id' => $item->id, 'qty' => 1]]]);

        $this->actingAs($owner)->get(route('activity-logs.index', ['tailor' => $siti->id]))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('ActivityLogs/Index')
                ->has('entries', 1)
                ->where('entries.0.action', 'Penjahit ambil barang')
                ->where('entries.0.work_order.id', $item->work_order_id));

        $this->actingAs($owner)->get(route('activity-logs.index', ['wo' => $item->work_order_id]))
            ->assertInertia(fn (Assert $page) => $page->has('entries', 2));

        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->get(route('activity-logs.index'))->assertForbidden();

        $auditor = Role::create(['slug' => 'auditor', 'name' => 'Auditor', 'can_login' => true, 'abilities' => [Ability::ActivityLogsView->value]]);
        $this->actingAs(User::factory()->create(['role' => $auditor->slug]))->get(route('activity-logs.index'))->assertOk();
    }

    private function oldRow(string $createdAt, string $event = 'action'): void
    {
        DB::table('activity_logs')->insert(['batch_id' => fake()->uuid(), 'event' => $event, 'user_name' => 'Lama', 'source' => 'web', 'created_at' => $createdAt]);
    }

    public function test_owner_can_purge_history_before_a_date_and_the_purge_itself_is_recorded(): void
    {
        $owner = User::factory()->superadmin()->create(['name' => 'Bos']);
        DB::table('activity_logs')->delete();
        $this->oldRow(now()->subYears(2)->toDateTimeString());
        $this->oldRow(now()->subYears(2)->toDateTimeString(), 'created');
        $this->oldRow(now()->subMonths(2)->toDateTimeString());
        $cutoff = now()->subYear()->toDateString();

        $this->actingAs($owner)->getJson(route('activity-logs.purge-preview', ['before' => $cutoff]))
            ->assertOk()
            ->assertJson(['actions' => 1, 'rows' => 2]);

        $this->actingAs($owner)->delete(route('activity-logs.purge'), ['before' => $cutoff, 'confirm' => 'hapus'])->assertSessionHasErrors('confirm');
        $this->assertSame(3, DB::table('activity_logs')->count());

        $this->actingAs($owner)->delete(route('activity-logs.purge'), ['before' => $cutoff, 'confirm' => 'HAPUS'])->assertSessionHasNoErrors();

        $this->assertSame(0, DB::table('activity_logs')->where('created_at', '<', $cutoff)->count());
        $this->assertSame(1, DB::table('activity_logs')->where('user_name', 'Lama')->count());
        $trace = DB::table('activity_logs')->where('action', 'activity-logs.purge')->sole();
        $this->assertSame('Bos', $trace->user_name);
        $this->assertStringContainsString('2 baris dihapus', $trace->subject_label);
    }

    public function test_today_cannot_be_purged_and_only_the_owner_may_purge(): void
    {
        $owner = User::factory()->superadmin()->create();
        $this->actingAs($owner)->delete(route('activity-logs.purge'), ['before' => now()->addDay()->toDateString(), 'confirm' => 'HAPUS'])->assertSessionHasErrors('before');

        // Purging is owner-only: it cannot be put on a role, even by the owner.
        $this->actingAs($owner)->post(route('roles.store'), ['name' => 'Auditor', 'can_login' => true, 'abilities' => [Ability::ActivityLogsView->value, Ability::ActivityLogsPurge->value]])
            ->assertSessionHasErrors('abilities.1');

        $auditor = Role::create(['slug' => 'auditor', 'name' => 'Auditor', 'can_login' => true, 'abilities' => [Ability::ActivityLogsView->value, Ability::ActivityLogsPurge->value]]);
        $user = User::factory()->create(['role' => $auditor->slug]);
        $before = DB::table('activity_logs')->count();

        $this->actingAs($user)->get(route('activity-logs.index'))->assertOk()->assertInertia(fn (Assert $page) => $page->where('purge', null));
        $this->actingAs($user)->getJson(route('activity-logs.purge-preview', ['before' => now()->toDateString()]))->assertForbidden();
        $this->actingAs($user)->delete(route('activity-logs.purge'), ['before' => now()->toDateString(), 'confirm' => 'HAPUS'])->assertForbidden();
        $this->assertSame($before, DB::table('activity_logs')->count());
    }
}
