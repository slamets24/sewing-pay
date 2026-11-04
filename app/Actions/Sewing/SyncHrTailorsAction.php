<?php

namespace App\Actions\Sewing;

use App\Enums\TailorType;
use App\Models\Tailor;
use App\Services\Sewing\HrAzzahraClient;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Menyinkronkan master data karyawan penjahit dari hr-azzahra ke database lokal sweing-pay.
 */
class SyncHrTailorsAction
{
    public function __construct(private readonly HrAzzahraClient $client) {}

    /**
     * @return array{synced: int, created: int, updated: int}
     */
    public function execute(): array
    {
        $employees = $this->client->sewingEmployees();
        $created = 0;
        $updated = 0;

        foreach ($employees as $payload) {
            DB::transaction(function () use ($payload, &$created, &$updated) {
                $hrId = (int) $payload['id'];
                $hrNumber = (string) ($payload['employee_number'] ?? '');

                /** @var Tailor|null $tailor */
                $tailor = Tailor::query()
                    ->where('hr_employee_id', $hrId)
                    ->orWhere(fn ($q) => filled($hrNumber) ? $q->where('hr_employee_number', $hrNumber) : null)
                    ->first();

                $isNew = $tailor === null;

                if ($isNew) {
                    $tailor = new Tailor([
                        'code' => $this->generateCode($payload['name'] ?? 'T', $hrNumber),
                        'type' => TailorType::Internal,
                    ]);
                }

                $tailor->fill([
                    'hr_employee_id' => $hrId,
                    'hr_employee_number' => $hrNumber,
                    'name' => (string) ($payload['name'] ?? $tailor->name),
                    'gender' => $payload['gender'] ?? $tailor->gender,
                    'employment_status' => $payload['employment_status'] ?? $tailor->employment_status,
                    'whatsapp_number' => $payload['phone'] ?? $tailor->whatsapp_number,
                    'joined_at' => $payload['joined_at'] ?? $tailor->joined_at,
                    'is_active' => (bool) ($payload['is_active'] ?? true),
                ]);

                $tailor->save();

                if (empty($tailor->portal_token)) {
                    $tailor->generatePortal();
                }

                if ($isNew) {
                    $created++;
                } else {
                    $updated++;
                }
            });
        }

        return [
            'synced' => count($employees),
            'created' => $created,
            'updated' => $updated,
        ];
    }

    private function generateCode(string $name, string $employeeNumber): string
    {
        if (filled($employeeNumber)) {
            $numOnly = preg_replace('/[^0-9]/', '', $employeeNumber);
            if ($numOnly !== '') {
                $candidate = 'AZ'.substr($numOnly, -3);
                if (! Tailor::query()->where('code', $candidate)->exists()) {
                    return $candidate;
                }
            }
        }

        $base = strtoupper(Str::slug(Str::words($name, 1, ''), ''));
        if (empty($base)) {
            $base = 'JHT';
        }

        $code = $base;
        $counter = 1;

        while (Tailor::query()->where('code', $code)->exists()) {
            $code = "{$base}{$counter}";
            $counter++;
        }

        return $code;
    }
}
