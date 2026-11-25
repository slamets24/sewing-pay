<?php

namespace App\Services\Sewing;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client untuk berkomunikasi dengan API internal hr-azzahra (divisi Penjahit saja).
 * Header X-Internal-Key = SWEING_PAY_INTERNAL_KEY, sama di kedua aplikasi.
 */
class HrAzzahraClient
{
    public function isConfigured(): bool
    {
        return filled($this->baseUrl()) && filled(config('services.hr_azzahra.key'));
    }

    /**
     * Mengambil daftar karyawan aktif divisi Penjahit dari hr-azzahra.
     *
     * @return list<array<string, mixed>>
     */
    public function sewingEmployees(): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $response = $this->request()->get('/api/v1/internal/employees', [
            ...$this->divisionFilter(),
            'active_only' => 'true',
        ]);

        if ($response->failed()) {
            throw new RuntimeException("hr-azzahra menolak permintaan karyawan (HTTP {$response->status()}).");
        }

        return $response->json('data', []);
    }

    /**
     * Mengambil rekapan absensi harian penjahit untuk tanggal tertentu.
     *
     * @return list<array<string, mixed>>
     */
    public function dailyAttendances(string $date): array
    {
        return $this->isConfigured() ? $this->attendancesBetween($date, $date) : [];
    }

    /**
     * Absensi penjahit untuk satu rentang tanggal dalam satu panggilan (maks 62 hari).
     *
     * @return list<array<string, mixed>>
     */
    public function attendancesBetween(string $dateFrom, string $dateTo): array
    {
        $this->ensureConfigured();

        $response = $this->request()->get('/api/v1/internal/attendances', [
            ...$this->divisionFilter(),
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
        ]);

        if ($response->failed()) {
            throw new RuntimeException("hr-azzahra menolak permintaan absensi (HTTP {$response->status()}).");
        }

        return $response->json('data', []);
    }

    /**
     * Kirim draft pencairan gaji penjahit ke hr-azzahra untuk di-acc. Dikirim ulang = data di HR diganti (selama belum di-acc).
     *
     * @param  array<string, mixed>  $payload
     */
    public function submitPayout(array $payload): void
    {
        $this->ensureConfigured();

        $response = $this->request()->post('/api/v1/internal/sewing-payouts', $payload);

        if ($response->failed()) {
            throw new RuntimeException('hr-azzahra menolak kiriman gaji: '.$this->reason($response->json('message'), $response->status()));
        }
    }

    /**
     * Kabari hr-azzahra slip mana saja yang sudah dibayar. Selalu mengirim semua slip yang sudah dibayar di pencairan itu,
     * jadi kiriman yang sempat gagal ikut terkirim lagi di pembayaran berikutnya.
     *
     * @param  list<array{opsew_slip_id: int, paid_at: string}>  $paidSlips
     */
    public function reportPayoutPaid(int $payoutId, array $paidSlips): void
    {
        $this->ensureConfigured();

        $response = $this->request()->post("/api/v1/internal/sewing-payouts/{$payoutId}/paid", ['slips' => $paidSlips]);

        if ($response->failed()) {
            throw new RuntimeException('hr-azzahra menolak status bayar: '.$this->reason($response->json('message'), $response->status()));
        }
    }

    /**
     * Tes koneksi: alamat bisa dihubungi dan kunci API diterima.
     */
    public function ping(): ConnectionCheckResult
    {
        if (! $this->isConfigured()) {
            return ConnectionCheckResult::notConfigured('HR_AZZAHRA_API_URL / SWEING_PAY_INTERNAL_KEY');
        }

        return ConnectionCheckResult::from('HR', fn () => $this->request(8)->get('/api/v1/internal/ping'));
    }

    public function ensureConfigured(): void
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Koneksi ke hr-azzahra belum diatur (HR_AZZAHRA_API_URL dan SWEING_PAY_INTERNAL_KEY di .env).');
        }
    }

    /**
     * Divisi penjahit di HR: pakai ID divisi kalau HR_AZZAHRA_SEWING_DIVISION_ID diisi (aman kalau nama divisi diganti),
     * kalau tidak, cari divisi yang namanya mengandung "Jahit".
     *
     * @return array<string, int|string>
     */
    private function divisionFilter(): array
    {
        $divisionId = (int) config('services.hr_azzahra.sewing_division_id');

        return $divisionId > 0 ? ['division_id' => $divisionId] : ['division' => 'Jahit'];
    }

    private function reason(mixed $message, int $status): string
    {
        return is_string($message) && $message !== '' ? $message : "HTTP {$status}";
    }

    private function request(int $timeoutSeconds = 15): PendingRequest
    {
        return Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Internal-Key' => (string) config('services.hr_azzahra.key')])
            ->acceptJson()
            ->connectTimeout(min(5, $timeoutSeconds))
            ->timeout($timeoutSeconds);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.hr_azzahra.url'), '/');
    }
}
