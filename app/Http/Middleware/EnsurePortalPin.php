<?php

namespace App\Http\Middleware;

use App\Models\Tailor;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

/** A tailor portal is a private link plus a PIN. No email login. */
class EnsurePortalPin
{
    /**
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $tailor = $request->route('tailor');

        abort_unless($tailor instanceof Tailor && filled($tailor->portal_pin), 404);

        if ($tailor->portalIsUnlocked() && ! $tailor->mustChangePortalPin()) {
            return $next($request);
        }

        if ($request->isMethod('GET')) {
            return Inertia::render('Portal/Pin', [
                'tailor' => [
                    'name' => $tailor->name,
                    'code' => $tailor->code,
                ],
                'action' => route('portal.pin.store', ['tailor' => $tailor->portal_token]),
                'must_change' => $tailor->mustChangePortalPin(),
            ])->toResponse($request);
        }

        abort(403);
    }
}
