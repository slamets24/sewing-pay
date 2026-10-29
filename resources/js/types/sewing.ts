/** Shapes of the props sent by the Laravel presenters in app/Presenters and the Sewing controllers. */

export type Stage = 'other_division' | 'ready' | 'sewing' | 'waiting_revision' | 'done';
export type TailorType = 'internal' | 'makloon';
export type RevisionType = 'sewing' | 'material';
export type RevisionStatus = 'waiting_material' | 'material_ready' | 'in_progress' | 'done';

export type TailorRecord = {
    id: number;
    code: string | null;
    name: string;
    type: TailorType;
    type_label: string;
    whatsapp_number: string | null;
    address: string | null;
    is_active: boolean;
    notes: string | null;
    holding_qty?: number;
    items_count?: number;
    has_portal?: boolean;
    portal_url?: string | null;
    portal_pin_is_default?: boolean;
};

export type CatalogArticle = {
    id: number;
    name: string;
    display_name: string;
    brand_name: string | null;
    category_name: string | null;
    sewing_rate: number;
    source: 'manual' | 'packingv2';
};

export type ArticleAliasRecord = { alias: string; article_id: number };

export type WorkOrderSummary = {
    id: number;
    number: string;
    channel: string | null;
    category: string | null;
    ordered_at: string | null;
    due_at: string | null;
    is_opening_stock: boolean;
    is_overdue: boolean;
    is_done: boolean;
    notes: string | null;
    items_count: number;
    article_names: string[];
    planned_qty: number;
    pending_qty: number;
    available_qty: number;
    sewing_qty: number;
    hold_qty: number;
    delivered_qty: number;
    can_delete: boolean;
};

export type WorkOrderItemRecord = {
    id: number;
    work_order_id: number;
    work_order_number: string | null;
    due_at: string | null;
    article_id: number;
    article_name: string;
    color: string | null;
    size: string | null;
    barcode_value: string | null;
    sewing_rate: number;
    planned_qty: number;
    received_qty: number;
    assigned_qty: number;
    delivered_qty: number;
    pending_qty: number;
    available_qty: number;
    sewing_qty: number;
    hold_qty: number;
    stage: Stage;
    stage_label: string;
    can_delete: boolean;
};

export type WorkOrderDetail = WorkOrderSummary & {
    source_text: string | null;
    items: WorkOrderItemRecord[];
};

export type HancaanReceiptRecord = {
    id: number;
    work_order_item_id: number;
    article_name: string;
    color: string | null;
    size: string | null;
    qty: number;
    received_at: string;
    notes: string | null;
    created_by_name: string | null;
};

export type PickupItemRecord = {
    id: number;
    pickup_id: number;
    tailor_id: number;
    tailor_name: string;
    tailor_type: TailorType;
    work_order_item_id: number;
    work_order_number: string;
    due_at: string | null;
    article_name: string;
    color: string | null;
    size: string | null;
    qty: number;
    delivered_qty: number;
    remaining_qty: number;
    sewing_rate: number;
    status: 'open' | 'done' | 'cancelled';
    status_label: string;
    picked_at: string;
    age_days: number;
    can_cancel: boolean;
};

/** One tailor and everything they are currently holding. */
export type BoardRow = {
    tailor: TailorRecord;
    remaining_qty: number;
    items: PickupItemRecord[];
};

export type DeliveryRecord = {
    id: number;
    tailor_id: number;
    tailor_name: string;
    tailor_code: string | null;
    work_order_item_id: number;
    work_order_number: string;
    brand_name: string | null;
    article_name: string;
    color: string | null;
    size: string | null;
    barcode_value: string | null;
    qty: number;
    sewing_rate: number;
    subtotal: number;
    is_payable: boolean;
    delivered_at: string;
    qc_shipment_id: number | null;
    qc_shipment_number: string | null;
    can_undo: boolean;
};

export type QcShipmentRecord = {
    id: number;
    number: string;
    sent_at: string;
    notes: string | null;
    qty: number;
    deliveries_count: number;
    created_by_name: string | null;
};

export type RevisionRecord = {
    id: number;
    type: RevisionType;
    type_label: string;
    status: RevisionStatus;
    status_label: string;
    next_status_label: string | null;
    found_at: 'sewing' | 'qc';
    found_at_label: string;
    work_order_number: string;
    brand_name: string | null;
    article_name: string;
    color: string | null;
    size: string | null;
    part_name: string | null;
    material_type: string | null;
    tailor_id: number;
    tailor_name: string;
    qty: number;
    rate: number;
    subtotal: number;
    reported_at: string;
    reported_by_name: string | null;
    completed_at: string | null;
    notes: string | null;
    is_on_slip: boolean;
    returned_to_warehouse: boolean;
    is_holding_stock: boolean;
    can_change_tailor: boolean;
};

export type RevisionPartRecord = {
    id: number;
    name: string;
    price: number;
    material_type: string;
    is_active?: boolean;
};

export type PayoutSummary = {
    id: number;
    code: string;
    cutoff_date: string;
    status: 'draft' | 'paid';
    status_label: string;
    is_draft: boolean;
    total_tailors: number;
    total_qty: number;
    total_amount: number;
    generated_at: string | null;
    paid_at: string | null;
    notes: string | null;
    slips_count: number;
    paid_slips_count: number;
};

export type PayoutSlipLineRecord = {
    id: number;
    type: 'sewing' | 'revision' | 'meal_allowance';
    type_label: string;
    description: string;
    color: string | null;
    size: string | null;
    qty: number;
    rate: number;
    subtotal: number;
    occurred_at: string;
};

export type PayoutSlipRecord = {
    id: number;
    invoice_number: string;
    tailor_id: number;
    tailor_name: string;
    tailor_code: string | null;
    status: 'draft' | 'paid';
    status_label: string;
    is_paid: boolean;
    qty: number;
    gross_amount: number;
    bonus_amount: number;
    deduction_amount: number;
    net_amount: number;
    notes: string | null;
    paid_at: string | null;
    whatsapp_url: string | null;
    public_url: string;
    lines: PayoutSlipLineRecord[];
};

export type PriceBenchmarkRow = {
    role?: 'tercepat' | 'sedang' | 'terlambat';
    color: string;
    minutes_label: string;
    price: number;
    tailor_label: string;
};

export type PriceBenchmarkSample = {
    id: number;
    color: string;
    tailor_id: number;
    tailor_name: string;
    working_hours?: number;
    meal_allowance?: number;
    started_at: string;
    finished_at: string;
    minutes_label: string;
    price: number;
};

/** Snapshot of the sample-based rate. Official sewing_rate stays separate until someone adopts it. */
export type PriceBenchmark = {
    hourly_rate: number;
    ready: boolean;
    color_count: number;
    needed: number;
    raw_average: number | null;
    suggested_rate: number | null;
    points: PriceBenchmarkRow[];
    others: PriceBenchmarkRow[];
    samples: PriceBenchmarkSample[];
    calculated_at: string | null;
};

export type ArticleRecord = {
    id: number;
    source: 'manual' | 'packingv2';
    source_label: string;
    name: string;
    display_name: string;
    brand_name: string | null;
    category_name: string | null;
    sewing_rate: number;
    is_active: boolean;
    notes: string | null;
    variants_count: number;
    barcode_count: number;
    synced_at: string | null;
    colors: string[];
    benchmark: PriceBenchmark | null;
};

export type ManagedUserRecord = {
    id: number;
    name: string;
    email: string;
    role: 'superadmin' | 'admin' | 'qc' | 'penjahit';
    role_label: string;
    is_current_user: boolean;
};

export type SelectOption = { value: string; label: string };
