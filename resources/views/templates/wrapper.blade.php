<!DOCTYPE html>
<html>
    <head>
        <title>{{ config('app.name', 'Pterodactyl') }}</title>

        @section('meta')
            <meta charset="utf-8">
            <meta http-equiv="X-UA-Compatible" content="IE=edge">
            <meta content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" name="viewport">
            <meta name="csrf-token" content="{{ csrf_token() }}">
            <meta name="robots" content="noindex">
            <link rel="apple-touch-icon" sizes="180x180" href="/favicons/apple-touch-icon.png">
            <link rel="icon" type="image/png" href="/favicons/favicon-32x32.png" sizes="32x32">
            <link rel="icon" type="image/png" href="/favicons/favicon-16x16.png" sizes="16x16">
            <link rel="manifest" href="/favicons/manifest.json">
            <link rel="mask-icon" href="/favicons/safari-pinned-tab.svg" color="#bc6e3c">
            <link rel="shortcut icon" href="/favicons/favicon.ico">
            <meta name="msapplication-config" content="/favicons/browserconfig.xml">
            <meta name="theme-color" content="#09090b">
        @show

        @section('user-data')
            @if(!is_null(Auth::user()))
                <script>
                    window.PterodactylUser = {!! json_encode(Auth::user()->toVueObject()) !!};
                </script>
            @endif
            @if(!empty($siteConfiguration))
                <script>
                    window.SiteConfiguration = {!! json_encode($siteConfiguration) !!};
                </script>
            @endif
        @show

        @yield('assets')
        {!! Theme::css('css/pterodactyl.css?t={cache-version}') !!}

        @include('layouts.scripts')
    </head>
    <body class="{{ $css['body'] ?? 'bg-neutral-950' }}">
        {{--
            brief-5 — pulihkan mode terang sebelum cat pertama.

            Aturan warna tema ada di bundle React, dan bundle itu dimuat di akhir
            <body>. Selama berkasnya belum jalan, <html> tidak punya kelas `.light`,
            jadi halaman sempat berkedip gelap tiap kali dimuat ulang oleh pengguna
            yang memilih mode terang. Skrip kecil ini menyalin pilihan dari
            localStorage ke <html> di dalam <head>, sebelum apa pun digambar.

            Kuncinya SENGAJA ditulis ulang, bukan diimpor: ia harus jalan sebelum
            bundle ada, jadi tidak boleh bergantung pada konstanta TypeScript.
            Kalau kuncinya berubah, ubah juga THEME_STORAGE_KEY di AppShell.tsx.
        --}}
        <script>
            (function () {
                try {
                    var theme = localStorage.getItem('z0ne.theme');
                    var prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
                    if (theme === 'light' || (!theme && prefersLight)) {
                        document.documentElement.classList.add('light');
                    }
                } catch (e) {
                    /* localStorage bisa diblokir (mode privat); abaikan, tetap mode gelap. */
                }
            })();
        </script>
        @section('content')
            @yield('above-container')
            @yield('container')
            @yield('below-container')
        @show
        @section('scripts')
            {!! $asset->js('main.js') !!}
        @show

    </body>
</html>
