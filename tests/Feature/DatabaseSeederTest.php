<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class DatabaseSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_seeding_preserves_existing_owner_credentials(): void
    {
        $owner = User::factory()->superadmin()->create([
            'email' => 'test@example.com',
            'password' => Hash::make('private-password'),
        ]);

        $this->seed(DatabaseSeeder::class);

        $this->assertTrue(Hash::check('private-password', $owner->refresh()->password));
        $this->assertSame(UserRole::Superadmin, $owner->role);
    }

    public function test_default_seeder_only_creates_user_data(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('users', 2);
        $this->assertDatabaseHas('users', ['email' => 'admin@example.com', 'role' => 'admin']);
        $this->assertDatabaseCount('revision_parts', 0);
        $this->assertDatabaseCount('articles', 0);
    }
}
