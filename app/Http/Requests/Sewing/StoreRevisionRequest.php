<?php

namespace App\Http\Requests\Sewing;

use App\Enums\RevisionFoundAt;
use App\Enums\RevisionType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRevisionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(RevisionType::class)],
            'found_at' => ['required', Rule::enum(RevisionFoundAt::class)],
            'sewing_delivery_id' => ['required_if:found_at,qc', 'nullable', 'integer', 'exists:sewing_deliveries,id'],
            'pickup_item_id' => ['nullable', 'integer', 'exists:pickup_items,id'],
            'return_to_warehouse' => ['boolean'],
            'work_order_item_id' => ['required_without_all:sewing_delivery_id,pickup_item_id', 'nullable', 'integer', 'exists:work_order_items,id'],
            'revision_part_id' => ['required_if:type,material', 'nullable', 'integer', 'exists:revision_parts,id'],
            'tailor_id' => ['required_without_all:sewing_delivery_id,pickup_item_id', 'nullable', 'integer', 'exists:tailors,id'],
            'qty' => ['required', 'integer', 'min:1', 'max:100000'],
            'notes' => ['nullable', 'string', 'max:500'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'revision_part_id.required_if' => 'Pilih bagian yang diganti.',
            'sewing_delivery_id.required_if' => 'Pilih barang yang dikirim ke QC.',
            'work_order_item_id.required_without_all' => 'Pilih barang yang direvisi.',
            'tailor_id.required_without_all' => 'Pilih penjahit yang mengerjakan revisi.',
        ];
    }
}
