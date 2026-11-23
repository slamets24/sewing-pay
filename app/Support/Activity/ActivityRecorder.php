<?php

namespace App\Support\Activity;

use App\Models\User;
use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Routing\Route;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Throwable;

/**
 * Writes the activity history. Every Eloquent create/update/delete in App\Models is recorded automatically
 * (see AppServiceProvider), tagged with who did it and which action (route) it belonged to; the middleware adds
 * one `action` row per submitted form so even bulk updates that skip model events leave a trace.
 *
 * Rows go straight in with the query builder: no model events, so recording never records itself.
 */
class ActivityRecorder
{
    /** Bookkeeping or derived records that would only add noise. */
    private const SKIPPED_MODELS = [
        'ActivityLog', 'PayoutSlipLine', 'MakloonPaymentLine', 'ArticleVariant', 'ArticleAlias', 'ArticlePriceSuggestion',
    ];

    /** Columns never worth showing as a change. */
    private const IGNORED_FIELDS = [
        'id', 'created_at', 'updated_at', 'remember_token', 'synced_at', 'packing_synced_at', 'public_token', 'portal_token', 'portal_pin', 'email_verified_at',
    ];

    private const MAX_TEXT = 300;

    private ?string $batchId = null;

    private string $source = 'system';

    private ?string $action = null;

    private ?string $ip = null;

    private int $changes = 0;

    private bool $paused = false;

    /** Extra words for the headline row when the action has no record of its own (e.g. "sebelum 01/01/2026"). */
    private ?string $note = null;

    /** @var array<string, mixed> */
    private array $noteValues = [];

    /** @var array<string, mixed> small per-request lookup cache */
    private array $cache = [];

    // ── Context ────────────────────────────────────────────────────────────────

    public function beginRequest(Request $request): void
    {
        $this->reset();
        $this->source = $request->is('api/*') ? 'api' : 'web';
        $this->action = $request->route()?->getName() ?? ($this->source === 'api' ? 'api:'.$request->method().' '.$request->path() : null);
        $this->ip = $request->ip();
    }

    public function beginCommand(string $command): void
    {
        $this->reset();
        $this->source = 'console';
        $this->action = 'artisan:'.$command;
    }

    public function batchId(): string
    {
        return $this->batchId ??= (string) Str::uuid();
    }

    public function changeCount(): int
    {
        return $this->changes;
    }

    /** Describe the current action for its headline row, when it changes no single record (e.g. a purge). */
    public function annotate(string $label, array $values = []): void
    {
        $this->note = $label;
        $this->noteValues = $values;
    }

    /** Run without recording (e.g. demo seeders). */
    public function withoutRecording(callable $callback): mixed
    {
        $previous = $this->paused;
        $this->paused = true;

        try {
            return $callback();
        } finally {
            $this->paused = $previous;
        }
    }

    // ── Recording ──────────────────────────────────────────────────────────────

    public function recordModel(string $event, Model $model): void
    {
        if ($this->paused || ! str_starts_with($model::class, 'App\\Models\\')) {
            return;
        }

        $type = class_basename($model);

        if (in_array($type, self::SKIPPED_MODELS, true)) {
            return;
        }

        [$old, $new] = $this->diff($event, $model);

        if ($event === 'updated' && $old === [] && $new === []) {
            return;
        }

        $this->insert([
            'event' => $event,
            'subject_type' => $type,
            'subject_id' => $model->getKey(),
            'subject_label' => $this->label($model),
            'work_order_id' => $this->workOrderIdOf($model),
            'tailor_id' => $this->tailorIdOf($model),
            'old_values' => $old === [] ? null : $old,
            'new_values' => $new === [] ? null : $new,
        ]);

        $this->changes++;
    }

    /** The headline row for one user action; its subject is the first record in the URL (e.g. the WO). */
    public function recordAction(?Route $route = null): void
    {
        if ($this->paused) {
            return;
        }

        $subject = collect($route?->parameters() ?? [])->first(fn ($value) => $value instanceof Model);

        $this->insert([
            'event' => 'action',
            'subject_type' => $subject ? class_basename($subject) : null,
            'subject_id' => $subject?->getKey(),
            'subject_label' => $subject ? $this->label($subject) : $this->note,
            'work_order_id' => $subject ? $this->workOrderIdOf($subject) : null,
            'tailor_id' => $subject ? $this->tailorIdOf($subject) : null,
            'new_values' => array_filter([...$this->noteValues, 'perubahan' => $this->changes ?: null]) ?: null,
        ]);
    }

