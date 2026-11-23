<?php

namespace App\Providers;

use App\Enums\Ability;
use App\Models\User;
use App\Support\Activity\ActivityRecorder;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;
use Illuminate\Console\Events\CommandStarting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Event;
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
        $this->app->singleton(ActivityRecorder::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Vite::prefetch(concurrency: 3);

        $this->defineAbilities();
        $this->recordActivity();
    }

    /** Riwayat aktivitas: every create / update / delete of an App\Models record, plus sign-ins. */
    private function recordActivity(): void
    {
        $recorder = fn (): ActivityRecorder => $this->app->make(ActivityRecorder::class);

        foreach (['created', 'updated', 'deleted'] as $event) {
            Event::listen("eloquent.{$event}: *", function (string $name, array $payload) use ($event, $recorder) {
                if (($payload[0] ?? null) instanceof Model) {
                    $recorder()->recordModel($event, $payload[0]);
                }
            });
        }

        Event::listen(Login::class, fn (Login $event) => $event->user instanceof User ? $recorder()->recordAuth('login', $event->user) : null);
        Event::listen(Logout::class, fn (Logout $event) => $event->user instanceof User ? $recorder()->recordAuth('logout', $event->user) : null);
        Event::listen(Failed::class, fn (Failed $event) => $recorder()->recordAuth('login_failed', null, $event->credentials['email'] ?? null));
        Event::listen(CommandStarting::class, fn (CommandStarting $event) => $event->command ? $recorder()->beginCommand($event->command) : null);
    }

    /** One gate per Ability case, so routes can use `can:<ability>` and code can use Gate/@can. */
    private function defineAbilities(): void
    {
        foreach (Ability::cases() as $ability) {
            Gate::define($ability->value, fn (User $user) => $user->hasAbility($ability));
        }
    }
}
