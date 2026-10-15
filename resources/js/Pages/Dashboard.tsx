import { HancaanCard } from '@/components/dashboard/hancaan-card';
import { MonitoringCard } from '@/components/dashboard/monitoring-card';
import { PayrollPeriodFormCard, PayrollPeriodsCard } from '@/components/dashboard/payroll-periods-card';
import { PayrollSlipsCard } from '@/components/dashboard/payroll-slips-card';
import { TailorsCard } from '@/components/dashboard/tailors-card';
import { UsersCard } from '@/components/dashboard/users-card';
import { WorkTypesCard } from '@/components/dashboard/work-types-card';
import { EmptyState } from '@/components/empty-state';
import { AssignmentForm } from '@/components/tailor-payroll/assignment-form';
import { AssignmentProgress } from '@/components/tailor-payroll/assignment-progress';
import { CompletionForm } from '@/components/tailor-payroll/completion-form';
import { CompletionList } from '@/components/tailor-payroll/completion-list';
import { StatCard } from '@/components/tailor-payroll/stat-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { formatIdr, joinMeta } from '@/lib/format';
import type {
    Article,
    Assignment,
    Completion,
    ManagedUser,
    PayrollPeriod,
    PayrollSlipSummary,
    SelectOption,
    Stats,
    Tailor,
    WorkType,
} from '@/types';
import { Head } from '@inertiajs/react';
import { CheckCheck, ClipboardCheck, Gauge, PackagePlus, Scissors, Shirt, WalletCards, type LucideIcon } from 'lucide-react';

type DashboardProps = {
    stats: Stats;
    tailors: Tailor[];
    users: ManagedUser[];
    workTypes: WorkType[];
    workTypeCategories: SelectOption[];
    userRoles: SelectOption[];
    availableArticles: Article[];
    activeAssignments: Assignment[];
    recentCompletions: Completion[];
    payrollPeriods: PayrollPeriod[];
    payrollSlips: PayrollSlipSummary[];
};

const workflowSteps: { icon: LucideIcon; title: string; body: string }[] = [
    { icon: PackagePlus, title: '1. Siapkan hancaan', body: 'Input artikel, warna, size, qty, dan tarif kerja.' },
    { icon: Scissors, title: '2. Penjahit ambil', body: 'Qty tersedia berkurang otomatis dan tarif disnapshot.' },
    { icon: ClipboardCheck, title: '3. Catat selesai', body: 'Bisa dicicil, riwayatnya jadi dasar gajian 2 mingguan.' },
];

