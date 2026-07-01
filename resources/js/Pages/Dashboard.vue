<script setup lang="ts">
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Separator } from '@/Components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Textarea } from '@/Components/ui/textarea';
import { Head, useForm } from '@inertiajs/vue3';
import { CircleCheck, ClipboardCheck, ExternalLink, Gauge, MessageCircle, PackageCheck, PackagePlus, Plus, Scissors, Shirt, TrendingUp, UserCog, UserPlus, WalletCards } from '@lucide/vue';
import { computed, reactive, ref, watch } from 'vue';

type StatProps = {
    tailors_active: number;
    hancaan_total: number;
    assignments_active: number;
    completed_today_qty: number;
    running_wage_estimate: number;
};

type Option = {
    id: number;
    code?: string | null;
    name: string;
    whatsapp_number?: string | null;
    category?: string;
    unit?: string;
    rate_amount?: number;
    address?: string | null;
    joined_at?: string | null;
    notes?: string | null;
    is_active?: boolean;
};

type Category = { value: string; label: string };
type UserRoleOption = { value: string; label: string };

type Article = {
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

type Assignment = {
    id: number;
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
};

type Completion = {
    id: number;
    tailor_name: string;
    article_name: string;
    color: string | null;
    size: string | null;
    work_type_name: string;
    completed_qty: number;
    unit_rate_amount: number;
    subtotal_amount: number;
    completed_at: string | null;
};

type ManagedUser = {
    id: number;
    name: string;
    email: string;
    role: string;
    role_label: string;
    is_current_user: boolean;
    created_at: string | null;
};

type PayrollPeriod = {
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

type PayrollSlipSummary = {
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


const props = defineProps<{
    stats: StatProps;
    tailors: Option[];
    users: ManagedUser[];
    workTypes: Option[];
    workTypeCategories: Category[];
    userRoles: UserRoleOption[];
    availableArticles: Article[];
    activeAssignments: Assignment[];
    recentCompletions: Completion[];
    payrollPeriods: PayrollPeriod[];
    payrollSlips: PayrollSlipSummary[];
}>();

const tailorForm = useForm({ code: '', name: '', whatsapp_number: '', address: '', joined_at: '', notes: '' });
const tailorEditForm = useForm({ code: '', name: '', whatsapp_number: '', address: '', joined_at: '', notes: '' });
const activeTailorEditId = ref<number | null>(null);
const userForm = useForm({ name: '', email: '', role: 'admin', password: '', password_confirmation: '' });
const userRoleForm = useForm({ role: '' });
const userPasswordForm = useForm({ password: '', password_confirmation: '' });
const selectedRoleByUser = reactive<Record<number, string>>({});
const passwordByUser = reactive<Record<number, string>>({});
const passwordConfirmationByUser = reactive<Record<number, string>>({});
const activeRoleUserId = ref<number | null>(null);
const activePasswordUserId = ref<number | null>(null);
const workTypeForm = useForm({ code: '', name: '', category: 'regular', unit: 'pcs', rate_amount: '', notes: '' });
const workTypeEditForm = useForm({ code: '', name: '', category: 'regular', unit: 'pcs', rate_amount: '', notes: '' });
const activeWorkTypeEditId = ref<number | null>(null);
const hancaanForm = useForm({ work_type_id: '', article_name: '', color: '', size: '', planned_qty: '', ready_at: '', notes: '' });
const hancaanEditForm = useForm({ work_type_id: '', article_name: '', color: '', size: '', planned_qty: '', ready_at: '', notes: '' });
const activeHancaanEditId = ref<number | null>(null);
const hancaanActionForm = useForm({ production_article_id: '' });
const activeHancaanActionId = ref<number | null>(null);
const assignmentForm = useForm({ tailor_id: '', production_article_id: '', assigned_qty: '', assigned_at: '', due_at: '', notes: '' });
const completionForm = useForm({ tailor_assignment_id: '', completed_qty: '', completed_at: '', notes: '' });
const payrollPeriodForm = useForm({ starts_at: '', ends_at: '', notes: '' });
const slipActionForm = useForm({});
const slipAdjustmentForm = useForm({ bonus_amount: '', deduction_amount: '', notes: '' });
const activeSlipActionId = ref<number | null>(null);
const activeSlipAdjustmentId = ref<number | null>(null);
const monitoringSearch = ref('');
const slipSearch = ref('');

const activeTailorOptions = computed(() => props.tailors.filter((tailor) => tailor.is_active !== false));
const activeWorkTypeOptions = computed(() => props.workTypes.filter((workType) => workType.is_active !== false));
const activeAssignmentOptions = computed(() => props.activeAssignments.filter((assignment) => assignment.remaining_qty > 0));
const totalAvailableQty = computed(() => props.availableArticles.reduce((total, article) => total + article.available_qty, 0));
const completionQueueQty = computed(() => props.activeAssignments.reduce((total, assignment) => total + assignment.remaining_qty, 0));
const filteredActiveAssignments = computed(() => {
    const query = monitoringSearch.value.trim().toLowerCase();

    if (!query) return props.activeAssignments;

    return props.activeAssignments.filter((assignment) => [
        assignment.tailor_name,
        assignment.article_name,
        assignment.color,
        assignment.size,
        assignment.work_type_name,
        assignment.status_label,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
});
const filteredPayrollSlips = computed(() => {
    const query = slipSearch.value.trim().toLowerCase();

    if (!query) return props.payrollSlips;

    return props.payrollSlips.filter((slip) => [
        slip.tailor_name,
        slip.period_code,
        slip.status_label,
    ].filter(Boolean).join(' ').toLowerCase().includes(query));
});

watch(() => props.users, (users) => {
    users.forEach((user) => {
        selectedRoleByUser[user.id] = user.role;
    });
}, { immediate: true });

const formatIdr = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

const hancaanLabel = (article: Article) => [article.article_name, article.color, article.size].filter(Boolean).join(' / ');
const assignmentLabel = (assignment: Assignment) => `${assignment.tailor_name} - ${assignment.article_name} (${assignment.remaining_qty} sisa)`;
const assignmentMeta = (assignment: Assignment) => [assignment.color, assignment.size, assignment.work_type_name].filter(Boolean).join(' / ');
const progressPercent = (assignment: Assignment) => Math.min(100, Math.round((assignment.completed_qty / Math.max(assignment.assigned_qty, 1)) * 100));

const submitTailor = () => tailorForm.post(route('tailors.store'), { preserveScroll: true, onSuccess: () => tailorForm.reset() });
const beginTailorEdit = (tailor: Option) => {
    activeTailorEditId.value = tailor.id;
    tailorEditForm.code = tailor.code ?? '';
    tailorEditForm.name = tailor.name;
    tailorEditForm.whatsapp_number = tailor.whatsapp_number ?? '';
    tailorEditForm.address = tailor.address ?? '';
    tailorEditForm.joined_at = tailor.joined_at ?? '';
    tailorEditForm.notes = tailor.notes ?? '';
};
const submitTailorUpdate = (tailor: Option) => tailorEditForm.patch(route('tailors.update', tailor.id), {
    preserveScroll: true,
    onSuccess: () => { activeTailorEditId.value = null; },
});
const toggleTailorStatus = (tailor: Option) => {
    const routeName = tailor.is_active === false ? 'tailors.activate' : 'tailors.deactivate';
    tailorEditForm.post(route(routeName, tailor.id), { preserveScroll: true });
};
const submitUser = () => userForm.post(route('users.store'), { preserveScroll: true, onSuccess: () => userForm.reset('name', 'email', 'password', 'password_confirmation') });
const submitUserRole = (user: ManagedUser) => {
    activeRoleUserId.value = user.id;
    userRoleForm.role = selectedRoleByUser[user.id] ?? user.role;
    userRoleForm.patch(route('users.role.update', user.id), { preserveScroll: true });
};
const submitUserPassword = (user: ManagedUser) => {
    activePasswordUserId.value = user.id;
    userPasswordForm.password = passwordByUser[user.id] ?? '';
    userPasswordForm.password_confirmation = passwordConfirmationByUser[user.id] ?? '';
    userPasswordForm.patch(route('users.password.update', user.id), {
        preserveScroll: true,
        onSuccess: () => {
            passwordByUser[user.id] = '';
            passwordConfirmationByUser[user.id] = '';
            userPasswordForm.reset();
        },
    });
};
const submitWorkType = () => workTypeForm.post(route('work-types.store'), { preserveScroll: true, onSuccess: () => workTypeForm.reset('code', 'name', 'rate_amount', 'notes') });
const beginWorkTypeEdit = (workType: Option) => {
    activeWorkTypeEditId.value = workType.id;
    workTypeEditForm.code = workType.code ?? '';
    workTypeEditForm.name = workType.name;
    workTypeEditForm.category = workType.category ?? 'regular';
    workTypeEditForm.unit = workType.unit ?? 'pcs';
    workTypeEditForm.rate_amount = String(workType.rate_amount ?? '');
    workTypeEditForm.notes = workType.notes ?? '';
};
const submitWorkTypeUpdate = (workType: Option) => workTypeEditForm.patch(route('work-types.update', workType.id), {
    preserveScroll: true,
    onSuccess: () => { activeWorkTypeEditId.value = null; },
});
const toggleWorkTypeStatus = (workType: Option) => {
    const routeName = workType.is_active === false ? 'work-types.activate' : 'work-types.deactivate';
    workTypeEditForm.post(route(routeName, workType.id), { preserveScroll: true });
};
const submitHancaan = () => hancaanForm.post(route('hancaan.store'), { preserveScroll: true, onSuccess: () => hancaanForm.reset() });
const beginHancaanEdit = (article: Article) => {
    activeHancaanEditId.value = article.id;
    hancaanEditForm.work_type_id = String(article.work_type_id);
    hancaanEditForm.article_name = article.article_name;
    hancaanEditForm.color = article.color ?? '';
    hancaanEditForm.size = article.size ?? '';
    hancaanEditForm.planned_qty = String(article.planned_qty);
    hancaanEditForm.ready_at = '';
    hancaanEditForm.notes = '';
};
const submitHancaanUpdate = (article: Article) => hancaanEditForm.patch(route('hancaan.update', article.id), {
    preserveScroll: true,
    onSuccess: () => { activeHancaanEditId.value = null; },
});
const cancelHancaan = (article: Article) => {
    activeHancaanActionId.value = article.id;
    hancaanActionForm.post(route('hancaan.cancel', article.id), { preserveScroll: true });
};
const submitAssignment = () => assignmentForm.post(route('assignments.store'), { preserveScroll: true, onSuccess: () => assignmentForm.reset() });
const submitCompletion = () => {
    if (!completionForm.tailor_assignment_id) return;

    completionForm.post(route('assignments.completions.store', completionForm.tailor_assignment_id), {
        preserveScroll: true,
        onSuccess: () => completionForm.reset(),
    });
};

const submitPayrollPeriod = () => payrollPeriodForm.post(route('payroll-periods.store'), {
    preserveScroll: true,
    onSuccess: () => payrollPeriodForm.reset(),
});

const generatePayroll = (period: PayrollPeriod) => payrollPeriodForm.post(route('payroll-periods.generate', period.id), {
    preserveScroll: true,
});

const lockPayroll = (period: PayrollPeriod) => payrollPeriodForm.post(route('payroll-periods.lock', period.id), {
    preserveScroll: true,
});

const markSlipPaid = (slip: PayrollSlipSummary) => {
    activeSlipActionId.value = slip.id;
    slipActionForm.post(route('payroll-slips.paid', slip.id), { preserveScroll: true });
};

const beginSlipAdjustment = (slip: PayrollSlipSummary) => {
    activeSlipAdjustmentId.value = slip.id;
    slipAdjustmentForm.bonus_amount = String(slip.bonus_amount ?? 0);
    slipAdjustmentForm.deduction_amount = String(slip.deduction_amount ?? 0);
    slipAdjustmentForm.notes = slip.notes ?? '';
};

const submitSlipAdjustment = (slip: PayrollSlipSummary) => slipAdjustmentForm.patch(route('payroll-slips.adjustment.update', slip.id), {
    preserveScroll: true,
    onSuccess: () => { activeSlipAdjustmentId.value = null; },
});
</script>

<template>
    <Head title="Dashboard Hancaan" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="flex flex-col gap-1">
                    <p class="text-sm font-medium text-muted-foreground">Pendataan Gajian Penjahit</p>
                    <h2 class="text-2xl font-semibold tracking-normal text-foreground">Dashboard Hancaan</h2>
                </div>
                <div class="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm text-muted-foreground">
                    <TrendingUp data-icon="inline-start" />
                    <span>{{ stats.assignments_active }} aktif</span>
                    <Separator orientation="vertical" class="h-4" />
                    <span>{{ stats.completed_today_qty }} pcs selesai hari ini</span>
                </div>
            </div>
        </template>

        <div class="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
            <section class="grid grid-cols-2 gap-3 xl:grid-cols-5">
                <Card class="border-primary/10">
                    <CardHeader class="gap-3 pb-4">
                        <div class="flex items-center justify-between gap-3">
                            <CardDescription>Penjahit Aktif</CardDescription>
                            <div class="rounded-md bg-[hsl(var(--chart-2)/0.14)] p-2 text-[hsl(var(--chart-2))]"><Scissors data-icon="inline-start" /></div>
                        </div>
                        <CardTitle class="text-3xl">{{ stats.tailors_active }}</CardTitle>
                    </CardHeader>
                </Card>
                <Card class="border-primary/10">
                    <CardHeader class="gap-3 pb-4">
                        <div class="flex items-center justify-between gap-3">
                            <CardDescription>Siap Diambil</CardDescription>
                            <div class="rounded-md bg-[hsl(var(--chart-1)/0.14)] p-2 text-[hsl(var(--chart-1))]"><Shirt data-icon="inline-start" /></div>
                        </div>
                        <CardTitle class="text-3xl">{{ totalAvailableQty }}</CardTitle>
                        <p class="text-xs text-muted-foreground">{{ availableArticles.length }} hancaan tersedia</p>
                    </CardHeader>
                </Card>
                <Card class="border-primary/10">
                    <CardHeader class="gap-3 pb-4">
                        <div class="flex items-center justify-between gap-3">
                            <CardDescription>Sedang Dikerjakan</CardDescription>
                            <div class="rounded-md bg-[hsl(var(--chart-3)/0.14)] p-2 text-[hsl(var(--chart-3))]"><Gauge data-icon="inline-start" /></div>
                        </div>
                        <CardTitle class="text-3xl">{{ stats.assignments_active }}</CardTitle>
                        <p class="text-xs text-muted-foreground">{{ completionQueueQty }} pcs belum selesai</p>
                    </CardHeader>
                </Card>
                <Card class="border-primary/10">
                    <CardHeader class="gap-3 pb-4">
                        <CardDescription>Selesai Hari Ini</CardDescription>
                        <CardTitle class="text-3xl">{{ stats.completed_today_qty }}</CardTitle>
                        <p class="text-xs text-muted-foreground">masuk riwayat gajian</p>
                    </CardHeader>
                </Card>
                <Card class="col-span-2 border-primary/10 xl:col-span-1">
                    <CardHeader class="gap-3 pb-4">
                        <CardDescription>Estimasi Gaji Berjalan</CardDescription>
                        <CardTitle class="text-xl">{{ formatIdr(stats.running_wage_estimate) }}</CardTitle>
                        <p class="text-xs text-muted-foreground">dari qty selesai</p>
                    </CardHeader>
                </Card>
            </section>

            <section class="hidden gap-3 md:grid lg:grid-cols-3">
                <div class="rounded-lg border bg-card p-4">
                    <div class="flex items-start gap-3">
                        <div class="rounded-md bg-muted p-2 text-foreground"><PackagePlus data-icon="inline-start" /></div>
                        <div class="flex flex-col gap-1">
                            <p class="text-sm font-semibold">1. Siapkan hancaan</p>
                            <p class="text-sm text-muted-foreground">Input artikel, warna, size, qty, dan tarif kerja.</p>
                        </div>
                    </div>
                </div>
                <div class="rounded-lg border bg-card p-4">
                    <div class="flex items-start gap-3">
                        <div class="rounded-md bg-muted p-2 text-foreground"><Scissors data-icon="inline-start" /></div>
                        <div class="flex flex-col gap-1">
                            <p class="text-sm font-semibold">2. Penjahit ambil</p>
                            <p class="text-sm text-muted-foreground">Qty tersedia dikurangi otomatis dan tarif disnapshot.</p>
                        </div>
                    </div>
                </div>
                <div class="rounded-lg border bg-card p-4">
                    <div class="flex items-start gap-3">
                        <div class="rounded-md bg-muted p-2 text-foreground"><ClipboardCheck data-icon="inline-start" /></div>
                        <div class="flex flex-col gap-1">
                            <p class="text-sm font-semibold">3. Catat selesai</p>
                            <p class="text-sm text-muted-foreground">Bisa dicicil, riwayatnya aman untuk gajian 2 minggu.</p>
                        </div>
                    </div>
                </div>
            </section>

            <Tabs default-value="operasional" orientation="horizontal" class="flex flex-col gap-4">
                <TabsList class="grid h-auto w-full grid-cols-4 p-1 md:w-fit">
                    <TabsTrigger value="operasional" class="py-2">Operasional</TabsTrigger>
                    <TabsTrigger value="master" class="py-2">Master Data</TabsTrigger>
                    <TabsTrigger value="gajian" class="py-2">Gajian</TabsTrigger>
                    <TabsTrigger value="monitoring" class="py-2">Monitoring</TabsTrigger>
                </TabsList>

                <TabsContent value="operasional" class="flex flex-col gap-4">
                    <section class="grid gap-4 lg:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle class="text-base">Pengambilan Hancaan</CardTitle>
                                <CardDescription>Pilih hancaan siap, penjahit, dan qty diambil.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form class="flex flex-col gap-4" @submit.prevent="submitAssignment">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="assign-article">Hancaan</label>
                                        <Select v-model="assignmentForm.production_article_id">
                                            <SelectTrigger id="assign-article" class="w-full"><SelectValue placeholder="Pilih hancaan" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem v-for="article in availableArticles" :key="article.id" :value="String(article.id)">
                                                        {{ hancaanLabel(article) }} - {{ article.available_qty }} tersedia
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <p v-if="assignmentForm.errors.production_article_id" class="text-sm text-destructive">{{ assignmentForm.errors.production_article_id }}</p>
                                    </div>
                                    <div class="grid gap-3 sm:grid-cols-2">
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-sm font-medium" for="assign-tailor">Penjahit</label>
                                            <Select v-model="assignmentForm.tailor_id">
                                                <SelectTrigger id="assign-tailor" class="w-full"><SelectValue placeholder="Pilih penjahit" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectGroup>
                                                        <SelectItem v-for="tailor in activeTailorOptions" :key="tailor.id" :value="String(tailor.id)">{{ tailor.name }}</SelectItem>
                                                    </SelectGroup>
                                                </SelectContent>
                                            </Select>
                                            <p v-if="assignmentForm.errors.tailor_id" class="text-sm text-destructive">{{ assignmentForm.errors.tailor_id }}</p>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-sm font-medium" for="assign-qty">Qty Diambil</label>
                                            <Input id="assign-qty" v-model="assignmentForm.assigned_qty" aria-label="Qty diambil" inputmode="numeric" min="1" type="number" />
                                            <p v-if="assignmentForm.errors.assigned_qty" class="text-sm text-destructive">{{ assignmentForm.errors.assigned_qty }}</p>
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="assign-notes">Catatan</label>
                                        <Textarea id="assign-notes" v-model="assignmentForm.notes" aria-label="Catatan pengambilan" rows="2" />
                                    </div>
                                    <Button class="w-full sm:w-fit" :disabled="assignmentForm.processing || !availableArticles.length" type="submit">
                                        <Scissors data-icon="inline-start" />
                                        Ambil Hancaan
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle class="text-base">Catat Selesai</CardTitle>
                                <CardDescription>Input cicilan qty selesai untuk dasar gajian.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <form class="flex flex-col gap-4" @submit.prevent="submitCompletion">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="complete-assignment">Pekerjaan Aktif</label>
                                        <Select v-model="completionForm.tailor_assignment_id">
                                            <SelectTrigger id="complete-assignment" class="w-full"><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem v-for="assignment in activeAssignmentOptions" :key="assignment.id" :value="String(assignment.id)">
                                                        {{ assignmentLabel(assignment) }}
                                                    </SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div class="grid gap-3 sm:grid-cols-2">
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-sm font-medium" for="complete-qty">Qty Selesai</label>
                                            <Input id="complete-qty" v-model="completionForm.completed_qty" aria-label="Qty selesai" inputmode="numeric" min="1" type="number" />
                                            <p v-if="completionForm.errors.completed_qty" class="text-sm text-destructive">{{ completionForm.errors.completed_qty }}</p>
                                        </div>
                                        <div class="flex flex-col gap-1.5">
                                            <label class="text-sm font-medium" for="complete-date">Tanggal</label>
                                            <Input id="complete-date" v-model="completionForm.completed_at" aria-label="Tanggal selesai" type="datetime-local" />
                                        </div>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="complete-notes">Catatan</label>
                                        <Textarea id="complete-notes" v-model="completionForm.notes" aria-label="Catatan selesai" rows="2" />
                                    </div>
                                    <Button class="w-full sm:w-fit" :disabled="completionForm.processing || !activeAssignmentOptions.length" type="submit">
                                        <ClipboardCheck data-icon="inline-start" />
                                        Catat Selesai
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </section>

                    <section class="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                        <Card>
                            <CardHeader>
                                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                    <div>
                                        <CardTitle class="text-base">Pekerjaan Berjalan</CardTitle>
                                        <CardDescription>{{ completionQueueQty }} pcs masih perlu diselesaikan.</CardDescription>
                                    </div>
                                    <Badge variant="secondary">{{ activeAssignments.length }} pekerjaan</Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div v-if="!activeAssignments.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada hancaan yang sedang dikerjakan.</div>
                                <div v-else class="grid gap-3">
                                    <article v-for="assignment in activeAssignments" :key="assignment.id" class="rounded-lg border bg-background p-4">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0 flex flex-col gap-1">
                                                <div class="flex flex-wrap items-center gap-2">
                                                    <h3 class="font-semibold">{{ assignment.tailor_name }}</h3>
                                                    <Badge variant="outline">{{ assignment.status_label }}</Badge>
                                                </div>
                                                <p class="truncate text-sm text-muted-foreground">{{ assignment.article_name }} - {{ assignmentMeta(assignment) }}</p>
                                            </div>
                                            <p class="shrink-0 text-sm font-semibold">{{ formatIdr(assignment.running_subtotal) }}</p>
                                        </div>
                                        <div class="mt-4 flex flex-col gap-2">
                                            <div class="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{{ assignment.completed_qty }} dari {{ assignment.assigned_qty }} pcs</span>
                                                <span>{{ assignment.remaining_qty }} sisa</span>
                                            </div>
                                            <div class="h-2 overflow-hidden rounded-full bg-muted">
                                                <div class="h-full rounded-full bg-primary" :style="{ width: `${progressPercent(assignment)}%` }" />
                                            </div>
                                        </div>
                                    </article>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle class="text-base">Hancaan Siap</CardTitle>
                                <CardDescription>{{ availableArticles.length }} artikel masih bisa diambil.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div v-if="!availableArticles.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada hancaan siap diambil.</div>
                                <div v-else class="flex flex-col gap-2">
                                    <article v-for="article in availableArticles.slice(0, 6)" :key="article.id" class="rounded-lg border p-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0">
                                                <p class="truncate text-sm font-medium">{{ article.article_name }}</p>
                                                <p class="text-xs text-muted-foreground">{{ [article.color, article.size, article.work_type_name].filter(Boolean).join(' / ') }}</p>
                                            </div>
                                            <Badge variant="secondary">{{ article.available_qty }} pcs</Badge>
                                        </div>
                                    </article>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                </TabsContent>

                <TabsContent value="master" class="grid gap-4 xl:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base"><UserPlus data-icon="inline-start" />Penjahit</CardTitle>
                            <CardDescription>Master internal penjahit.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-4">
                            <form class="flex flex-col gap-3" @submit.prevent="submitTailor">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="tailor-code">Kode</label>
                                    <Input id="tailor-code" v-model="tailorForm.code" aria-label="Kode penjahit" placeholder="PNJ-001" />
                                    <p v-if="tailorForm.errors.code" class="text-sm text-destructive">{{ tailorForm.errors.code }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="tailor-name">Nama</label>
                                    <Input id="tailor-name" v-model="tailorForm.name" aria-label="Nama penjahit" placeholder="Nama penjahit" />
                                    <p v-if="tailorForm.errors.name" class="text-sm text-destructive">{{ tailorForm.errors.name }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="tailor-wa">WhatsApp</label>
                                    <Input id="tailor-wa" v-model="tailorForm.whatsapp_number" aria-label="Nomor WhatsApp" placeholder="62812..." />
                                </div>
                                <Button :disabled="tailorForm.processing" type="submit"><Plus data-icon="inline-start" />Simpan Penjahit</Button>
                            </form>
                            <div class="flex flex-col gap-2">
                                <article v-for="tailor in tailors" :key="tailor.id" class="rounded-lg border p-3">
                                    <div v-if="activeTailorEditId !== tailor.id" class="flex flex-col gap-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0">
                                                <p class="truncate text-sm font-medium">{{ tailor.name }}</p>
                                                <p class="truncate text-xs text-muted-foreground">{{ tailor.code }} / {{ tailor.whatsapp_number || 'Tanpa WA' }}</p>
                                            </div>
                                            <Badge :variant="tailor.is_active === false ? 'outline' : 'secondary'">{{ tailor.is_active === false ? 'Nonaktif' : 'Aktif' }}</Badge>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" @click="beginTailorEdit(tailor)">Edit</Button>
                                            <Button size="sm" variant="outline" :disabled="tailorEditForm.processing" @click="toggleTailorStatus(tailor)">{{ tailor.is_active === false ? 'Aktifkan' : 'Nonaktifkan' }}</Button>
                                        </div>
                                    </div>
                                    <form v-else class="flex flex-col gap-3" @submit.prevent="submitTailorUpdate(tailor)">
                                        <div class="grid gap-2 sm:grid-cols-2">
                                            <Input v-model="tailorEditForm.code" aria-label="Edit kode penjahit" />
                                            <Input v-model="tailorEditForm.name" aria-label="Edit nama penjahit" />
                                            <Input v-model="tailorEditForm.whatsapp_number" aria-label="Edit WhatsApp penjahit" />
                                            <Input v-model="tailorEditForm.joined_at" aria-label="Edit tanggal masuk penjahit" type="date" />
                                        </div>
                                        <Textarea v-model="tailorEditForm.notes" aria-label="Edit catatan penjahit" rows="2" />
                                        <p v-if="tailorEditForm.errors.code" class="text-xs text-destructive">{{ tailorEditForm.errors.code }}</p>
                                        <p v-if="tailorEditForm.errors.name" class="text-xs text-destructive">{{ tailorEditForm.errors.name }}</p>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" :disabled="tailorEditForm.processing" type="submit">Simpan</Button>
                                            <Button size="sm" variant="outline" type="button" @click="activeTailorEditId = null">Batal</Button>
                                        </div>
                                    </form>
                                </article>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base"><UserCog data-icon="inline-start" />Akun Pengguna</CardTitle>
                            <CardDescription>Buat akun admin lapangan atau superadmin.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-4">
                            <form class="flex flex-col gap-3" @submit.prevent="submitUser">
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="user-name">Nama</label>
                                        <Input id="user-name" v-model="userForm.name" autocomplete="off" placeholder="Nama admin" />
                                        <p v-if="userForm.errors.name" class="text-sm text-destructive">{{ userForm.errors.name }}</p>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="user-email">Email</label>
                                        <Input id="user-email" v-model="userForm.email" autocomplete="off" placeholder="admin@email.com" type="email" />
                                        <p v-if="userForm.errors.email" class="text-sm text-destructive">{{ userForm.errors.email }}</p>
                                    </div>
                                </div>
                                <div class="grid gap-3 sm:grid-cols-3">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="user-role">Role</label>
                                        <Select v-model="userForm.role">
                                            <SelectTrigger id="user-role" class="w-full"><SelectValue placeholder="Pilih role" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem v-for="role in userRoles" :key="role.value" :value="role.value">{{ role.label }}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                        <p v-if="userForm.errors.role" class="text-sm text-destructive">{{ userForm.errors.role }}</p>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="user-password">Password</label>
                                        <Input id="user-password" v-model="userForm.password" autocomplete="new-password" type="password" />
                                        <p v-if="userForm.errors.password" class="text-sm text-destructive">{{ userForm.errors.password }}</p>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="user-password-confirmation">Konfirmasi</label>
                                        <Input id="user-password-confirmation" v-model="userForm.password_confirmation" autocomplete="new-password" type="password" />
                                    </div>
                                </div>
                                <Button :disabled="userForm.processing" type="submit"><Plus data-icon="inline-start" />Simpan Akun</Button>
                            </form>

                            <div class="flex flex-col gap-2">
                                <article v-for="user in users" :key="user.id" class="rounded-lg border p-3">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <p class="truncate text-sm font-medium">{{ user.name }}</p>
                                                <Badge v-if="user.is_current_user" variant="outline">Anda</Badge>
                                            </div>
                                            <p class="truncate text-xs text-muted-foreground">{{ user.email }}</p>
                                        </div>
                                        <Badge variant="secondary">{{ user.role_label }}</Badge>
                                    </div>

                                    <div class="mt-3 grid gap-3 lg:grid-cols-2">
                                        <form class="flex flex-col gap-2" @submit.prevent="submitUserRole(user)">
                                            <label class="text-xs font-medium text-muted-foreground" :for="`user-role-${user.id}`">Role</label>
                                            <div class="flex gap-2">
                                                <Select v-model="selectedRoleByUser[user.id]" :disabled="user.is_current_user">
                                                    <SelectTrigger :id="`user-role-${user.id}`" class="w-full">
                                                        <SelectValue placeholder="Pilih role" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectGroup>
                                                            <SelectItem v-for="role in userRoles" :key="role.value" :value="role.value">{{ role.label }}</SelectItem>
                                                        </SelectGroup>
                                                    </SelectContent>
                                                </Select>
                                                <Button size="sm" variant="outline" :disabled="user.is_current_user || userRoleForm.processing" type="submit">Ubah</Button>
                                            </div>
                                            <p v-if="activeRoleUserId === user.id && userRoleForm.errors.role" class="text-xs text-destructive">{{ userRoleForm.errors.role }}</p>
                                        </form>

                                        <form class="flex flex-col gap-2" @submit.prevent="submitUserPassword(user)">
                                            <label class="text-xs font-medium text-muted-foreground" :for="`user-password-${user.id}`">Reset Password</label>
                                            <div class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] lg:grid-cols-1 xl:grid-cols-[1fr_1fr_auto]">
                                                <Input :id="`user-password-${user.id}`" v-model="passwordByUser[user.id]" autocomplete="new-password" placeholder="Password baru" type="password" />
                                                <Input v-model="passwordConfirmationByUser[user.id]" autocomplete="new-password" placeholder="Konfirmasi" type="password" />
                                                <Button size="sm" :disabled="userPasswordForm.processing" type="submit">Reset</Button>
                                            </div>
                                            <p v-if="activePasswordUserId === user.id && userPasswordForm.errors.password" class="text-xs text-destructive">{{ userPasswordForm.errors.password }}</p>
                                        </form>
                                    </div>
                                </article>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base"><WalletCards data-icon="inline-start" />Tarif Kerja</CardTitle>
                            <CardDescription>Harga per pekerjaan, termasuk revisi.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-4">
                            <form class="flex flex-col gap-3" @submit.prevent="submitWorkType">
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="work-code">Kode</label>
                                        <Input id="work-code" v-model="workTypeForm.code" aria-label="Kode tarif" placeholder="JK-001" />
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="work-category">Kategori</label>
                                        <Select v-model="workTypeForm.category">
                                            <SelectTrigger id="work-category" class="w-full"><SelectValue placeholder="Kategori" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectGroup>
                                                    <SelectItem v-for="category in workTypeCategories" :key="category.value" :value="category.value">{{ category.label }}</SelectItem>
                                                </SelectGroup>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="work-name">Nama Pekerjaan</label>
                                    <Input id="work-name" v-model="workTypeForm.name" aria-label="Nama pekerjaan" placeholder="Jahit kemeja" />
                                    <p v-if="workTypeForm.errors.name" class="text-sm text-destructive">{{ workTypeForm.errors.name }}</p>
                                </div>
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="work-rate">Tarif</label>
                                        <Input id="work-rate" v-model="workTypeForm.rate_amount" aria-label="Tarif" inputmode="numeric" min="0" type="number" placeholder="5000" />
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="work-unit">Unit</label>
                                        <Input id="work-unit" v-model="workTypeForm.unit" aria-label="Unit" placeholder="pcs" />
                                    </div>
                                </div>
                                <Button :disabled="workTypeForm.processing" type="submit"><Plus data-icon="inline-start" />Simpan Tarif</Button>
                            </form>
                            <div class="flex flex-col gap-2">
                                <article v-for="workType in workTypes" :key="workType.id" class="rounded-lg border p-3">
                                    <div v-if="activeWorkTypeEditId !== workType.id" class="flex flex-col gap-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0">
                                                <p class="truncate text-sm font-medium">{{ workType.name }}</p>
                                                <p class="truncate text-xs text-muted-foreground">{{ workType.code || 'Tanpa kode' }} / {{ formatIdr(workType.rate_amount ?? 0) }} per {{ workType.unit }}</p>
                                            </div>
                                            <Badge :variant="workType.is_active === false ? 'outline' : 'secondary'">{{ workType.is_active === false ? 'Nonaktif' : 'Aktif' }}</Badge>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" @click="beginWorkTypeEdit(workType)">Edit</Button>
                                            <Button size="sm" variant="outline" :disabled="workTypeEditForm.processing" @click="toggleWorkTypeStatus(workType)">{{ workType.is_active === false ? 'Aktifkan' : 'Nonaktifkan' }}</Button>
                                        </div>
                                    </div>
                                    <form v-else class="flex flex-col gap-3" @submit.prevent="submitWorkTypeUpdate(workType)">
                                        <div class="grid gap-2 sm:grid-cols-2">
                                            <Input v-model="workTypeEditForm.code" aria-label="Edit kode tarif" />
                                            <Input v-model="workTypeEditForm.name" aria-label="Edit nama tarif" />
                                            <Select v-model="workTypeEditForm.category">
                                                <SelectTrigger class="w-full"><SelectValue placeholder="Kategori" /></SelectTrigger>
                                                <SelectContent><SelectGroup><SelectItem v-for="category in workTypeCategories" :key="category.value" :value="category.value">{{ category.label }}</SelectItem></SelectGroup></SelectContent>
                                            </Select>
                                            <Input v-model="workTypeEditForm.rate_amount" aria-label="Edit tarif" inputmode="numeric" type="number" />
                                            <Input v-model="workTypeEditForm.unit" aria-label="Edit unit tarif" />
                                        </div>
                                        <Textarea v-model="workTypeEditForm.notes" aria-label="Edit catatan tarif" rows="2" />
                                        <p v-if="workTypeEditForm.errors.name" class="text-xs text-destructive">{{ workTypeEditForm.errors.name }}</p>
                                        <p v-if="workTypeEditForm.errors.rate_amount" class="text-xs text-destructive">{{ workTypeEditForm.errors.rate_amount }}</p>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" :disabled="workTypeEditForm.processing" type="submit">Simpan</Button>
                                            <Button size="sm" variant="outline" type="button" @click="activeWorkTypeEditId = null">Batal</Button>
                                        </div>
                                    </form>
                                </article>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base"><PackagePlus data-icon="inline-start" />Hancaan Baru</CardTitle>
                            <CardDescription>Artikel, warna, size, dan qty siap jahit.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-4">
                            <form class="flex flex-col gap-3" @submit.prevent="submitHancaan">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="hancaan-work">Tarif Kerja</label>
                                    <Select v-model="hancaanForm.work_type_id">
                                        <SelectTrigger id="hancaan-work" class="w-full"><SelectValue placeholder="Pilih tarif" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="workType in activeWorkTypeOptions" :key="workType.id" :value="String(workType.id)">
                                                    {{ workType.name }} - {{ formatIdr(workType.rate_amount ?? 0) }}
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="hancaanForm.errors.work_type_id" class="text-sm text-destructive">{{ hancaanForm.errors.work_type_id }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="article-name">Nama Artikel</label>
                                    <Input id="article-name" v-model="hancaanForm.article_name" aria-label="Nama artikel" placeholder="Kemeja Oxford" />
                                </div>
                                <div class="grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                                    <div class="flex flex-col gap-1.5"><label class="text-sm font-medium" for="article-color">Warna</label><Input id="article-color" v-model="hancaanForm.color" aria-label="Warna" placeholder="Navy" /></div>
                                    <div class="flex flex-col gap-1.5"><label class="text-sm font-medium" for="article-size">Size</label><Input id="article-size" v-model="hancaanForm.size" aria-label="Size" placeholder="L" /></div>
                                    <div class="flex flex-col gap-1.5"><label class="text-sm font-medium" for="article-qty">Qty</label><Input id="article-qty" v-model="hancaanForm.planned_qty" aria-label="Qty rencana" inputmode="numeric" min="1" type="number" placeholder="24" /></div>
                                </div>
                                <Button :disabled="hancaanForm.processing" type="submit"><Plus data-icon="inline-start" />Simpan Hancaan</Button>
                            </form>
                            <div class="flex flex-col gap-2">
                                <article v-for="article in availableArticles" :key="article.id" class="rounded-lg border p-3">
                                    <div v-if="activeHancaanEditId !== article.id" class="flex flex-col gap-3">
                                        <div class="flex items-start justify-between gap-3">
                                            <div class="min-w-0">
                                                <p class="truncate text-sm font-medium">{{ article.article_name }}</p>
                                                <p class="truncate text-xs text-muted-foreground">{{ [article.color, article.size, article.work_type_name].filter(Boolean).join(' / ') }}</p>
                                            </div>
                                            <Badge variant="secondary">{{ article.available_qty }} siap</Badge>
                                        </div>
                                        <div class="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                            <span>Plan {{ article.planned_qty }}</span>
                                            <span>Ambil {{ article.assigned_qty }}</span>
                                            <span>Selesai {{ article.completed_qty }}</span>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" @click="beginHancaanEdit(article)">Edit</Button>
                                            <Button size="sm" variant="destructive" :disabled="article.assigned_qty > 0 || hancaanActionForm.processing" @click="cancelHancaan(article)">Batalkan</Button>
                                        </div>
                                        <p v-if="activeHancaanActionId === article.id && hancaanActionForm.errors.production_article_id" class="text-xs text-destructive">{{ hancaanActionForm.errors.production_article_id }}</p>
                                    </div>
                                    <form v-else class="flex flex-col gap-3" @submit.prevent="submitHancaanUpdate(article)">
                                        <Select v-model="hancaanEditForm.work_type_id">
                                            <SelectTrigger class="w-full"><SelectValue placeholder="Tarif kerja" /></SelectTrigger>
                                            <SelectContent><SelectGroup><SelectItem v-for="workType in activeWorkTypeOptions" :key="workType.id" :value="String(workType.id)">{{ workType.name }} - {{ formatIdr(workType.rate_amount ?? 0) }}</SelectItem></SelectGroup></SelectContent>
                                        </Select>
                                        <div class="grid gap-2 sm:grid-cols-2">
                                            <Input v-model="hancaanEditForm.article_name" aria-label="Edit nama artikel" />
                                            <Input v-model="hancaanEditForm.color" aria-label="Edit warna artikel" />
                                            <Input v-model="hancaanEditForm.size" aria-label="Edit size artikel" />
                                            <Input v-model="hancaanEditForm.planned_qty" aria-label="Edit qty rencana" inputmode="numeric" type="number" />
                                        </div>
                                        <Textarea v-model="hancaanEditForm.notes" aria-label="Edit catatan hancaan" rows="2" />
                                        <p v-if="hancaanEditForm.errors.planned_qty" class="text-xs text-destructive">{{ hancaanEditForm.errors.planned_qty }}</p>
                                        <p v-if="hancaanEditForm.errors.article_name" class="text-xs text-destructive">{{ hancaanEditForm.errors.article_name }}</p>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" :disabled="hancaanEditForm.processing" type="submit">Simpan</Button>
                                            <Button size="sm" variant="outline" type="button" @click="activeHancaanEditId = null">Batal</Button>
                                        </div>
                                    </form>
                                </article>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>


                <TabsContent value="gajian" class="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Periode Gajian 2 Mingguan</CardTitle>
                            <CardDescription>Buat slot resmi 1-14 atau 15-akhir bulan.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form class="flex flex-col gap-3" @submit.prevent="submitPayrollPeriod">
                                <div class="grid gap-3 sm:grid-cols-2">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="payroll-start">Mulai</label>
                                        <Input id="payroll-start" v-model="payrollPeriodForm.starts_at" type="date" />
                                        <p v-if="payrollPeriodForm.errors.starts_at" class="text-sm text-destructive">{{ payrollPeriodForm.errors.starts_at }}</p>
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="payroll-end">Selesai</label>
                                        <Input id="payroll-end" v-model="payrollPeriodForm.ends_at" type="date" />
                                        <p v-if="payrollPeriodForm.errors.ends_at" class="text-sm text-destructive">{{ payrollPeriodForm.errors.ends_at }}</p>
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="payroll-notes">Catatan</label>
                                    <Textarea id="payroll-notes" v-model="payrollPeriodForm.notes" rows="2" />
                                </div>
                                <Button :disabled="payrollPeriodForm.processing" type="submit">
                                    <Plus data-icon="inline-start" />
                                    Buat Periode
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Periode Terakhir</CardTitle>
                            <CardDescription>Generate slip dari completion sesuai tanggal selesai.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div v-if="!payrollPeriods.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada periode gajian.</div>
                            <div v-else class="flex flex-col gap-3">
                                <article v-for="period in payrollPeriods" :key="period.id" class="rounded-lg border p-4">
                                    <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                        <div class="min-w-0">
                                            <div class="flex flex-wrap items-center gap-2">
                                                <p class="font-semibold">{{ period.code }}</p>
                                                <Badge variant="secondary">{{ period.status_label }}</Badge>
                                            </div>
                                            <p class="text-sm text-muted-foreground">{{ period.starts_at }} - {{ period.ends_at }}</p>
                                            <p class="text-sm text-muted-foreground">{{ period.total_tailors }} penjahit / {{ period.total_completed_qty }} pcs / {{ formatIdr(period.total_amount) }}</p>
                                        </div>
                                        <div class="flex flex-wrap gap-2">
                                            <Button size="sm" variant="outline" :disabled="payrollPeriodForm.processing || period.status !== 'draft'" @click="generatePayroll(period)">Generate</Button>
                                            <Button size="sm" :disabled="payrollPeriodForm.processing || period.status !== 'draft' || !period.generated_at" @click="lockPayroll(period)">Lock</Button>
                                            <Button v-if="period.generated_at" as="a" size="sm" variant="outline" :href="route('payroll-periods.export', period.id)">
                                                <ExternalLink data-icon="inline-start" />Export
                                            </Button>
                                        </div>
                                    </div>
                                </article>
                            </div>
                        </CardContent>
                    </Card>

                    <Card class="lg:col-span-2">
                        <CardHeader>
                            <CardTitle class="text-base">Slip Terakhir</CardTitle>
                            <CardDescription>Link public ini yang nanti dikirim ke WhatsApp penjahit.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div v-if="!payrollSlips.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada slip gaji.</div>
                            <div v-if="payrollSlips.length" class="mb-3">
                                <Input v-model="slipSearch" aria-label="Cari slip gaji" placeholder="Cari penjahit, periode, atau status" />
                            </div>
                            <div v-if="payrollSlips.length" class="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Penjahit</TableHead>
                                            <TableHead>Periode</TableHead>
                                            <TableHead class="text-right">Qty</TableHead>
                                            <TableHead class="text-right">Total</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead class="text-right">Aksi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-for="slip in filteredPayrollSlips" :key="slip.id">
                                            <TableCell class="font-medium">{{ slip.tailor_name }}</TableCell>
                                            <TableCell>{{ slip.period_code }}</TableCell>
                                            <TableCell class="text-right">{{ slip.completed_qty }}</TableCell>
                                            <TableCell class="text-right">
                                                <div class="flex flex-col gap-0.5">
                                                    <span class="font-medium">{{ formatIdr(slip.net_amount ?? slip.gross_amount) }}</span>
                                                    <span v-if="slip.bonus_amount || slip.deduction_amount" class="text-xs text-muted-foreground">
                                                        +{{ formatIdr(slip.bonus_amount) }} / -{{ formatIdr(slip.deduction_amount) }}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div class="flex flex-col gap-1">
                                                    <Badge variant="secondary">{{ slip.status_label }}</Badge>
                                                    <span v-if="slip.paid_at" class="text-xs text-muted-foreground">{{ slip.paid_at }}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div class="flex flex-col items-end gap-2">
                                                    <div class="flex justify-end gap-2">
                                                        <Button v-if="slip.whatsapp_url" as="a" size="sm" variant="outline" :href="slip.whatsapp_url" target="_blank" rel="noreferrer">
                                                            <MessageCircle data-icon="inline-start" />WA
                                                        </Button>
                                                        <Button as="a" size="sm" variant="outline" :href="slip.public_url" target="_blank" rel="noreferrer">
                                                            <ExternalLink data-icon="inline-start" />Buka
                                                        </Button>
                                                        <Button size="sm" variant="outline" :disabled="!slip.can_update_adjustment || slipAdjustmentForm.processing" @click="beginSlipAdjustment(slip)">
                                                            Atur
                                                        </Button>
                                                        <Button size="sm" :disabled="!slip.can_mark_paid || (slipActionForm.processing && activeSlipActionId === slip.id)" @click="markSlipPaid(slip)">
                                                            <CircleCheck data-icon="inline-start" />Dibayar
                                                        </Button>
                                                    </div>
                                                    <form v-if="activeSlipAdjustmentId === slip.id" class="grid w-full min-w-[28rem] gap-2 rounded-lg border bg-muted/30 p-3 text-left" @submit.prevent="submitSlipAdjustment(slip)">
                                                        <div class="grid grid-cols-2 gap-2">
                                                            <div class="flex flex-col gap-1.5">
                                                                <label class="text-xs font-medium text-muted-foreground" :for="`slip-bonus-${slip.id}`">Bonus</label>
                                                                <Input :id="`slip-bonus-${slip.id}`" v-model="slipAdjustmentForm.bonus_amount" inputmode="numeric" min="0" type="number" />
                                                            </div>
                                                            <div class="flex flex-col gap-1.5">
                                                                <label class="text-xs font-medium text-muted-foreground" :for="`slip-deduction-${slip.id}`">Potongan / kasbon</label>
                                                                <Input :id="`slip-deduction-${slip.id}`" v-model="slipAdjustmentForm.deduction_amount" inputmode="numeric" min="0" type="number" />
                                                            </div>
                                                        </div>
                                                        <Input v-model="slipAdjustmentForm.notes" placeholder="Bonus hadir, kasbon, denda, dll." />
                                                        <div class="flex justify-end gap-2">
                                                            <Button size="sm" :disabled="slipAdjustmentForm.processing">Simpan</Button>
                                                            <Button size="sm" type="button" variant="ghost" @click="activeSlipAdjustmentId = null">Batal</Button>
                                                        </div>
                                                    </form>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div v-if="payrollSlips.length" class="grid gap-3 md:hidden">
                                <article v-for="slip in filteredPayrollSlips" :key="slip.id" class="rounded-lg border p-3">
                                    <div class="flex items-start justify-between gap-3">
                                        <div>
                                            <p class="font-medium">{{ slip.tailor_name }}</p>
                                            <p class="text-sm text-muted-foreground">{{ slip.period_code }} / {{ slip.completed_qty }} pcs</p>
                                        </div>
                                        <div class="text-right">
                                            <p class="text-sm font-semibold">{{ formatIdr(slip.net_amount ?? slip.gross_amount) }}</p>
                                            <p v-if="slip.bonus_amount || slip.deduction_amount" class="text-xs text-muted-foreground">+{{ formatIdr(slip.bonus_amount) }} / -{{ formatIdr(slip.deduction_amount) }}</p>
                                        </div>
                                    </div>
                                    <form v-if="activeSlipAdjustmentId === slip.id" class="mt-3 grid gap-2" @submit.prevent="submitSlipAdjustment(slip)">
                                        <div class="grid grid-cols-2 gap-2">
                                            <Input v-model="slipAdjustmentForm.bonus_amount" aria-label="Bonus slip" inputmode="numeric" min="0" type="number" />
                                            <Input v-model="slipAdjustmentForm.deduction_amount" aria-label="Potongan slip" inputmode="numeric" min="0" type="number" />
                                        </div>
                                        <Input v-model="slipAdjustmentForm.notes" aria-label="Catatan adjustment slip" placeholder="Catatan bonus/kasbon" />
                                        <div class="flex gap-2">
                                            <Button size="sm" :disabled="slipAdjustmentForm.processing">Simpan</Button>
                                            <Button size="sm" type="button" variant="ghost" @click="activeSlipAdjustmentId = null">Batal</Button>
                                        </div>
                                    </form>
                                    <div class="mt-3 flex flex-wrap gap-2">
                                        <Button v-if="slip.whatsapp_url" as="a" size="sm" variant="outline" :href="slip.whatsapp_url" target="_blank" rel="noreferrer">
                                            <MessageCircle data-icon="inline-start" />WA
                                        </Button>
                                        <Button as="a" size="sm" variant="outline" :href="slip.public_url" target="_blank" rel="noreferrer">
                                            <ExternalLink data-icon="inline-start" />Buka
                                        </Button>
                                        <Button size="sm" variant="outline" :disabled="!slip.can_update_adjustment || slipAdjustmentForm.processing" @click="beginSlipAdjustment(slip)">
                                            Atur
                                        </Button>
                                        <Button size="sm" :disabled="!slip.can_mark_paid || (slipActionForm.processing && activeSlipActionId === slip.id)" @click="markSlipPaid(slip)">
                                            <CircleCheck data-icon="inline-start" />Dibayar
                                        </Button>
                                    </div>
                                </article>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="monitoring" class="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                    <Card>
                        <CardHeader>
                            <CardTitle class="flex items-center gap-2 text-base"><PackageCheck data-icon="inline-start" />Sedang Dikerjakan</CardTitle>
                            <CardDescription>Monitoring superadmin untuk semua pekerjaan aktif.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="mb-3">
                                <Input v-model="monitoringSearch" aria-label="Cari pekerjaan aktif" placeholder="Cari penjahit, hancaan, warna, size, atau status" />
                            </div>
                            <div v-if="!filteredActiveAssignments.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada hancaan yang sedang dikerjakan.</div>
                            <div v-else class="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Penjahit</TableHead>
                                            <TableHead>Hancaan</TableHead>
                                            <TableHead class="text-right">Progress</TableHead>
                                            <TableHead class="text-right">Sisa</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead class="text-right">Estimasi</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <TableRow v-for="assignment in filteredActiveAssignments" :key="assignment.id">
                                            <TableCell class="font-medium">{{ assignment.tailor_name }}</TableCell>
                                            <TableCell><div class="flex flex-col gap-1"><span>{{ assignment.article_name }}</span><span class="text-xs text-muted-foreground">{{ assignmentMeta(assignment) }}</span></div></TableCell>
                                            <TableCell class="text-right">{{ assignment.completed_qty }} / {{ assignment.assigned_qty }}</TableCell>
                                            <TableCell class="text-right">{{ assignment.remaining_qty }}</TableCell>
                                            <TableCell><Badge variant="secondary">{{ assignment.status_label }}</Badge></TableCell>
                                            <TableCell class="text-right">{{ formatIdr(assignment.running_subtotal) }}</TableCell>
                                        </TableRow>
                                    </TableBody>
                                </Table>
                            </div>
                            <div v-if="filteredActiveAssignments.length" class="grid gap-3 md:hidden">
                                <article v-for="assignment in filteredActiveAssignments" :key="assignment.id" class="rounded-lg border p-4">
                                    <div class="flex items-start justify-between gap-3">
                                        <div class="flex flex-col gap-1"><h3 class="font-medium">{{ assignment.tailor_name }}</h3><p class="text-sm text-muted-foreground">{{ assignment.article_name }}</p></div>
                                        <Badge variant="secondary">{{ assignment.status_label }}</Badge>
                                    </div>
                                    <Separator class="my-3" />
                                    <div class="grid grid-cols-3 gap-2 text-sm">
                                        <div><p class="text-muted-foreground">Diambil</p><p class="font-medium">{{ assignment.assigned_qty }}</p></div>
                                        <div><p class="text-muted-foreground">Selesai</p><p class="font-medium">{{ assignment.completed_qty }}</p></div>
                                        <div><p class="text-muted-foreground">Sisa</p><p class="font-medium">{{ assignment.remaining_qty }}</p></div>
                                    </div>
                                </article>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Selesai Terakhir</CardTitle>
                            <CardDescription>Riwayat input qty untuk gajian.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div v-if="!recentCompletions.length" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">Belum ada qty selesai.</div>
                            <div v-else class="flex flex-col gap-3">
                                <article v-for="completion in recentCompletions" :key="completion.id" class="flex items-start justify-between gap-3 rounded-lg border p-3">
                                    <div class="flex flex-col gap-1">
                                        <p class="font-medium">{{ completion.tailor_name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ completion.article_name }} - {{ completion.completed_qty }} pcs</p>
                                        <p class="text-xs text-muted-foreground">{{ completion.completed_at }}</p>
                                    </div>
                                    <p class="text-sm font-semibold">{{ formatIdr(completion.subtotal_amount) }}</p>
                                </article>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </AuthenticatedLayout>
</template>























