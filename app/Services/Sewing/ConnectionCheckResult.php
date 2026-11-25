<?php

namespace App\Services\Sewing;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Response;

/**
 * Hasil tombol "Tes koneksi" ke aplikasi lain, dengan pesan yang langsung menunjuk apa yang harus dibetulkan.
 */
final class ConnectionCheckResult
{
    private function __construct(
        public readonly bool $ok,
        public readonly string $message,
    ) {}

    public static function notConfigured(string $envKeys): self
    {
        return new self(false, "Belum diatur: isi {$envKeys} di .env.");
    }

    /**
     * @param  callable(): Response  $send
     */
    public static function from(string $appName, callable $send): self
    {
        $startedAt = microtime(true);

        try {
            $response = $send();
        } catch (ConnectionException) {
            return new self(false, "{$appName} tidak bisa dihubungi. Cek alamat URL di .env dan pastikan server {$appName} menyala.");
        }

        $milliseconds = (int) round((microtime(true) - $startedAt) * 1000);

        return match (true) {
            $response->successful() => new self(true, "Koneksi ke {$appName} OK ({$milliseconds} ms)."),
            $response->status() === 401 => new self(false, "{$appName} menolak kunci API. Samakan kuncinya di .env kedua aplikasi."),
            $response->status() === 503 => new self(false, "Kunci API di {$appName} belum diisi."),
            $response->status() === 404 => new self(false, "Alamat {$appName} salah, atau {$appName} belum diperbarui ke versi yang punya tes koneksi."),
            default => new self(false, "{$appName} membalas HTTP {$response->status()}."),
        };
    }
}
