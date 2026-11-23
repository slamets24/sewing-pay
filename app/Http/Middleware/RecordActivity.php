<?php

namespace App\Http\Middleware;

use App\Support\Activity\ActivityRecorder;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Opens one activity "batch" per request, so every record a form submit touches is grouped under it, then writes
 * the headline row ("Hari · Kirim ke cutting massal · WO LOKA-387"). Failed or rejected submits leave nothing.
 */
class RecordActivity
{
    public function __construct(private readonly ActivityRecorder $recorder) {}

    public function handle(Request $request, Closure $next): Response
    {
        $this->recorder->beginRequest($request);

        $response = $next($request);

        if ($this->shouldRecordAction($request, $response)) {
            $this->recorder->recordAction($request->route());
        }

        return $response;
    }

    private function shouldRecordAction(Request $request, Response $response): bool
    {
        if ($this->recorder->changeCount() > 0) {
            return true;
        }

        $isWrite = ! in_array($request->method(), ['GET', 'HEAD', 'OPTIONS'], true);
        // Errors flashed by *this* request (validation failed); older flashes may still sit in the session.
        $rejected = $response->getStatusCode() >= 400 || ($request->hasSession() && in_array('errors', (array) $request->session()->get('_flash.new', []), true));
        $authRoute = in_array($request->route()?->getName(), ['login', 'logout', 'password.email'], true) || $request->is('login');

        return $isWrite && ! $rejected && ! $authRoute;
    }
}