    public function recordAuth(string $event, ?User $user, ?string $email = null): void
    {
        if ($this->paused) {
            return;
        }

        $this->insert([
            'event' => $event,
            'action' => $event === 'login_failed' ? 'login' : $event,
            'new_values' => $email ? ['email' => $email] : null,
        ], $user);
    }

    // ── Internals ──────────────────────────────────────────────────────────────

    private function reset(): void
    {
        $this->batchId = null;
        $this->source = 'system';
        $this->action = null;
        $this->ip = null;
        $this->changes = 0;
        $this->cache = [];
        $this->note = null;
        $this->noteValues = [];
    }

    /** @param array<string, mixed> $row */
    private function insert(array $row, ?User $actor = null): void
    {
        $actor ??= Auth::user();
        $action = $row['action'] ?? $this->action;

        try {
            DB::table('activity_logs')->insert([
                'batch_id' => $this->batchId(),
                'event' => $row['event'],
                'user_id' => $actor?->getKey(),
                'user_name' => $actor?->name ?? $this->systemName(),
                'user_role' => $actor instanceof User ? $actor->roleLabel() : null,
                'source' => $this->source,
                'action' => $action,
                'action_label' => ActivityCatalog::action($action),
                'subject_type' => $row['subject_type'] ?? null,
                'subject_id' => $row['subject_id'] ?? null,
                'subject_label' => isset($row['subject_label']) ? Str::limit((string) $row['subject_label'], 250) : null,
                'work_order_id' => $row['work_order_id'] ?? null,
                'tailor_id' => $row['tailor_id'] ?? null,
                'old_values' => isset($row['old_values']) ? json_encode($row['old_values'], JSON_UNESCAPED_UNICODE) : null,
                'new_values' => isset($row['new_values']) ? json_encode($row['new_values'], JSON_UNESCAPED_UNICODE) : null,
                'ip' => $this->ip,
                'created_at' => now(),
            ]);
        } catch (Throwable $exception) {
            // The history must never break the actual work (e.g. table not migrated yet).
            Log::warning('Activity log not written: '.$exception->getMessage());
        }
    }

    private function systemName(): string
    {
        return match ($this->source) {
            'api' => str_contains((string) $this->action, 'external') ? 'Sistem (API HR)' : 'Sistem (API Packing)',
            'console' => 'Sistem (perintah otomatis)',
            default => 'Sistem',
        };
    }

    /** @return array{0: array<string, mixed>, 1: array<string, mixed>} */
    private function diff(string $event, Model $model): array
    {
        $hidden = $model->getHidden();

        if ($event === 'updated') {
            // Compare raw values first, so a changed hidden field (password) still shows as changed.
            $changed = array_keys(array_filter(
                $model->getChanges(),
                fn ($value, $key) => (string) json_encode($value) !== (string) json_encode($model->getRawOriginal($key)) && (string) $value !== (string) $model->getRawOriginal($key),
                ARRAY_FILTER_USE_BOTH,
            ));
        }

        $clean = function (array $values) use ($hidden): array {
            $out = [];
            foreach ($values as $key => $value) {
                if (in_array($key, self::IGNORED_FIELDS, true) || str_ends_with($key, '_by')) {
                    continue;
                }
                $out[$key] = in_array($key, $hidden, true) ? '(disembunyikan)' : $this->scalar($value);
            }

            return $out;
        };

        return match ($event) {
            'created' => [[], array_filter($clean($model->getAttributes()), fn ($value) => $value !== null && $value !== '')],
            'deleted' => [array_filter($clean($model->getAttributes()), fn ($value) => $value !== null && $value !== ''), []],
            default => (function () use ($model, $clean, $changed) {
                $new = $clean(array_intersect_key($model->getChanges(), array_flip($changed)));
                $old = $clean(array_intersect_key($model->getRawOriginal(), $new));

                return [$old, $new];
            })(),
        };
    }

    private function scalar(mixed $value): mixed
    {
        if ($value instanceof BackedEnum) {
            return $value->value;
        }
        if ($value instanceof DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }
        if (is_string($value)) {
            $decoded = str_starts_with($value, '[') || str_starts_with($value, '{') ? json_decode($value, true) : null;

            return is_array($decoded) ? $decoded : Str::limit($value, self::MAX_TEXT);
        }

        return is_scalar($value) || $value === null || is_array($value) ? $value : (string) $value;
    }

