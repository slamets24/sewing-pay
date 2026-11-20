<?php

namespace Tests\Feature\Sewing;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MobilePreviewTest extends TestCase
{
    use RefreshDatabase, SewingTestHelpers;

    public function test_staff_can_open_mobile_preview(): void
    {
        $this->actingAs($this->warehouseAdmin())
            ->get(route('mobile-preview'))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('Prototype/MobilePreview'));
    }

    public function test_guest_is_redirected(): void
    {
        $this->get(route('mobile-preview'))->assertRedirect(route('login'));
    }
}
