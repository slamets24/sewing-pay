<?php

namespace App\Support\Access;

use App\Enums\Ability;
use App\Models\Role;
use Illuminate\Routing\Route;
use Illuminate\Routing\Router;

/**
 * Checks that the Ability catalog and the app agree:
 *  - every signed-in staff route is guarded by `can:<ability>` (otherwise any logged-in role can open it),
 *  - every route ability exists in the catalog,
 *  - every catalog ability is actually used by some route,
 *  - no role stores an ability the app no longer knows.
 */
class AbilityAudit
{
    /** Signed-in routes every account needs regardless of role. */
    private const OPEN_ROUTES = ['logout'];

    public function __construct(private readonly Router $router) {}

    /** @return list<array{name: string, uri: string, methods: string}> */
    public function unguardedRoutes(): array
    {
        return $this->staffRoutes()
            ->reject(fn (Route $route) => $this->routeAbilities($route) !== [] || in_array($route->getName(), self::OPEN_ROUTES, true))
            ->map(fn (Route $route) => $this->describe($route))
            ->values()
            ->all();
    }

    /** Route `can:` values that are not in the Ability catalog. @return list<array{name: string, uri: string, methods: string, ability: string}> */
    public function undefinedAbilities(): array
    {
        return $this->staffRoutes()
            ->flatMap(fn (Route $route) => collect($this->routeAbilities($route))
                ->reject(fn (string $ability) => Ability::tryFrom($ability) !== null)
                ->map(fn (string $ability) => $this->describe($route) + ['ability' => $ability]))
            ->values()
            ->all();
    }

    /** Catalog abilities no route checks. @return list<string> */
    public function unusedAbilities(): array
    {
        $used = $this->staffRoutes()->flatMap(fn (Route $route) => $this->routeAbilities($route))->unique()->all();

        return array_values(array_diff(Ability::values(), $used));
    }

    /** @return list<array{role: string, abilities: list<string>}> */
    public function staleRoleAbilities(): array
    {
        return Role::query()->orderBy('id')->get()
            ->map(fn (Role $role) => ['role' => $role->name, 'abilities' => $role->unknownAbilities()])
            ->filter(fn (array $row) => $row['abilities'] !== [])
            ->values()
            ->all();
    }

    /** @return array{unguarded_routes: list<array>, undefined_abilities: list<array>, unused_abilities: list<string>, stale_role_abilities: list<array>, route_count: int, ability_count: int} */
    public function report(): array
    {
        return [
            'unguarded_routes' => $this->unguardedRoutes(),
            'undefined_abilities' => $this->undefinedAbilities(),
            'unused_abilities' => $this->unusedAbilities(),
            'stale_role_abilities' => $this->staleRoleAbilities(),
            'route_count' => $this->staffRoutes()->count(),
            'ability_count' => count(Ability::cases()),
        ];
    }

    public function isClean(): bool
    {
        $report = $this->report();

        return $report['unguarded_routes'] === []
            && $report['undefined_abilities'] === []
            && $report['unused_abilities'] === []
            && $report['stale_role_abilities'] === [];
    }

    /** Routes behind the session `auth` middleware (the staff app). API key routes and public pages are out of scope. */
    private function staffRoutes()
    {
        return collect($this->router->getRoutes()->getRoutes())
            ->filter(fn (Route $route) => in_array('auth', $route->gatherMiddleware(), true));
    }

    /** @return list<string> */
    private function routeAbilities(Route $route): array
    {
        return collect($route->gatherMiddleware())
            ->filter(fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'can:'))
            ->map(fn (string $middleware) => explode(',', substr($middleware, 4))[0])
            ->values()
            ->all();
    }

    /** @return array{name: string, uri: string, methods: string} */
    private function describe(Route $route): array
    {
        return [
            'name' => (string) $route->getName(),
            'uri' => '/'.ltrim($route->uri(), '/'),
            'methods' => implode('|', array_diff($route->methods(), ['HEAD'])),
        ];
    }
}
