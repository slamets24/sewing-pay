<?php

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// Setup temporary writable storage for Vercel serverless environment
if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL']) || getenv('VERCEL')) {
    $storage = '/tmp/storage';
    $dirs = [
        $storage . '/framework/views',
        $storage . '/framework/sessions',
        $storage . '/framework/cache/data',
        $storage . '/logs',
        '/tmp/bootstrap/cache',
    ];

    foreach ($dirs as $dir) {
        if (!is_dir($dir)) {
            @mkdir($dir, 0755, true);
        }
    }

    putenv('VIEW_COMPILED_PATH=' . $storage . '/framework/views');
    putenv('APP_SERVICES_CACHE=' . '/tmp/bootstrap/cache/services.php');
    putenv('APP_PACKAGES_CACHE=' . '/tmp/bootstrap/cache/packages.php');
    putenv('APP_CONFIG_CACHE=' . '/tmp/bootstrap/cache/config.php');
    putenv('APP_ROUTES_CACHE=' . '/tmp/bootstrap/cache/routes.php');
    putenv('APP_EVENTS_CACHE=' . '/tmp/bootstrap/cache/events.php');
}

// Maintenance check
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Composer autoloader
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel
/** @var \Illuminate\Foundation\Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

if (isset($_ENV['VERCEL']) || isset($_SERVER['VERCEL']) || getenv('VERCEL')) {
    $app->useStoragePath('/tmp/storage');
}

$app->handleRequest(Request::capture());
