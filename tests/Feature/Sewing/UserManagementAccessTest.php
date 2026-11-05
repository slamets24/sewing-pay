<?php

namespace Tests\Feature\Sewing;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementAccessTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_create_admin_but_not_superadmin(): void
    {
        $admin = User::factory()->admin()->create();
        $data = ['name' => 'Admin Baru', 'email' => 'baru@example.com', 'password' => 'password', 'password_confirmation' => 'password'];
        $this->actingAs($admin)->post(route('users.store'), $data + ['role' => 'superadmin'])->assertSessionHasErrors('role');
        $this->assertDatabaseMissing('users', ['email' => 'baru@example.com']);
        $this->actingAs($admin)->post(route('users.store'), $data + ['role' => 'admin'])->assertSessionHasNoErrors();
        $this->assertDatabaseHas('users', ['email' => 'baru@example.com', 'role' => 'admin']);
    }

    public function test_no_one_can_create_another_superadmin(): void
    {
        $owner = User::factory()->superadmin()->create();
        $this->actingAs($owner)->post(route('users.store'), ['name' => 'Owner', 'email' => 'owner2@example.com', 'password' => 'password', 'password_confirmation' => 'password', 'role' => 'superadmin'])->assertSessionHasErrors('role');
    }

    public function test_admin_cannot_change_or_reset_superadmin(): void
    {
        $admin = User::factory()->admin()->create();
        $owner = User::factory()->superadmin()->create();
        $this->actingAs($admin)->patch(route('users.update', $owner), ['role' => 'admin'])->assertForbidden();
        $this->actingAs($admin)->patch(route('users.password.update', $owner), ['password' => 'password', 'password_confirmation' => 'password'])->assertForbidden();
    }
}
