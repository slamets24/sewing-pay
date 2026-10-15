<!DOCTYPE html>
<html lang="id">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="theme-color" content="#4318FF">

        <title inertia>{{ config('app.name', 'Laravel') }}</title>

        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=inter:400,500,600,700&display=swap" rel="stylesheet" />

        {{-- Apply the saved "huruf besar / kontras tinggi" choice before the first paint. --}}
        <script>
            try {
                var prefs = JSON.parse(localStorage.getItem('sweing-pay:display') || '{}');
                if (prefs.textScale === 'large') document.documentElement.classList.add('text-large');
                if (prefs.textScale === 'xlarge') document.documentElement.classList.add('text-xlarge');
                if (prefs.highContrast) document.documentElement.classList.add('contrast-high');
            } catch (e) {}
        </script>

        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
