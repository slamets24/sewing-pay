export type UserRole = 'superadmin' | 'admin' | 'qc' | 'penjahit';

export interface AuthUser {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    home_route: string;
}

export interface SharedData {
    [key: string]: unknown;
    auth: {
        user: AuthUser | null;
    };
    flash: {
        status: string | null;
        undo: FlashUndo | null;
        created_article_id?: number | null;
    };
}

/** Server-provided link that reverses the action that produced the current flash message. */
export type FlashUndo = {
    url: string;
    method: 'post' | 'delete';
};

export type Stats = {
    tailors_active: number;
    hancaan_total: number;
    assignments_active: number;
    completed_today_qty: number;
    running_wage_estimate: number;
};

export type Tailor = {
    id: number;
    code?: string | null;
    name: string;
    whatsapp_number?: string | null;
    address?: string | null;
    joined_at?: string | null;
    notes?: string | null;
    is_active?: boolean;
};

export type WorkType = {
    id: number;
    code?: string | null;
    name: string;
    category?: string;
    unit?: string;
    rate_amount?: number;
    notes?: string | null;
    is_active?: boolean;
};

export type SelectOption = { value: string; label: string };

export type Article = {
    id: number;
    work_type_id: number;
    article_name: string;
    color: string | null;
    size: string | null;
    planned_qty: number;
    available_qty: number;
    assigned_qty: number;
    completed_qty: number;
    status: string;
    status_label: string;
    work_type_name: string;
    rate_amount: number;
};

export type Assignment = {
    id: number;
    tailor_id: number;
    production_article_id: number;
    tailor_name: string;
    article_name: string;
    color: string | null;
    size: string | null;
    work_type_name: string;
    assigned_qty: number;
    completed_qty: number;
    remaining_qty: number;
    unit_rate_amount: number;
    running_subtotal: number;
    status: string;
    status_label: string;
    assigned_at: string | null;
    age_days: number | null;
    notes: string | null;
    can_cancel: boolean;
};

export type Completion = {
    id: number;
    tailor_assignment_id: number;
    tailor_id: number;
    tailor_name: string;
    article_name: string;
    color: string | null;
    size: string | null;
    work_type_name: string;
    completed_qty: number;
    unit_rate_amount: number;
    subtotal_amount: number;
    completed_at: string | null;
    notes: string | null;
    can_undo: boolean;
};

export type CurrentPeriodSummary = {
    starts_at: string;
    ends_at: string;
    days_left: number;
    status: string | null;
    status_label: string | null;
    is_locked: boolean;
    completed_qty: number;
    wage_amount: number;
    tailors: { tailor_id: number; completed_qty: number; wage_amount: number }[];
};

export type HancaanSuggestions = {
    articles: { name: string; work_type_id: number }[];
    colors: string[];
    sizes: string[];
};

export type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    role_label: string;
    is_current_user: boolean;
    created_at: string | null;
};

export type PayrollPeriod = {
    id: number;
    code: string;
    starts_at: string;
    ends_at: string;
    status: string;
    status_label: string;
    total_tailors: number;
    total_completed_qty: number;
    total_amount: number;
    slips_count: number;
    generated_at: string | null;
};

export type PayrollSlipSummary = {
    id: number;
    tailor_name: string;
    period_code: string;
    completed_qty: number;
    gross_amount: number;
    bonus_amount: number;
    deduction_amount: number;
    net_amount?: number;
    status: string;
    status_label: string;
    period_status: string;
    whatsapp_url: string | null;
    public_url: string;
    notes: string | null;
    can_update_adjustment: boolean;
    can_mark_paid: boolean;
    sent_at: string | null;
    paid_at: string | null;
};
