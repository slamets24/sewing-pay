<?php

namespace Tests\Feature\Sewing;

use App\Enums\Ability;
use App\Models\Role;
use App\Models\User;
use App\Support\Access\AbilityAudit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RoleAbilityTest extends TestCase
{
    use RefreshDatabase;

    private function customRole(array $abilities, string $name = 'Kepala Gudang', bool $canLogin = true): Role
    {
        return Role::create([
            'slug' => Role::uniqueSlugFor($name),
            'name' => $name,
            'can_login' => $canLogin,
            'abilities' => $abilities,
        ]);
    }

    public function test_every_staff_route_has_an_ability_and_every_ability_is_used(): void
    {
        $audit = app(AbilityAudit::class);

        $this->assertSame([], $audit->unguardedRoutes(), 'Ada route staff tanpa ability (tambahkan ->middleware(\'can:...\')).');
        $this->assertSame([], $audit->undefinedAbilities(), 'Ada route memakai ability yang belum ada di App\\Enums\\Ability.');
        $this->assertSame([], $audit->unusedAbilities(), 'Ada ability di katalog yang tidak dipakai route mana pun.');
        $this->artisan('abilities:audit')->assertSuccessful();
    }

    public function test_frontend_ability_type_mirrors_the_enum(): void
    {
        preg_match_all("/\\| '([^']+)'/", file_get_contents(resource_path('js/lib/abilities.ts')), $matches);

        $this->assertSame(Ability::values(), $matches[1], 'Samakan type Ability di resources/js/lib/abilities.ts dengan App\\Enums\\Ability.');
    }

    public function test_built_in_roles_keep_their_previous_access(): void
    {
        $admin = User::factory()->admin()->create();

        $this->assertSame(array_map(fn (Ability $a) => $a->value, Ability::adminDefaults()), Role::query()->where('slug', 'admin')->first()->abilities);
        $this->assertTrue($admin->hasAbility(Ability::DeliveriesManage));
        $this->assertFalse($admin->hasAbility(Ability::PayoutsView));
        $this->assertFalse($admin->hasAbility(Ability::RolesManage));

        $owner = User::factory()->superadmin()->create();
        $this->assertSame(Ability::values(), $owner->abilities());
    }

    public function test_owner_creates_a_role_and_required_abilities_are_added(): void
    {
        $owner = User::factory()->superadmin()->create();

        $this->actingAs($owner)->post(route('roles.store'), [
            'name' => 'Kasir Gaji',
            'description' => 'Bayar slip saja',
            'can_login' => true,
            'abilities' => [Ability::PayoutsPay->value],
        ])->assertSessionHasNoErrors();

        $role = Role::query()->where('name', 'Kasir Gaji')->firstOrFail();
        $this->assertSame('kasir-gaji', $role->slug);
        $this->assertFalse($role->is_system);
        $this->assertSame([Ability::PayoutsView->value, Ability::PayoutsPay->value], $role->abilities);
    }

    public function test_owner_only_and_unknown_abilities_cannot_be_granted(): void
    {
        $owner = User::factory()->superadmin()->create();

        foreach ([Ability::RolesManage->value, 'abilities.tidak-ada'] as $ability) {
            $this->actingAs($owner)->post(route('roles.store'), [
                'name' => 'Role '.$ability,
                'can_login' => true,
                'abilities' => [$ability],
            ])->assertSessionHasErrors('abilities.0');
        }

        $this->assertSame(4, Role::count());
    }

    public function test_only_owner_can_open_or_change_roles(): void
    {
        $admin = User::factory()->admin()->create();
        $adminRole = Role::query()->where('slug', 'admin')->first();

        $this->actingAs($admin)->get(route('roles.index'))->assertForbidden();
        $this->actingAs($admin)->post(route('roles.store'), ['name' => 'X', 'can_login' => true, 'abilities' => []])->assertForbidden();
        $this->actingAs($admin)->patch(route('roles.update', $adminRole), ['name' => 'Admin', 'abilities' => Ability::values()])->assertForbidden();

        $this->actingAs(User::factory()->superadmin()->create())
            ->get(route('roles.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Master/Roles')
                ->has('roles', 4)
                ->where('audit.unguarded_routes', [])
                ->has('abilityGroups'));
    }

    public function test_access_follows_the_abilities_of_the_role(): void
    {
        $role = $this->customRole([Ability::WorkOrdersView->value, Ability::ProductionReportsView->value]);
        $user = User::factory()->create(['role' => $role->slug]);

        $this->actingAs($user)->get('/')->assertRedirect(route('work-orders.index'));
        $this->actingAs($user)->get(route('work-orders.index'))->assertOk();
        $this->actingAs($user)->get(route('production-reports.index'))->assertOk();
        $this->actingAs($user)->get(route('dashboard'))->assertForbidden();
        $this->actingAs($user)->get(route('pickups.create'))->assertForbidden();
        $this->actingAs($user)->get(route('work-orders.create'))->assertForbidden();

        $this->actingAs($user)->get(route('work-orders.index'))->assertInertia(fn (Assert $page) => $page
            ->where('auth.user.role', $role->slug)
            ->where('auth.user.role_label', 'Kepala Gudang')
            ->where('auth.user.home_route', 'work-orders.index')
            ->where('auth.user.abilities', [Ability::WorkOrdersView->value, Ability::ProductionReportsView->value]));
    }

    public function test_changing_a_roles_abilities_changes_access_right_away(): void
    {
        $owner = User::factory()->superadmin()->create();
        $admin = User::factory()->admin()->create();
        $adminRole = Role::query()->where('slug', 'admin')->first();

        $this->actingAs($admin)->get(route('deliveries.index'))->assertOk();

        $abilities = array_values(array_diff($adminRole->abilities, [Ability::DeliveriesManage->value]));
        $this->actingAs($owner)->patch(route('roles.update', $adminRole), [
            'name' => 'Admin Divisi Jahit',
            'abilities' => [...$abilities, Ability::PayoutsView->value],
        ])->assertSessionHasNoErrors();

        $admin = $admin->fresh();
        $this->actingAs($admin)->get(route('deliveries.index'))->assertForbidden();
        $this->actingAs($admin)->get(route('payouts.index'))->assertOk();
    }

    public function test_locked_and_system_roles_are_protected(): void
    {
        $owner = User::factory()->superadmin()->create();
        $ownerRole = Role::query()->where('slug', 'superadmin')->first();
        $tailorRole = Role::query()->where('slug', 'penjahit')->first();
        $adminRole = Role::query()->where('slug', 'admin')->first();

        $this->actingAs($owner)->patch(route('roles.update', $ownerRole), ['name' => 'Owner', 'abilities' => []])->assertForbidden();
        $this->actingAs($owner)->patch(route('roles.update', $tailorRole), ['name' => 'Penjahit', 'abilities' => [Ability::DashboardView->value]])->assertForbidden();
        $this->actingAs($owner)->patch(route('roles.update', $adminRole), ['name' => 'Admin', 'can_login' => false, 'abilities' => []])->assertSessionHasErrors('can_login');
        $this->actingAs($owner)->delete(route('roles.destroy', $adminRole))->assertForbidden();

        $used = $this->customRole([Ability::DeskUse->value], 'Loket');
        User::factory()->create(['role' => $used->slug]);
        $this->actingAs($owner)->delete(route('roles.destroy', $used))->assertSessionHasErrors('role');

        $unused = $this->customRole([Ability::DeskUse->value], 'Cadangan');
        $this->actingAs($owner)->delete(route('roles.destroy', $unused))->assertSessionHasNoErrors();
        $this->assertModelMissing($unused);
    }

    public function test_non_owner_cannot_hand_out_a_role_broader_than_their_own(): void
    {
        $admin = User::factory()->admin()->create();
        $broader = $this->customRole([Ability::DashboardView->value, Ability::PayoutsView->value], 'Keuangan');
        $narrower = $this->customRole([Ability::DeskUse->value], 'Operator Loket');
        $data = ['name' => 'Baru', 'email' => 'baru@example.com', 'password' => 'password', 'password_confirmation' => 'password'];

        $this->actingAs($admin)->post(route('users.store'), $data + ['role' => $broader->slug])->assertSessionHasErrors('role');
        $this->actingAs($admin)->post(route('users.store'), $data + ['role' => $narrower->slug])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => 'baru@example.com', 'role' => $narrower->slug]);

        $finance = User::factory()->create(['role' => $broader->slug]);
        $this->actingAs($admin)->patch(route('users.password.update', $finance), ['password' => 'password', 'password_confirmation' => 'password'])->assertForbidden();

        $this->actingAs($admin)->get(route('users.index'))->assertInertia(fn (Assert $page) => $page
            ->where('roles', fn ($roles) => collect($roles)->pluck('value')->sort()->values()->all() === ['admin', 'operator-loket']));
    }

    public function test_role_without_menu_or_login_cannot_sign_in(): void
    {
        $empty = $this->customRole([], 'Kosong');
        $noLogin = $this->customRole([Ability::DashboardView->value], 'Tamu', canLogin: false);

        foreach ([$empty, $noLogin] as $role) {
            $user = User::factory()->create(['role' => $role->slug]);
            $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
            $this->assertGuest();
        }
    }
}
