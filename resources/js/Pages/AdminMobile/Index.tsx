import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CompletionList } from '@/components/tailor-payroll/completion-list';
import { HancaanMatrixForm } from '@/components/tailor-payroll/hancaan-matrix-form';
import { PeriodHeader } from '@/components/tailor-payroll/period-header';
import { PickupWizard } from '@/components/tailor-payroll/pickup-wizard';
import { StatStrip } from '@/components/tailor-payroll/stat-strip';
import { TailorBoardView } from '@/components/tailor-payroll/tailor-board-view';
import AuthenticatedLayout from '@/layouts/authenticated-layout';
import { formatIdr } from '@/lib/format';
import { CurrentPeriod } from '@/models/current-period';
import { TailorBoard } from '@/models/tailor-board';
import type {
    Article,
    Assignment,
    Completion,
    CurrentPeriodSummary,
    HancaanSuggestions,
    PayrollSlipSummary,
    Stats,
    Tailor,
    WorkType,
} from '@/types';
import { Head } from '@inertiajs/react';
import { ExternalLink, History, House, Lock, PackagePlus, Scissors, type LucideIcon } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';

type AdminMobileProps = {
    stats: Stats;
    tailors: Tailor[];
    workTypes: WorkType[];
    availableArticles: Article[];
    activeAssignments: Assignment[];
    recentCompletions: Completion[];
    payrollSlips: Pick<PayrollSlipSummary, 'id' | 'tailor_name' | 'period_code' | 'gross_amount' | 'net_amount' | 'public_url'>[];
    currentPeriod: CurrentPeriodSummary;
    hancaanSuggestions: HancaanSuggestions;
};

type MobileTab = 'today' | 'hancaan' | 'ambil' | 'riwayat';

const tabs: { value: MobileTab; label: string; icon: LucideIcon }[] = [
    { value: 'today', label: 'Hari Ini', icon: House },
    { value: 'hancaan', label: 'Hancaan', icon: PackagePlus },
    { value: 'ambil', label: 'Ambil', icon: Scissors },
    { value: 'riwayat', label: 'Riwayat', icon: History },
];

export default function AdminMobile(props: AdminMobileProps) {
    const { stats, tailors, workTypes, availableArticles, activeAssignments, recentCompletions, payrollSlips } = props;

    const period = useMemo(() => new CurrentPeriod(props.currentPeriod), [props.currentPeriod]);
    const board = useMemo(() => TailorBoard.build(tailors, activeAssignments, period), [tailors, activeAssignments, period]);
    const activeTailors = useMemo(() => tailors.filter((tailor) => tailor.is_active !== false), [tailors]);
    const [tab, setTab] = useState<MobileTab>('today');
    const [pickupPreset, setPickupPreset] = useState<{ tailorId: number }>();

    const availableQty = availableArticles.reduce((total, article) => total + article.available_qty, 0);
    const latestSlip = payrollSlips[0];

    const startPickup = (tailorId: number) => {
        setPickupPreset({ tailorId });
        setTab('ambil');
    };

    return (
        <AuthenticatedLayout
            header={
                <div className="mx-auto max-w-md">
                    <PeriodHeader eyebrow="Admin Lapangan" period={period} />
                </div>
            }
        >
            <Head title="Admin Mobile" />

            <Tabs value={tab} onValueChange={(value) => setTab(value as MobileTab)} className="mx-auto w-full max-w-md gap-0">
                <TabsList className="fixed inset-x-0 bottom-0 z-20 mx-auto grid w-full max-w-md grid-cols-4 gap-1 rounded-none border-t bg-background p-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom))] group-data-[orientation=horizontal]/tabs:h-auto sm:bottom-3 sm:rounded-xl sm:border sm:shadow-lg">
                    {tabs.map(({ value, label, icon: Icon }) => (
                        <TabsTrigger
                            key={value}
                            value={value}
                            className="h-auto flex-col gap-0.5 py-1.5 text-xs data-[state=active]:bg-muted group-data-[variant=default]/tabs-list:data-[state=active]:shadow-none"
                        >
                            <Icon className="size-5" />
                            {label}
                        </TabsTrigger>
                    ))}
                </TabsList>

                <div className="flex flex-col px-4 py-4 pb-28">
                    <TabsContent value="today" forceMount className="flex flex-col gap-4 data-[state=inactive]:hidden">
                        {period.isLocked && (
                            <Alert variant="destructive">
                                <Lock />
                                <AlertTitle>Periode {period.label} sudah dikunci</AlertTitle>
                                <AlertDescription>Input selesai untuk periode ini tidak bisa disimpan lagi. Hubungi superadmin.</AlertDescription>
                            </Alert>
                        )}

                        <StatStrip
                            items={[
                                { label: 'Sedang jalan', value: board.openAssignmentCount },
                                { label: 'Sisa antrian', value: `${board.queueQty} pcs` },
                                { label: 'Selesai hari ini', value: `${stats.completed_today_qty} pcs` },
                                { label: 'Siap ambil', value: `${availableQty} pcs` },
                            ]}
                        />

                        <Section title="Sedang dikerjakan" description="Ketuk +1, +5, atau Sisa saat penjahit setor jahitan.">
                            <TailorBoardView board={board} onPickup={startPickup} />
                        </Section>

                        {latestSlip && (
                            <Card className="gap-3 py-4">
                                <CardHeader className="px-4">
                                    <CardTitle className="text-base">Slip terakhir</CardTitle>
                                    <CardDescription>
                                        {latestSlip.period_code} · {latestSlip.tailor_name}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="flex items-center justify-between gap-3 px-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total diterima</p>
                                        <p className="font-semibold tabular-nums">{formatIdr(latestSlip.net_amount ?? latestSlip.gross_amount)}</p>
                                    </div>
                                    <Button asChild size="sm" variant="outline">
                                        <a href={latestSlip.public_url} target="_blank" rel="noreferrer">
                                            <ExternalLink />
                                            Buka slip
                                        </a>
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="hancaan" forceMount className="data-[state=inactive]:hidden">
                        <Card className="gap-4">
                            <CardHeader>
                                <CardTitle className="text-base">Input hancaan</CardTitle>
                                <CardDescription>Satu artikel bisa banyak warna dan size sekaligus.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <HancaanMatrixForm workTypes={workTypes} suggestions={props.hancaanSuggestions} idPrefix="mobile-hancaan" />
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="ambil" forceMount className="data-[state=inactive]:hidden">
                        <Section title="Ambil hancaan" description={`${availableQty} pcs dari ${availableArticles.length} hancaan siap diambil.`}>
                            <PickupWizard
                                tailors={activeTailors}
                                articles={availableArticles}
                                board={board}
                                preset={pickupPreset}
                                idPrefix="mobile-pickup"
                                stickyFooter
                                emptyAction={
                                    <Button size="sm" variant="outline" onClick={() => setTab('hancaan')}>
                                        Input hancaan
                                    </Button>
                                }
                            />
                        </Section>
                    </TabsContent>

                    <TabsContent value="riwayat" forceMount className="data-[state=inactive]:hidden">
                        <Section title="Riwayat input selesai" description="Salah input? Batalkan dari sini selama belum masuk slip gaji.">
                            <CompletionList completions={recentCompletions} undoable />
                        </Section>
                    </TabsContent>
                </div>
            </Tabs>
        </AuthenticatedLayout>
    );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
    return (
        <section className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
                <h2 className="font-semibold">{title}</h2>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            {children}
        </section>
    );
}
