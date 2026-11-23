<?php

namespace App\Http\Controllers\Sewing;

use App\Enums\Ability;
use App\Http\Controllers\Controller;
use App\Models\Tailor;
use App\Models\User;
use App\Support\Activity\ActivityCatalog;
use App\Support\Activity\ActivityRecorder;
use Carbon\CarbonImmutable;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redirect;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Riwayat aktivitas: one entry per action (who · when · what), with the records it created, changed or deleted.
 * Filters: person, WO, penjahit, kind of data, date range, free text.
 */
class ActivityLogController extends Controller
{
    private const PER_PAGE = 30;

    private const MAX_CHANGES_SHOWN = 40;

    private const HEADER_EVENTS = ['action', 'login', 'logout', 'login_failed'];

    public function index(Request $request): Response
    {
        $filters = [
            'user' => $request->integer('user') ?: null,
            'wo' => $request->integer('wo') ?: null,
            'tailor' => $request->integer('tailor') ?: null,
            'type' => $request->string('type')->toString() ?: null,
            'from' => $request->date('from')?->toDateString(),
            'to' => $request->date('to')?->toDateString(),
            'q' => trim($request->string('q')->toString()) ?: null,
            'auth' => $request->boolean('auth'),
        ];
        $page = max(1, $request->integer('page', 1));

        $batches = DB::table('activity_logs')
            ->select('batch_id', DB::raw('MAX(id) as last_id'))
            ->tap(fn (Builder $query) => $this->applyFilters($query, $filters))
            ->groupBy('batch_id')
            ->orderByDesc('last_id')
            ->offset(($page - 1) * self::PER_PAGE)
            ->limit(self::PER_PAGE + 1)
            ->pluck('batch_id');

        $hasMore = $batches->count() > self::PER_PAGE;
        $batchIds = $batches->take(self::PER_PAGE)->values();

        $rows = DB::table('activity_logs')->whereIn('batch_id', $batchIds)->orderBy('id')->get()->groupBy('batch_id');
        $names = $this->referencedNames($rows->flatten(1));

        return Inertia::render('ActivityLogs/Index', [
            'entries' => $batchIds->map(fn (string $batchId) => $this->entry($rows->get($batchId, collect()), $names))->filter()->values(),
            'filters' => $filters,
            'page' => $page,
            'hasMore' => $hasMore,
            'options' => [
                'users' => User::query()->orderBy('name')->get(['id', 'name'])->map(fn (User $user) => ['value' => (string) $user->id, 'label' => $user->name]),
                'tailors' => Tailor::query()->orderBy('name')->get(['id', 'name'])->map(fn (Tailor $tailor) => ['value' => (string) $tailor->id, 'label' => $tailor->name]),
                'types' => collect(ActivityCatalog::subjects())->map(fn (string $label, string $type) => ['value' => $type, 'label' => $label])->values(),
            ],
            'workOrderNumber' => $filters['wo'] ? DB::table('work_orders')->where('id', $filters['wo'])->value('number') : null,
            'purge' => $request->user()->hasAbility(Ability::ActivityLogsPurge) ? [
                'oldest' => DB::table('activity_logs')->min('created_at'),
                'total' => DB::table('activity_logs')->whereIn('event', self::HEADER_EVENTS)->count(),
            ] : null,
        ]);
    }

    /** How much "hapus riwayat sebelum <tanggal>" would remove, shown before the Owner confirms. */
    public function purgePreview(Request $request): JsonResponse
    {
        $before = $this->purgeCutoff($request->validate(['before' => ['required', 'date']])['before']);
        $query = DB::table('activity_logs')->where('created_at', '<', $before);

        return response()->json([
            'before' => $before->toDateString(),
            'actions' => (clone $query)->whereIn('event', self::HEADER_EVENTS)->count(),
            'rows' => $query->count(),
        ]);
    }

