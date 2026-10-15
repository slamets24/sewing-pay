<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExampleTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_from_root_to_login(): void
    {
        $this->get('/')->assertRedirect(route('login'));
    }

    public function test_users_are_redirected_from_root_to_their_home(): void
    {
        $superadmin = User::factory()->create();
        $admin = User::factory()->admin()->create();

        $this->actingAs($superadmin)->get('/')->assertRedirect(route('dashboard'));
        $this->actingAs($admin)->get('/')->assertRedirect(route('dashboard'));
    }
}
