<?php

namespace App\Providers;

use App\Enums\Ability;
use App\Models\User;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Vite;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->defineAbilities();
    }

    /** One gate per Ability case, so routes can use `can:<ability>` and code can use Gate/@can. */
    private function defineAbilities(): void
    {
        foreach (Ability::cases() as $ability) {
            Gate::define($ability->value, fn (User $user) => $user->hasAbility($ability));
        }
    }
}