    /**
     * Owner-only: delete history older than a chosen date. Today's history always stays, and the purge itself is
     * recorded (who, when, up to which date, how many rows), so removing the trail never goes unnoticed.
     */
    public function purge(Request $request, ActivityRecorder $recorder): RedirectResponse
    {
        $data = $request->validate([
            'before' => ['required', 'date', 'before_or_equal:today'],
            'confirm' => ['required', 'string', 'in:HAPUS'],
        ], [
            'before.before_or_equal' => 'Riwayat hari ini tidak bisa dihapus. Pilih tanggal paling lambat hari ini.',
            'confirm.in' => 'Ketik HAPUS (huruf besar) untuk mengonfirmasi.',
            'confirm.required' => 'Ketik HAPUS untuk mengonfirmasi.',
        ]);

        $before = $this->purgeCutoff($data['before']);
        $query = DB::table('activity_logs')->where('created_at', '<', $before);
        $actions = (clone $query)->whereIn('event', self::HEADER_EVENTS)->count();
        $rows = $query->delete();

        $recorder->annotate("sebelum {$before->format('d/m/Y')} · {$rows} baris dihapus", ['sebelum' => $before->toDateString(), 'baris_dihapus' => $rows]);

        return Redirect::route('activity-logs.index')->with('status', $rows > 0
            ? "{$actions} aktivitas ({$rows} baris riwayat) sebelum {$before->format('d/m/Y')} dihapus."
            : 'Tidak ada riwayat sebelum tanggal itu.');
    }

    /** Everything strictly before the start of the chosen day, and never anything from today. */
    private function purgeCutoff(string $date): CarbonImmutable
    {
        $day = CarbonImmutable::parse($date)->startOfDay();

        return $day->greaterThan(today()) ? CarbonImmutable::today() : $day;
    }