    private function label(Model $model): string
    {
        $type = class_basename($model);
        $a = fn (string $key) => $model->getAttribute($key);
        $qty = fn () => $a('qty') !== null ? $a('qty').' pcs · ' : '';

        try {
            return match ($type) {
                'WorkOrder' => (string) $a('number'),
                'WorkOrderItem' => $this->itemLabel($model->getKey(), $model),
                'CuttingReceipt', 'HancaanReceipt', 'VendorJob' => $qty().$this->itemLabel($a('work_order_item_id')),
                'VendorJobReturn' => $qty().$this->itemLabel($this->lookup('vendor_jobs', $a('vendor_job_id'), 'work_order_item_id')),
                'Pickup' => 'ke '.$this->tailorName($a('tailor_id')),
                'PickupItem' => $qty().$this->itemLabel($a('work_order_item_id')).' → '.$this->tailorName($a('tailor_id')),
                'SewingDelivery' => $qty().$this->itemLabel($a('work_order_item_id')).' dari '.$this->tailorName($a('tailor_id')),
                'Revision' => $qty().$this->itemLabel($a('work_order_item_id')).' · '.$this->tailorName($a('tailor_id')),
                'TailorAttendance' => $this->tailorName($a('tailor_id')).' · '.substr((string) $a('date'), 0, 10),
                'PayoutSlip' => trim($a('invoice_number').' · '.$this->tailorName($a('tailor_id'))),
                'MakloonPayment' => trim($a('code').' · '.$this->tailorName($a('tailor_id'))),
                default => (string) ($a('number') ?? $a('code') ?? $a('name') ?? $a('invoice_number') ?? '#'.$model->getKey()),
            };
        } catch (Throwable) {
            return '#'.$model->getKey();
        }
    }

    private function itemLabel(mixed $itemId, ?Model $item = null): string
    {
        if (! $itemId) {
            return '';
        }

        return $this->cache["item:$itemId"] ??= (function () use ($itemId, $item) {
            $row = $item
                ? (object) ['article_id' => $item->getAttribute('article_id'), 'color' => $item->getAttribute('color'), 'size' => $item->getAttribute('size'), 'work_order_id' => $item->getAttribute('work_order_id')]
                : DB::table('work_order_items')->where('id', $itemId)->first(['article_id', 'color', 'size', 'work_order_id']);

            if (! $row) {
                return 'Artikel WO #'.$itemId;
            }

            $article = $this->lookup('articles', $row->article_id, 'name') ?? 'Artikel';
            $number = $this->lookup('work_orders', $row->work_order_id, 'number');

            return implode(' · ', array_filter([$article, $row->color, $row->size])).($number ? " ($number)" : '');
        })();
    }

    private function tailorName(mixed $tailorId): string
    {
        return $tailorId ? ($this->lookup('tailors', $tailorId, 'name') ?? 'Penjahit #'.$tailorId) : '-';
    }

    private function lookup(string $table, mixed $id, string $column): mixed
    {
        if (! $id) {
            return null;
        }

        $key = "$table:$id:$column";

        return array_key_exists($key, $this->cache) ? $this->cache[$key] : ($this->cache[$key] = DB::table($table)->where('id', $id)->value($column));
    }

    private function workOrderIdOf(Model $model): ?int
    {
        $a = fn (string $key) => $model->getAttribute($key);

        $id = match (true) {
            class_basename($model) === 'WorkOrder' => $model->getKey(),
            $a('work_order_id') !== null => $a('work_order_id'),
            $a('work_order_item_id') !== null => $this->lookup('work_order_items', $a('work_order_item_id'), 'work_order_id'),
            $a('vendor_job_id') !== null => $this->lookup('work_order_items', $this->lookup('vendor_jobs', $a('vendor_job_id'), 'work_order_item_id'), 'work_order_id'),
            default => null,
        };

        return $id !== null ? (int) $id : null;
    }

    private function tailorIdOf(Model $model): ?int
    {
        $a = fn (string $key) => $model->getAttribute($key);

        $id = match (true) {
            class_basename($model) === 'Tailor' => $model->getKey(),
            $a('tailor_id') !== null => $a('tailor_id'),
            $a('pickup_id') !== null => $this->lookup('pickups', $a('pickup_id'), 'tailor_id'),
            default => null,
        };

        return $id !== null ? (int) $id : null;
    }
}
