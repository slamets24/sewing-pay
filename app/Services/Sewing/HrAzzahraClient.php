<?php

namespace App\Services\Sewing;

use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Client untuk berkomunikasi dengan API internal hr-azzahra (divisi Penjahit saja).
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

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Internal-Key' => (string) config('services.hr_azzahra.key')])
            ->acceptJson()
            ->timeout(15)
            ->get('/api/v1/internal/employees', [
                'division' => 'Jahit',
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
        if (! $this->isConfigured()) {
            return [];
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Internal-Key' => (string) config('services.hr_azzahra.key')])
            ->acceptJson()
            ->timeout(15)
            ->get('/api/v1/internal/attendances', [
                'date' => $date,
                'division' => 'Jahit',
            ]);

        if ($response->failed()) {
            throw new RuntimeException("hr-azzahra menolak permintaan absensi (HTTP {$response->status()}).");
        }

        return $response->json('data', []);
    }

    /**
     * Mengecek sisa kasbon aktif karyawan penjahit.
     *
     * @return array{total_outstanding: int, loans: list<array<string, mixed>>}
     */
    public function activeKasbons(int|string $employeeIdentifier): array
    {
        if (! $this->isConfigured()) {
            return ['total_outstanding' => 0, 'loans' => []];
        }

        $params = is_numeric($employeeIdentifier)
            ? ['employee_id' => (int) $employeeIdentifier]
            : ['employee_number' => (string) $employeeIdentifier];

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Internal-Key' => (string) config('services.hr_azzahra.key')])
            ->acceptJson()
            ->timeout(15)
            ->get('/api/v1/internal/kasbons/active', $params);

        if ($response->failed()) {
            return ['total_outstanding' => 0, 'loans' => []];
        }

        return $response->json('data', ['total_outstanding' => 0, 'loans' => []]);
    }

    /**
     * Melaporkan pemotongan kasbon saat slip gaji dibayarkan (potong_gaji).
     *
     * @return array<string, mixed>
     */
    public function deductKasbon(int $kasbonId, int $amount, string $referenceNumber, ?string $notes = null): array
    {
        if (! $this->isConfigured()) {
            return [];
        }

        $response = Http::baseUrl($this->baseUrl())
            ->withHeaders(['X-Internal-Key' => (string) config('services.hr_azzahra.key')])
            ->acceptJson()
            ->timeout(15)
            ->post('/api/v1/internal/kasbons/deduct', [
                'kasbon_id' => $kasbonId,
                'amount' => $amount,
                'reference_number' => $referenceNumber,
                'notes' => $notes ?? "Potong gaji slip {$referenceNumber}",
            ]);

        if ($response->failed()) {
            throw new RuntimeException("Gagal mencatat pelunasan kasbon ke hr-azzahra (HTTP {$response->status()}).");
        }

        return $response->json('data', []);
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.hr_azzahra.url'), '/');
    }
}