    /** @param array<string, mixed> $filters */
    private function applyFilters(Builder $query, array $filters): void
    {
        $query
            ->when($filters['user'], fn (Builder $q, int $user) => $q->where('user_id', $user))
            ->when($filters['wo'], fn (Builder $q, int $wo) => $q->where('work_order_id', $wo))
            ->when($filters['tailor'], fn (Builder $q, int $tailor) => $q->where('tailor_id', $tailor))
            ->when($filters['type'], fn (Builder $q, string $type) => $q->where('subject_type', $type))
            ->when($filters['from'], fn (Builder $q, string $from) => $q->where('created_at', '>=', CarbonImmutable::parse($from)->startOfDay()))
            ->when($filters['to'], fn (Builder $q, string $to) => $q->where('created_at', '<=', CarbonImmutable::parse($to)->endOfDay()))
            ->when(! $filters['auth'], fn (Builder $q) => $q->whereNotIn('event', ['login', 'logout', 'login_failed']))
            ->when($filters['q'], function (Builder $q, string $text) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $text).'%';
                $q->where(fn (Builder $inner) => $inner
                    ->where('subject_label', 'like', $like)
                    ->orWhere('action_label', 'like', $like)
                    ->orWhere('user_name', 'like', $like));
            });
    }

    /**
     * @param  Collection<int, object>  $rows
     * @param  array<string, array<int, string>>  $names
     * @return array<string, mixed>|null
     */
    private function entry(Collection $rows, array $names): ?array
    {
        if ($rows->isEmpty()) {
            return null;
        }

        $headerRow = $rows->first(fn ($row) => in_array($row->event, self::HEADER_EVENTS, true));
        $header = $headerRow ?? $rows->first(); // automatic jobs have no headline row
        $changes = $rows->reject(fn ($row) => in_array($row->event, self::HEADER_EVENTS, true))->values();

        // WO / penjahit the whole action was about, when it was about exactly one.
        $single = fn (string $column) => $header->{$column} ?? (($ids = $changes->pluck($column)->filter()->unique())->count() === 1 ? $ids->first() : null);
        $workOrderId = $single('work_order_id');
        $tailorId = $single('tailor_id');

        return [
            'id' => $header->batch_id,
            'at' => CarbonImmutable::parse($header->created_at)->toIso8601String(),
            'event' => $header->event,
            'source' => $header->source,
            'user' => ['id' => $header->user_id, 'name' => $header->user_name ?? 'Sistem', 'role' => $header->user_role],
            'action' => $header->action_label ?? ActivityCatalog::action($header->action) ?? 'Perubahan data',
            'subject' => $headerRow && $header->subject_label ? ['type' => ActivityCatalog::subject($header->subject_type), 'label' => $header->subject_label] : null,
            'work_order' => $workOrderId ? ['id' => (int) $workOrderId, 'number' => $names['work_orders'][$workOrderId] ?? null] : null,
            'tailor' => $tailorId ? ['id' => (int) $tailorId, 'name' => $names['tailors'][$tailorId] ?? null] : null,
            'email' => $header->event === 'login_failed' ? (json_decode((string) $header->new_values, true)['email'] ?? null) : null,
            'change_count' => $changes->count(),
            'changes' => $changes->take(self::MAX_CHANGES_SHOWN)->map(fn ($row) => [
                'id' => $row->id,
                'event' => $row->event,
                'type' => ActivityCatalog::subject($row->subject_type),
                'label' => $row->subject_label,
                'fields' => $this->fields($row, $names),
            ])->values(),
        ];
    }

    /**
     * @param  array<string, array<int, string>>  $names
     * @return list<array{label: string, old: mixed, new: mixed}>
     */
    private function fields(object $row, array $names): array
    {
        $old = json_decode((string) $row->old_values, true) ?: [];
        $new = json_decode((string) $row->new_values, true) ?: [];

        // Created/deleted rows: show the few fields that say what it was, not every column.
        $keys = array_keys($row->event === 'updated' ? $new : ($row->event === 'created' ? $new : $old));
        if ($row->event !== 'updated') {
            $keys = array_values(array_filter($keys, fn (string $key) => ! str_ends_with($key, '_id') || in_array($key, ['tailor_id', 'article_id'], true)));
            $keys = array_slice($keys, 0, 6);
        }

        return array_map(fn (string $key) => [
            'label' => ActivityCatalog::field($key),
            'old' => $this->display($key, $old[$key] ?? null, $names),
            'new' => $this->display($key, $new[$key] ?? null, $names),
        ], $keys);
    }

    /** @param array<string, array<int, string>> $names */
    private function display(string $key, mixed $value, array $names): mixed
    {
        return match (true) {
            $value === null => null,
            $key === 'tailor_id' => $names['tailors'][$value] ?? '#'.$value,
            $key === 'article_id' => $names['articles'][$value] ?? '#'.$value,
            $key === 'work_order_id' => $names['work_orders'][$value] ?? '#'.$value,
            is_bool($value) => $value ? 'Ya' : 'Tidak',
            is_array($value) => implode(', ', array_map(fn ($item) => is_scalar($item) ? (string) $item : json_encode($item), $value)),
            default => $value,
        };
    }

    /**
     * Names for ids that appear in the shown rows, looked up in one query per table.
     *
     * @param  Collection<int, object>  $rows
     * @return array<string, array<int, string>>
     */
    private function referencedNames(Collection $rows): array
    {
        $ids = ['tailors' => [], 'articles' => [], 'work_orders' => []];

        foreach ($rows as $row) {
            if ($row->work_order_id) {
                $ids['work_orders'][] = (int) $row->work_order_id;
            }
            if ($row->tailor_id) {
                $ids['tailors'][] = (int) $row->tailor_id;
            }
            foreach ([json_decode((string) $row->old_values, true) ?: [], json_decode((string) $row->new_values, true) ?: []] as $values) {
                foreach (['tailor_id' => 'tailors', 'article_id' => 'articles', 'work_order_id' => 'work_orders'] as $key => $table) {
                    if (isset($values[$key]) && is_numeric($values[$key])) {
                        $ids[$table][] = (int) $values[$key];
                    }
                }
            }
        }

        $column = ['tailors' => 'name', 'articles' => 'name', 'work_orders' => 'number'];

        return collect($ids)->map(fn (array $list, string $table) => $list === []
            ? []
            : DB::table($table)->whereIn('id', array_unique($list))->pluck($column[$table], 'id')->all())->all();
    }
}
