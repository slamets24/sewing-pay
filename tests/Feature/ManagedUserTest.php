<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ManagedUserTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_create_admin_user(): void
    {
        $superadmin = User::factory()->superadmin()->create();

        $response = $this
            ->actingAs($superadmin)
            ->from(route('dashboard'))
            ->post(route('users.store'), [
                'name' => 'Admin Lapangan',
                'email' => 'admin-lapangan@example.com',
                'role' => UserRole::Admin->value,
                'password' => 'password',
                'password_confirmation' => 'password',
            ]);

        $response->assertSessionHasNoErrors()->assertRedirect(route('dashboard'));

        $user = User::where('email', 'admin-lapangan@example.com')->firstOrFail();

        $this->assertSame(UserRole::Admin, $user->role);
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('password', $user->password));
    }

    public function test_superadmin_can_update_user_role(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $admin = User::factory()->admin()->create();

        $this
            ->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('users.role.update', $admin), [
                'role' => UserRole::Superadmin->value,
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $this->assertSame(UserRole::Superadmin, $admin->refresh()->role);
    }

    public function test_superadmin_cannot_change_their_own_role(): void
    {
        $superadmin = User::factory()->superadmin()->create();

        $this
            ->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('users.role.update', $superadmin), [
                'role' => UserRole::Admin->value,
            ])
            ->assertSessionHasErrors('role')
            ->assertRedirect(route('dashboard'));

        $this->assertSame(UserRole::Superadmin, $superadmin->refresh()->role);
    }

    public function test_superadmin_can_reset_user_password(): void
    {
        $superadmin = User::factory()->superadmin()->create();
        $admin = User::factory()->admin()->create([
            'password' => Hash::make('old-password'),
        ]);

        $this
            ->actingAs($superadmin)
            ->from(route('dashboard'))
            ->patch(route('users.password.update', $admin), [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertSessionHasNoErrors()
            ->assertRedirect(route('dashboard'));

        $this->assertTrue(Hash::check('new-password', $admin->refresh()->password));
    }

    public function test_admin_cannot_create_users(): void
    {
        $admin = User::factory()->admin()->create();

        $this
            ->actingAs($admin)
            ->post(route('users.store'), [
                'name' => 'Blocked User',
                'email' => 'blocked@example.com',
                'role' => UserRole::Admin->value,
                'password' => 'password',
                'password_confirmation' => 'password',
            ])
            ->assertForbidden();

        $this->assertDatabaseMissing('users', ['email' => 'blocked@example.com']);
    }

    public function test_admin_cannot_manage_users(): void
    {
        $admin = User::factory()->admin()->create();
        $targetUser = User::factory()->admin()->create([
            'password' => Hash::make('old-password'),
        ]);

        $this
            ->actingAs($admin)
            ->patch(route('users.role.update', $targetUser), [
                'role' => UserRole::Superadmin->value,
            ])
            ->assertForbidden();

        $this
            ->actingAs($admin)
            ->patch(route('users.password.update', $targetUser), [
                'password' => 'new-password',
                'password_confirmation' => 'new-password',
            ])
            ->assertForbidden();

        $targetUser->refresh();
        $this->assertSame(UserRole::Admin, $targetUser->role);
        $this->assertFalse(Hash::check('new-password', $targetUser->password));
    }

    public function test_dashboard_shares_users_and_role_options(): void
    {
        $superadmin = User::factory()->superadmin()->create(['name' => 'Owner']);
        User::factory()->admin()->create(['name' => 'Admin Lapangan']);

        $this
            ->actingAs($superadmin)
            ->get(route('dashboard'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page
                ->component('Dashboard')
                ->where('userRoles.0.value', UserRole::Superadmin->value)
                ->where('userRoles.1.value', UserRole::Admin->value)
                ->where('users.0.name', 'Admin Lapangan')
                ->where('users.1.is_current_user', true)
            );
    }
}
