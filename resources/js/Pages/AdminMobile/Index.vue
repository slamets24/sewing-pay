<script setup lang="ts">
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout.vue';
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Input } from '@/Components/ui/input';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/Components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/Components/ui/tabs';
import { Textarea } from '@/Components/ui/textarea';
import { Head, useForm } from '@inertiajs/vue3';
import { ClipboardCheck, PackagePlus, Scissors, Shirt, WalletCards } from '@lucide/vue';
import { computed, ref } from 'vue';

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
};

type Article = {
    id: number;
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

type PayrollSlipSummary = {
    id: number;
    tailor_name: string;
    period_code: string;
    completed_qty: number;
    gross_amount: number;
    net_amount?: number;
    status_label: string;
    public_url: string;
};

const props = defineProps<{
    stats: StatProps;
    tailors: Option[];
    workTypes: Option[];
    availableArticles: Article[];
    activeAssignments: Assignment[];
    recentCompletions: Completion[];
    payrollSlips: PayrollSlipSummary[];
}>();

const activeTab = ref('today');
const hancaanForm = useForm({ work_type_id: '', article_name: '', color: '', size: '', planned_qty: '', ready_at: '', notes: '' });
const assignmentForm = useForm({ tailor_id: '', production_article_id: '', assigned_qty: '', assigned_at: '', due_at: '', notes: '' });
const completionForm = useForm({ tailor_assignment_id: '', completed_qty: '', completed_at: '', notes: '' });

const activeAssignmentOptions = computed(() => props.activeAssignments.filter((assignment) => assignment.remaining_qty > 0));
const totalAvailableQty = computed(() => props.availableArticles.reduce((total, article) => total + article.available_qty, 0));
const queueQty = computed(() => props.activeAssignments.reduce((total, assignment) => total + assignment.remaining_qty, 0));
const latestSlip = computed(() => props.payrollSlips[0] ?? null);
const selectedCompletionAssignment = computed(() => props.activeAssignments.find((assignment) => String(assignment.id) === completionForm.tailor_assignment_id) ?? null);
const selectedAssignmentArticle = computed(() => props.availableArticles.find((article) => String(article.id) === assignmentForm.production_article_id) ?? null);

const formatIdr = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

const hancaanLabel = (article: Article) => [article.article_name, article.color, article.size].filter(Boolean).join(' / ');
const assignmentLabel = (assignment: Assignment) => `${assignment.tailor_name} - ${assignment.article_name}`;
const assignmentMeta = (assignment: Assignment) => [assignment.color, assignment.size, assignment.work_type_name].filter(Boolean).join(' / ');
const progressPercent = (assignment: Assignment) => Math.min(100, Math.round((assignment.completed_qty / Math.max(assignment.assigned_qty, 1)) * 100));
const clampQty = (qty: number, maxQty?: number | null) => String(Math.max(1, Math.min(qty, Math.max(maxQty ?? qty, 1))));

const submitHancaan = () => hancaanForm.post(route('hancaan.store'), {
    preserveScroll: true,
    onSuccess: () => hancaanForm.reset(),
});

const submitAssignment = () => assignmentForm.post(route('assignments.store'), {
    preserveScroll: true,
    onSuccess: () => assignmentForm.reset(),
});

const submitCompletion = () => {
    if (!completionForm.tailor_assignment_id) return;

    completionForm.post(route('assignments.completions.store', completionForm.tailor_assignment_id), {
        preserveScroll: true,
        onSuccess: () => completionForm.reset(),
    });
};

const chooseCompletion = (assignment: Assignment) => {
    completionForm.tailor_assignment_id = String(assignment.id);
    activeTab.value = 'selesai';
};

const goToTab = (tab: string) => {
    activeTab.value = tab;
};

const setAssignedQty = (qty: number) => {
    assignmentForm.assigned_qty = clampQty(qty, selectedAssignmentArticle.value?.available_qty);
};

const setCompletedQty = (qty: number) => {
    completionForm.completed_qty = clampQty(qty, selectedCompletionAssignment.value?.remaining_qty);
};
</script>

<template>
    <Head title="Admin Mobile" />

    <AuthenticatedLayout>
        <template #header>
            <div class="flex flex-col gap-1">
                <p class="text-sm font-medium text-muted-foreground">Admin Lapangan</p>
                <h2 class="text-xl font-semibold tracking-normal text-foreground">Input Hancaan Mobile</h2>
            </div>
        </template>

        <div class="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-4 pb-24">
            <section class="grid grid-cols-2 gap-3">
                <Card>
                    <CardContent class="flex items-center gap-3 p-4">
                        <div class="rounded-md bg-muted p-2 text-foreground"><Scissors data-icon="inline-start" /></div>
                        <div class="min-w-0">
                            <p class="text-xs text-muted-foreground">Sedang jalan</p>
                            <p class="text-xl font-semibold">{{ stats.assignments_active }}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-3 p-4">
                        <div class="rounded-md bg-muted p-2 text-foreground"><ClipboardCheck data-icon="inline-start" /></div>
                        <div class="min-w-0">
                            <p class="text-xs text-muted-foreground">Selesai hari ini</p>
                            <p class="text-xl font-semibold">{{ stats.completed_today_qty }}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-3 p-4">
                        <div class="rounded-md bg-muted p-2 text-foreground"><Shirt data-icon="inline-start" /></div>
                        <div class="min-w-0">
                            <p class="text-xs text-muted-foreground">Qty siap ambil</p>
                            <p class="text-xl font-semibold">{{ totalAvailableQty }}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent class="flex items-center gap-3 p-4">
                        <div class="rounded-md bg-muted p-2 text-foreground"><WalletCards data-icon="inline-start" /></div>
                        <div class="min-w-0">
                            <p class="text-xs text-muted-foreground">Estimasi gaji</p>
                            <p class="text-base font-semibold">{{ formatIdr(stats.running_wage_estimate) }}</p>
                        </div>
                    </CardContent>
                </Card>
            </section>

            <Tabs v-model="activeTab" default-value="today" class="flex flex-col gap-4">
                <TabsList class="sticky top-0 z-10 grid h-auto w-full grid-cols-4 p-1 shadow-sm">
                    <TabsTrigger value="today" class="py-2 text-xs">Hari Ini</TabsTrigger>
                    <TabsTrigger value="hancaan" class="py-2 text-xs">Hancaan</TabsTrigger>
                    <TabsTrigger value="ambil" class="py-2 text-xs">Ambil</TabsTrigger>
                    <TabsTrigger value="selesai" class="py-2 text-xs">Selesai</TabsTrigger>
                </TabsList>

                <TabsContent value="today" class="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Antrian Dikerjakan</CardTitle>
                            <CardDescription>{{ queueQty }} pcs masih perlu diselesaikan.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-3">
                            <div v-if="!activeAssignments.length" class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                Belum ada penjahit yang sedang mengerjakan hancaan.
                                <Button class="mt-3" size="sm" type="button" variant="outline" @click="goToTab('ambil')">Ambil Hancaan</Button>
                            </div>
                            <article v-for="assignment in activeAssignments" :key="assignment.id" class="rounded-lg border p-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <p class="font-medium">{{ assignment.tailor_name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ assignment.article_name }}</p>
                                        <p class="text-xs text-muted-foreground">{{ assignmentMeta(assignment) }}</p>
                                    </div>
                                    <Badge variant="secondary">{{ assignment.status_label }}</Badge>
                                </div>
                                <div class="mt-3 h-2 rounded-full bg-muted">
                                    <div class="h-2 rounded-full bg-primary" :style="{ width: `${progressPercent(assignment)}%` }"></div>
                                </div>
                                <div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{{ assignment.completed_qty }}/{{ assignment.assigned_qty }} pcs</span>
                                    <span>Sisa {{ assignment.remaining_qty }} pcs</span>
                                </div>
                                <Button class="mt-3 w-full" size="sm" type="button" variant="outline" @click="chooseCompletion(assignment)">
                                    <ClipboardCheck data-icon="inline-start" />
                                    Siapkan Input Selesai
                                </Button>
                            </article>
                        </CardContent>
                    </Card>

                    <Card v-if="latestSlip">
                        <CardHeader>
                            <CardTitle class="text-base">Slip Terakhir</CardTitle>
                            <CardDescription>{{ latestSlip.period_code }} - {{ latestSlip.tailor_name }}</CardDescription>
                        </CardHeader>
                        <CardContent class="flex items-center justify-between gap-3">
                            <div>
                                <p class="text-sm text-muted-foreground">Total diterima</p>
                                <p class="font-semibold">{{ formatIdr(latestSlip.net_amount ?? latestSlip.gross_amount) }}</p>
                            </div>
                            <a class="text-sm font-medium underline" :href="latestSlip.public_url" target="_blank">Buka slip</a>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="hancaan">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Input Hancaan</CardTitle>
                            <CardDescription>Artikel, warna, size, qty, dan tarif.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form class="flex flex-col gap-3" @submit.prevent="submitHancaan">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-work-type">Tarif kerja</label>
                                    <Select v-model="hancaanForm.work_type_id">
                                        <SelectTrigger id="mobile-work-type" class="w-full"><SelectValue placeholder="Pilih tarif" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="workType in workTypes" :key="workType.id" :value="String(workType.id)">
                                                    {{ workType.name }} - {{ formatIdr(workType.rate_amount ?? 0) }}
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="hancaanForm.errors.work_type_id" class="text-sm text-destructive">{{ hancaanForm.errors.work_type_id }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-article">Nama artikel</label>
                                    <Input id="mobile-article" v-model="hancaanForm.article_name" autocomplete="off" />
                                    <p v-if="hancaanForm.errors.article_name" class="text-sm text-destructive">{{ hancaanForm.errors.article_name }}</p>
                                </div>
                                <div class="grid grid-cols-2 gap-3">
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="mobile-color">Warna</label>
                                        <Input id="mobile-color" v-model="hancaanForm.color" autocomplete="off" />
                                    </div>
                                    <div class="flex flex-col gap-1.5">
                                        <label class="text-sm font-medium" for="mobile-size">Size</label>
                                        <Input id="mobile-size" v-model="hancaanForm.size" autocomplete="off" />
                                    </div>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-planned-qty">Qty rencana</label>
                                    <Input id="mobile-planned-qty" v-model="hancaanForm.planned_qty" inputmode="numeric" type="number" min="1" />
                                    <p v-if="hancaanForm.errors.planned_qty" class="text-sm text-destructive">{{ hancaanForm.errors.planned_qty }}</p>
                                </div>
                                <Textarea v-model="hancaanForm.notes" rows="2" placeholder="Catatan opsional" />
                                <Button class="w-full" :disabled="hancaanForm.processing" type="submit">
                                    <PackagePlus data-icon="inline-start" />
                                    Simpan Hancaan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ambil">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Ambil Hancaan</CardTitle>
                            <CardDescription>Pilih data yang sudah disiapkan, lalu isi qty.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div v-if="!availableArticles.length" class="mb-3 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                Belum ada hancaan siap ambil.
                                <Button class="mt-3" size="sm" type="button" variant="outline" @click="goToTab('hancaan')">Input Hancaan</Button>
                            </div>
                            <form class="flex flex-col gap-3" @submit.prevent="submitAssignment">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-article-select">Hancaan</label>
                                    <Select v-model="assignmentForm.production_article_id">
                                        <SelectTrigger id="mobile-article-select" class="w-full"><SelectValue placeholder="Pilih hancaan" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="article in availableArticles" :key="article.id" :value="String(article.id)">
                                                    {{ hancaanLabel(article) }} - {{ article.available_qty }} pcs
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="assignmentForm.errors.production_article_id" class="text-sm text-destructive">{{ assignmentForm.errors.production_article_id }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-tailor-select">Penjahit</label>
                                    <Select v-model="assignmentForm.tailor_id">
                                        <SelectTrigger id="mobile-tailor-select" class="w-full"><SelectValue placeholder="Pilih penjahit" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="tailor in tailors" :key="tailor.id" :value="String(tailor.id)">{{ tailor.name }}</SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="assignmentForm.errors.tailor_id" class="text-sm text-destructive">{{ assignmentForm.errors.tailor_id }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-assigned-qty">Qty diambil</label>
                                    <Input id="mobile-assigned-qty" v-model="assignmentForm.assigned_qty" inputmode="numeric" type="number" min="1" />
                                    <p v-if="assignmentForm.errors.assigned_qty" class="text-sm text-destructive">{{ assignmentForm.errors.assigned_qty }}</p>
                                    <div class="flex flex-wrap gap-2">
                                        <Button size="sm" type="button" variant="outline" @click="setAssignedQty(5)">5</Button>
                                        <Button size="sm" type="button" variant="outline" @click="setAssignedQty(10)">10</Button>
                                        <Button size="sm" type="button" variant="outline" @click="setAssignedQty(20)">20</Button>
                                        <Button v-if="selectedAssignmentArticle" size="sm" type="button" variant="outline" @click="setAssignedQty(selectedAssignmentArticle.available_qty)">Semua</Button>
                                    </div>
                                </div>
                                <Textarea v-model="assignmentForm.notes" rows="2" placeholder="Catatan opsional" />
                                <Button class="w-full" :disabled="assignmentForm.processing" type="submit">
                                    <Scissors data-icon="inline-start" />
                                    Catat Pengambilan
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="selesai" class="flex flex-col gap-4">
                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Catat Selesai</CardTitle>
                            <CardDescription>Qty boleh dicicil sesuai barang yang selesai.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div v-if="!activeAssignmentOptions.length" class="mb-3 rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                Belum ada pekerjaan berjalan untuk diselesaikan.
                                <Button class="mt-3" size="sm" type="button" variant="outline" @click="goToTab('ambil')">Catat Pengambilan</Button>
                            </div>
                            <div v-if="selectedCompletionAssignment" class="mb-3 rounded-lg border bg-muted/40 p-3">
                                <p class="text-xs font-medium text-muted-foreground">Pekerjaan dipilih</p>
                                <p class="font-medium">{{ selectedCompletionAssignment.tailor_name }}</p>
                                <p class="text-sm text-muted-foreground">{{ selectedCompletionAssignment.article_name }} - sisa {{ selectedCompletionAssignment.remaining_qty }} pcs</p>
                            </div>
                            <form class="flex flex-col gap-3" @submit.prevent="submitCompletion">
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-assignment-select">Pekerjaan</label>
                                    <Select v-model="completionForm.tailor_assignment_id">
                                        <SelectTrigger id="mobile-assignment-select" class="w-full"><SelectValue placeholder="Pilih pekerjaan" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectGroup>
                                                <SelectItem v-for="assignment in activeAssignmentOptions" :key="assignment.id" :value="String(assignment.id)">
                                                    {{ assignmentLabel(assignment) }} - sisa {{ assignment.remaining_qty }} pcs
                                                </SelectItem>
                                            </SelectGroup>
                                        </SelectContent>
                                    </Select>
                                    <p v-if="completionForm.errors.tailor_assignment_id" class="text-sm text-destructive">{{ completionForm.errors.tailor_assignment_id }}</p>
                                </div>
                                <div class="flex flex-col gap-1.5">
                                    <label class="text-sm font-medium" for="mobile-completed-qty">Qty selesai</label>
                                    <Input id="mobile-completed-qty" v-model="completionForm.completed_qty" inputmode="numeric" type="number" min="1" />
                                    <p v-if="completionForm.errors.completed_qty" class="text-sm text-destructive">{{ completionForm.errors.completed_qty }}</p>
                                    <div class="flex flex-wrap gap-2">
                                        <Button size="sm" type="button" variant="outline" @click="setCompletedQty(1)">1</Button>
                                        <Button size="sm" type="button" variant="outline" @click="setCompletedQty(5)">5</Button>
                                        <Button size="sm" type="button" variant="outline" @click="setCompletedQty(10)">10</Button>
                                        <Button v-if="selectedCompletionAssignment" size="sm" type="button" variant="outline" @click="setCompletedQty(selectedCompletionAssignment.remaining_qty)">Sisa</Button>
                                    </div>
                                </div>
                                <Textarea v-model="completionForm.notes" rows="2" placeholder="Catatan revisi/cacat jika ada" />
                                <Button class="w-full" :disabled="completionForm.processing || !completionForm.tailor_assignment_id" type="submit">
                                    <ClipboardCheck data-icon="inline-start" />
                                    Simpan Qty Selesai
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle class="text-base">Riwayat Terbaru</CardTitle>
                            <CardDescription>Input selesai terakhir untuk cek cepat.</CardDescription>
                        </CardHeader>
                        <CardContent class="flex flex-col gap-3">
                            <div v-if="!recentCompletions.length" class="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
                                Belum ada qty selesai yang dicatat.
                            </div>
                            <article v-for="completion in recentCompletions" :key="completion.id" class="rounded-lg border p-3">
                                <div class="flex items-start justify-between gap-3">
                                    <div class="min-w-0">
                                        <p class="font-medium">{{ completion.tailor_name }}</p>
                                        <p class="text-sm text-muted-foreground">{{ completion.article_name }}</p>
                                        <p class="text-xs text-muted-foreground">{{ [completion.color, completion.size, completion.work_type_name].filter(Boolean).join(' / ') }}</p>
                                    </div>
                                    <div class="text-right">
                                        <p class="font-semibold">{{ completion.completed_qty }} pcs</p>
                                        <p class="text-xs text-muted-foreground">{{ formatIdr(completion.subtotal_amount) }}</p>
                                    </div>
                                </div>
                            </article>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    </AuthenticatedLayout>
</template>