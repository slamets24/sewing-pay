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

    public function test_app_shell_renders_fixed_opsew_title_and_favicon_links(): void
    {
        config(['app.name' => '\\']);

        $response = $this->get(route('login'));

        $response->assertOk();
        $response->assertSee('<title inertia>OPSEW</title>', false);
        $response->assertSee('<link rel="icon" type="image/png" href="/images/favicon.png">', false);
        $response->assertSee('<link rel="icon" type="image/x-icon" href="/favicon.ico">', false);
        $this->assertGreaterThan(0, filesize(public_path('favicon.ico')));
        $this->assertGreaterThan(0, filesize(public_path('images/favicon.png')));
    }
}