export default function Dashboard(props: DashboardProps) {
    const { stats, tailors, workTypes, availableArticles, activeAssignments } = props;

    const activeTailors = tailors.filter((tailor) => tailor.is_active !== false);
    const activeWorkTypes = workTypes.filter((workType) => workType.is_active !== false);
    const openAssignments = activeAssignments.filter((assignment) => assignment.remaining_qty > 0);
    const availableQty = availableArticles.reduce((total, article) => total + article.available_qty, 0);
    const queueQty = activeAssignments.reduce((total, assignment) => total + assignment.remaining_qty, 0);

    return (
        <AuthenticatedLayout
            header={
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-muted-foreground">Pendataan Gajian Penjahit</p>
                        <h1 className="text-2xl font-semibold">Dashboard Hancaan</h1>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-muted-foreground">
                        <span>{stats.assignments_active} aktif</span>
                        <span aria-hidden>·</span>
                        <span>{stats.completed_today_qty} pcs selesai hari ini</span>
                    </div>
                </div>
            }
        >
            <Head title="Dashboard" />

            <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
                <section className="grid grid-cols-2 gap-3 xl:grid-cols-5">
                    <StatCard label="Penjahit Aktif" value={stats.tailors_active} icon={Scissors} />
                    <StatCard label="Siap Diambil" value={availableQty} hint={`${availableArticles.length} hancaan tersedia`} icon={Shirt} />
                    <StatCard label="Sedang Dikerjakan" value={stats.assignments_active} hint={`${queueQty} pcs belum selesai`} icon={Gauge} />
                    <StatCard label="Selesai Hari Ini" value={stats.completed_today_qty} hint="masuk riwayat gajian" icon={CheckCheck} />
                    <StatCard
                        label="Estimasi Gaji Berjalan"
                        value={formatIdr(stats.running_wage_estimate)}
                        hint="dari qty selesai"
                        icon={WalletCards}
                        className="col-span-2 xl:col-span-1"
                        valueClassName="text-xl"
                    />
                </section>

                <section className="hidden gap-3 md:grid lg:grid-cols-3">
                    {workflowSteps.map(({ icon: Icon, title, body }) => (
                        <div key={title} className="flex items-start gap-3 rounded-lg border bg-card p-4">
                            <div className="rounded-md bg-muted p-2">
                                <Icon className="size-4" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <p className="text-sm font-semibold">{title}</p>
                                <p className="text-sm text-muted-foreground">{body}</p>
                            </div>
                        </div>
                    ))}
                </section>

                <Tabs defaultValue="operasional" className="gap-4">
                    <TabsList className="grid h-auto w-full grid-cols-4 md:w-fit">
                        <TabsTrigger value="operasional" className="py-2">
                            Operasional
                        </TabsTrigger>
                        <TabsTrigger value="master" className="py-2">
                            Master Data
                        </TabsTrigger>
                        <TabsTrigger value="gajian" className="py-2">
                            Gajian
                        </TabsTrigger>
                        <TabsTrigger value="monitoring" className="py-2">
                            Monitoring
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="operasional" className="flex flex-col gap-4">
                        <section className="grid gap-4 lg:grid-cols-2">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Pengambilan Hancaan</CardTitle>
                                    <CardDescription>Pilih hancaan siap, penjahit, dan qty diambil.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <AssignmentForm articles={availableArticles} tailors={activeTailors} idPrefix="assign" />
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Catat Selesai</CardTitle>
                                    <CardDescription>Input cicilan qty selesai untuk dasar gajian.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <CompletionForm assignments={openAssignments} idPrefix="complete" />
                                </CardContent>
                            </Card>
                        </section>

                        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                            <Card>
                                <CardHeader className="flex flex-row items-start justify-between gap-2">
                                    <div className="flex flex-col gap-1.5">
                                        <CardTitle className="text-base">Pekerjaan Berjalan</CardTitle>
                                        <CardDescription>{queueQty} pcs masih perlu diselesaikan.</CardDescription>
                                    </div>
                                    <Badge variant="secondary">{activeAssignments.length} pekerjaan</Badge>
                                </CardHeader>
                                <CardContent className="grid gap-3">
                                    {activeAssignments.length ? (
                                        activeAssignments.map((assignment) => <AssignmentProgress key={assignment.id} assignment={assignment} />)
                                    ) : (
                                        <EmptyState>Belum ada hancaan yang sedang dikerjakan.</EmptyState>
                                    )}
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base">Hancaan Siap</CardTitle>
                                    <CardDescription>{availableArticles.length} artikel masih bisa diambil.</CardDescription>
                                </CardHeader>
                                <CardContent className="flex flex-col gap-2">
                                    {availableArticles.length ? (
                                        availableArticles.slice(0, 6).map((article) => (
                                            <article key={article.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
                                                <div className="min-w-0">
                                                    <p className="truncate text-sm font-medium">{article.article_name}</p>
                                                    <p className="text-xs text-muted-foreground">{joinMeta(article.color, article.size, article.work_type_name)}</p>
                                                </div>
                                                <Badge variant="secondary">{article.available_qty} pcs</Badge>
                                            </article>
                                        ))
                                    ) : (
                                        <EmptyState>Belum ada hancaan siap diambil.</EmptyState>
                                    )}
                                </CardContent>
                            </Card>
                        </section>
                    </TabsContent>

                    <TabsContent value="master" className="grid gap-4 xl:grid-cols-2">
                        <TailorsCard tailors={tailors} />
                        <UsersCard users={props.users} userRoles={props.userRoles} />
                        <WorkTypesCard workTypes={workTypes} categories={props.workTypeCategories} />
                        <HancaanCard articles={availableArticles} workTypes={activeWorkTypes} />
                    </TabsContent>

                    <TabsContent value="gajian" className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
                        <PayrollPeriodFormCard />
                        <PayrollPeriodsCard periods={props.payrollPeriods} />
                        <PayrollSlipsCard slips={props.payrollSlips} />
                    </TabsContent>

                    <TabsContent value="monitoring" className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
                        <MonitoringCard assignments={activeAssignments} />
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Selesai Terakhir</CardTitle>
                                <CardDescription>Riwayat input qty untuk gajian.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <CompletionList completions={props.recentCompletions} />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AuthenticatedLayout>
    );
}
