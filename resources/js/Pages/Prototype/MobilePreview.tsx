import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ActionBar, BottomNav, Initial, Note, Panel, RowButton, SampleFootnote, ScreenHeader, SearchField, Segmented, SuccessScreen, type Tab } from '@/components/prototype/mobile-kit';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Toaster } from '@/components/ui/sonner';
import {
    dueLabel,
    formatTime,
    formatToday,
    holdingTotal,
    sampleDeliveries,
    sampleStock,
    sampleTailors,
    sampleWorkOrders,
    sizesLabel,
    sortSizes,
    sumSizes,
    type Holding,
    type ProtoDelivery,
    type ProtoTailor,
    type ProtoWorkOrder,
    type SizeQty,
    type StockItem,
} from '@/domain/prototype/mobile-sample';
import { cn } from '@/lib/utils';
import { Head, Link } from '@inertiajs/react';
import {
    AlarmClock,
    ArrowDownToLine,
    ArrowUpFromLine,
    Banknote,
    Check,
    ChevronRight,
    FileText,
    List,
    Plus,
    Scissors,
    Settings,
    Truck,
    UserCheck,
    UserRound,
    Users,
    Wrench,
} from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { toast } from 'sonner';

type Screen =
    | 'home'
    | 'setor-tailor'
    | 'setor-qty'
    | 'setor-review'
    | 'setor-done'
    | 'ambil-pick'
    | 'ambil-tailor'
    | 'ambil-qty'
    | 'ambil-review'
    | 'ambil-done'
    | 'produksi'
    | 'menu'
    | 'catatan'
    | 'qc';

const TAB_OF: Record<Screen, Tab> = {
    home: 'home',
    'setor-tailor': 'loket',
    'setor-qty': 'loket',
    'setor-review': 'loket',
    'setor-done': 'loket',
    'ambil-pick': 'loket',
    'ambil-tailor': 'loket',
    'ambil-qty': 'loket',
    'ambil-review': 'loket',
    'ambil-done': 'loket',
    catatan: 'loket',
    produksi: 'produksi',
    menu: 'menu',
    qc: 'menu',
};

/** Layar yang menampilkan menu bawah; layar di tengah alur menyembunyikannya supaya fokus. */
const WITH_NAV: Screen[] = ['home', 'setor-tailor', 'ambil-pick', 'produksi', 'menu', 'catatan'];

type Result = { tailor: string; lines: { article: string; color: string; sizes: SizeQty }[]; total: number; at: Date };

/**
 * Pratinjau OPSEW versi HP (13 layar dari design/mobile-concept/website-mobile) dengan data contoh.
 * Semua tombol bekerja di memori saja: tidak ada yang tersimpan ke database.
 */
export default function MobilePreview() {
    const [tailors, setTailors] = useState<ProtoTailor[]>(sampleTailors);
    const [stock, setStock] = useState<StockItem[]>(sampleStock);
    const [workOrders, setWorkOrders] = useState<ProtoWorkOrder[]>(sampleWorkOrders);
    const [deliveries, setDeliveries] = useState<ProtoDelivery[]>(sampleDeliveries);

    const [stack, setStack] = useState<Screen[]>(['home']);
    const screen = stack[stack.length - 1];
    const go = (next: Screen) => {
        setStack((current) => [...current, next]);
        window.scrollTo({ top: 0 });
    };
    const back = () => setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
    const reset = (next: Screen) => {
        setStack(next === 'home' ? ['home'] : ['home', next]);
        window.scrollTo({ top: 0 });
    };

    // Draf alur setor & ambil
    const [setorTailorId, setSetorTailorId] = useState<number | null>(null);
    const [setorQty, setSetorQty] = useState<Record<string, SizeQty>>({});
    const [ambilTailorId, setAmbilTailorId] = useState<number>(1);
    const [ambilItemId, setAmbilItemId] = useState<string | null>(null);
    const [ambilQty, setAmbilQty] = useState<SizeQty>({});
    const [result, setResult] = useState<Result | null>(null);
    const [produksiTab, setProduksiTab] = useState<'running' | 'late' | 'done'>('running');

    const setorTailor = tailors.find((tailor) => tailor.id === setorTailorId) ?? null;
    const ambilTailor = tailors.find((tailor) => tailor.id === ambilTailorId) ?? tailors[0];
    const ambilItem = stock.find((item) => item.id === ambilItemId) ?? null;

    const startSetor = (tailor: ProtoTailor) => {
        setSetorTailorId(tailor.id);
        setSetorQty({});
        go('setor-qty');
    };

    const saveSetor = () => {
        if (!setorTailor) return;
        const now = new Date();
        const lines = setorTailor.holdings
            .map((holding) => ({ holding, sizes: Object.fromEntries(Object.entries(setorQty[holding.id] ?? {}).filter(([, qty]) => qty > 0)) }))
            .filter((line) => sumSizes(line.sizes) > 0);

        setTailors((current) =>
            current.map((tailor) =>
                tailor.id !== setorTailor.id
                    ? tailor
                    : {
                          ...tailor,
                          holdings: tailor.holdings
                              .map((holding) => ({ ...holding, sizes: subtract(holding.sizes, setorQty[holding.id] ?? {}) }))
                              .filter((holding) => sumSizes(holding.sizes) > 0),
                      },
            ),
        );
        setDeliveries((current) => [
            ...lines.map((line, index) => ({
                id: Date.now() + index,
                tailor: setorTailor.name,
                article: line.holding.article,
                color: line.holding.color,
                sizes: line.sizes,
                at: now,
                sentToQc: false,
            })),
            ...current,
        ]);
        setWorkOrders((current) =>
            current.map((wo) => ({ ...wo, delivered: wo.delivered + lines.filter((line) => line.holding.wo === wo.wo).reduce((sum, line) => sum + sumSizes(line.sizes), 0) })),
        );
        setResult({
            tailor: setorTailor.name,
            lines: lines.map((line) => ({ article: line.holding.article, color: line.holding.color, sizes: line.sizes })),
            total: lines.reduce((sum, line) => sum + sumSizes(line.sizes), 0),
            at: now,
        });
        setStack(['home', 'setor-done']);
    };

    const saveAmbil = () => {
        if (!ambilItem) return;
        const taken = Object.fromEntries(Object.entries(ambilQty).filter(([, qty]) => qty > 0));
        const holdingId = `from-${ambilItem.id}`;

        setStock((current) => current.map((item) => (item.id === ambilItem.id ? { ...item, sizes: subtract(item.sizes, taken) } : item)));
        setTailors((current) =>
            current.map((tailor) => {
                if (tailor.id !== ambilTailor.id) return tailor;
                const existing = tailor.holdings.find((holding) => holding.id === holdingId);
                const holdings: Holding[] = existing
                    ? tailor.holdings.map((holding) => (holding.id === holdingId ? { ...holding, sizes: add(holding.sizes, taken) } : holding))
                    : [
                          ...tailor.holdings,
                          {
                              id: holdingId,
                              article: ambilItem.article,
                              wo: ambilItem.wo,
                              color: ambilItem.color,
                              workType: tailor.type === 'makloon' ? 'Makloon' : 'Jahit lengkap',
                              sizes: taken,
                          },
                      ];
                return { ...tailor, holdings };
            }),
        );
        setResult({ tailor: ambilTailor.name, lines: [{ article: ambilItem.article, color: ambilItem.color, sizes: taken }], total: sumSizes(taken), at: new Date() });
        setStack(['home', 'ambil-done']);
    };

    const onTab = (tab: Tab) => {
        if (tab === 'home') reset('home');
        if (tab === 'loket') reset('setor-tailor');
        if (tab === 'produksi') reset('produksi');
        if (tab === 'menu') reset('menu');
    };

    let content: ReactNode;
    switch (screen) {
        case 'home':
            content = (
                <HomeScreen
                    tailors={tailors}
                    stock={stock}
                    workOrders={workOrders}
                    deliveries={deliveries}
                    onSetor={() => go('setor-tailor')}
                    onAmbil={() => go('ambil-pick')}
                    onLate={() => {
                        setProduksiTab('late');
                        reset('produksi');
                    }}
                    onQc={() => go('qc')}
                    onCatatan={() => go('catatan')}
                />
            );
            break;
        case 'setor-tailor':
            content = <SetorTailorScreen tailors={tailors} onBack={stack.length > 1 ? back : undefined} onPick={startSetor} />;
            break;
        case 'setor-qty':
            content = setorTailor && (
                <SetorQtyScreen
                    tailor={setorTailor}
                    qty={setorQty}
                    onQty={(holdingId, size, value) => setSetorQty((current) => ({ ...current, [holdingId]: { ...current[holdingId], [size]: value } }))}
                    onBack={back}
                    onNext={() => go('setor-review')}
                />
            );
            break;
        case 'setor-review':
            content = setorTailor && <SetorReviewScreen tailor={setorTailor} qty={setorQty} onBack={back} onSave={saveSetor} />;
            break;
        case 'setor-done':
            content = result && (
                <SuccessScreen
                    title="Setoran tercatat"
                    subtitle={`${result.total} pcs dari ${result.tailor}`}
                    actions={
                        <>
                            <Button size="lg" className="h-12 rounded-xl" onClick={() => reset('setor-tailor')}>
                                Catat setoran berikutnya
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 rounded-xl" onClick={() => reset('home')}>
                                Kembali ke beranda
                            </Button>
                        </>
                    }
                >
                    <ResultCard result={result} />
                </SuccessScreen>
            );
            break;
        case 'ambil-pick':
            content = (
                <AmbilPickScreen
                    receiver={ambilTailor}
                    stock={stock}
                    onBack={back}
                    onReceiver={() => go('ambil-tailor')}
                    onPick={(item) => {
                        setAmbilItemId(item.id);
                        setAmbilQty({});
                        go('ambil-qty');
                    }}
                />
            );
            break;
        case 'ambil-tailor':
            content = (
                <TailorPicker
                    tailors={tailors}
                    selectedId={ambilTailorId}
                    onBack={back}
                    onPick={(tailor) => {
                        setAmbilTailorId(tailor.id);
                        back();
                    }}
                />
            );
            break;
        case 'ambil-qty':
            content = ambilItem && (
                <AmbilQtyScreen
                    receiver={ambilTailor}
                    item={ambilItem}
                    qty={ambilQty}
                    onQty={(size, value) => setAmbilQty((current) => ({ ...current, [size]: value }))}
                    onBack={back}
                    onNext={() => go('ambil-review')}
                />
            );
            break;
        case 'ambil-review':
            content = ambilItem && <AmbilReviewScreen receiver={ambilTailor} item={ambilItem} qty={ambilQty} onBack={back} onSave={saveAmbil} />;
            break;
        case 'ambil-done':
            content = result && (
                <SuccessScreen
                    title="Pengambilan tercatat"
                    subtitle={`${result.total} pcs untuk ${result.tailor}`}
                    actions={
                        <>
                            <Button size="lg" className="h-12 rounded-xl" onClick={() => reset('ambil-pick')}>
                                Ambil barang lainnya
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 rounded-xl" onClick={() => reset('home')}>
                                Kembali ke beranda
                            </Button>
                        </>
                    }
                >
                    <ResultCard result={result} />
                </SuccessScreen>
            );
            break;
        case 'produksi':
            content = <ProduksiScreen workOrders={workOrders} tab={produksiTab} onTab={setProduksiTab} />;
            break;
        case 'menu':
            content = <MenuScreen onQc={() => go('qc')} onCatatan={() => go('catatan')} />;
            break;
        case 'catatan':
            content = <CatatanScreen deliveries={deliveries} onBack={back} />;
            break;
        case 'qc':
            content = (
                <QcScreen
                    deliveries={deliveries}
                    onBack={back}
                    onSend={(ids) => {
                        setDeliveries((current) => current.map((delivery) => (ids.includes(delivery.id) ? { ...delivery, sentToQc: true } : delivery)));
                        toast.success(`${ids.length} setoran tercatat dikirim ke QC (simulasi).`);
                    }}
                />
            );
            break;
    }

    return (
        <>
            <Head title="Pratinjau mobile" />
            <div className="min-h-dvh bg-muted/70">
                <div className="mx-auto flex min-h-dvh max-w-[430px] flex-col bg-background shadow-xl shadow-black/5">
                    <PreviewBanner />
                    <main className="flex flex-1 flex-col">{content}</main>
                    {WITH_NAV.includes(screen) && <BottomNav active={TAB_OF[screen]} onChange={onTab} />}
                </div>
            </div>
            <Toaster position="top-center" />
        </>
    );
}

function PreviewBanner() {
    return (
        <div className="flex items-center justify-between gap-2 bg-foreground px-4 py-1.5 text-[11px] text-background">
            <span>Pratinjau HP · data contoh, tidak tersimpan</span>
            <Link href={route('dashboard')} className="font-semibold underline-offset-2 hover:underline">
                Keluar
            </Link>
        </div>
    );
}

const subtract = (sizes: SizeQty, taken: SizeQty): SizeQty => Object.fromEntries(Object.entries(sizes).map(([size, qty]) => [size, Math.max(0, qty - (taken[size] ?? 0))]));

const add = (sizes: SizeQty, extra: SizeQty): SizeQty => {
    const merged = { ...sizes };
    for (const [size, qty] of Object.entries(extra)) merged[size] = (merged[size] ?? 0) + qty;
    return merged;
};

function ResultCard({ result }: { result: Result }) {
    return (
        <Panel className="flex flex-col gap-2 p-4">
            {result.lines.map((line) => (
                <div key={line.article + line.color}>
                    <p className="font-semibold">
                        {line.article} · {line.color}
                    </p>
                    <p className="text-xs text-muted-foreground">{sizesLabel(line.sizes)}</p>
                </div>
            ))}
            <p className="text-xs text-muted-foreground">
                {formatToday()} · {formatTime(result.at)}
            </p>
        </Panel>
    );
}

/* ---------- 01 Beranda ---------- */

function HomeScreen({
    tailors,
    stock,
    workOrders,
    deliveries,
    onSetor,
    onAmbil,
    onLate,
    onQc,
    onCatatan,
}: {
    tailors: ProtoTailor[];
    stock: StockItem[];
    workOrders: ProtoWorkOrder[];
    deliveries: ProtoDelivery[];
    onSetor: () => void;
    onAmbil: () => void;
    onLate: () => void;
    onQc: () => void;
    onCatatan: () => void;
}) {
    const todayIn = deliveries.reduce((sum, delivery) => sum + sumSizes(delivery.sizes), 0);
    const ready = stock.reduce((sum, item) => sum + sumSizes(item.sizes), 0);
    const sewing = tailors.reduce((sum, tailor) => sum + holdingTotal(tailor), 0);
    const late = workOrders.filter((wo) => wo.dueInDays < 0 && wo.delivered < wo.planned).length;
    const qcPending = deliveries.filter((delivery) => !delivery.sentToQc).reduce((sum, delivery) => sum + sumSizes(delivery.sizes), 0);

    return (
        <div className="flex flex-col gap-4 px-4 pt-4">
            <header className="flex items-start justify-between">
                <div>
                    <h1 className="font-display text-2xl font-black tracking-tight">OPSEW</h1>
                    <p className="text-xs text-muted-foreground first-letter:uppercase">{formatToday()}</p>
                </div>
                <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary" aria-label="Akun">
                    <UserRound className="size-5" />
                </span>
            </header>

            <section className="rounded-2xl bg-[image:var(--azflow-gradient)] p-4 text-white shadow-md" aria-label="Ringkasan hari ini">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-xs text-white/75">Jahitan masuk hari ini</p>
                        <p className="mt-1 font-display text-4xl font-black tabular">
                            {todayIn}
                            <span className="ml-1.5 text-sm font-semibold text-white/75">pcs</span>
                        </p>
                    </div>
                    <Scissors className="size-6 text-white/75" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 border-t border-white/15 pt-3">
                    <div>
                        <p className="text-[11px] text-white/75">Siap diambil</p>
                        <p className="font-bold tabular">{ready} pcs</p>
                    </div>
                    <div>
                        <p className="text-[11px] text-white/75">Sedang dijahit</p>
                        <p className="font-bold tabular">{sewing} pcs</p>
                    </div>
                </div>
            </section>

            <div className="flex flex-col gap-2.5">
                <Button size="lg" className="h-13 justify-start rounded-xl text-base" onClick={onSetor}>
                    <ArrowDownToLine className="size-5" />
                    Setor jahitan
                </Button>
                <Button size="lg" variant="outline" className="h-13 justify-start rounded-xl bg-card text-base text-primary" onClick={onAmbil}>
                    <ArrowUpFromLine className="size-5" />
                    Ambil barang
                </Button>
            </div>

            <section className="flex flex-col gap-2">
                <h2 className="text-sm font-bold">Perlu ditindaklanjuti</h2>
                <Panel className="divide-y divide-border/70 overflow-hidden">
                    {late > 0 && <RowButton icon={AlarmClock} tone="warn" title={`${late} WO lewat tenggat`} hint="Cek pekerjaan yang tertunda" onClick={onLate} />}
                    {qcPending > 0 && <RowButton icon={Truck} title={`${qcPending} pcs siap dikirim ke QC`} hint="Hasil jahit sudah terkumpul" onClick={onQc} />}
                    {late === 0 && qcPending === 0 && <p className="px-4 py-3 text-sm text-muted-foreground">Semua beres. Tidak ada yang perlu ditindaklanjuti.</p>}
                </Panel>
                <button type="button" onClick={onCatatan} className="flex min-h-11 items-center gap-2.5 px-1 text-sm text-muted-foreground hover:text-foreground">
                    <List className="size-4.5" />
                    <span className="flex-1 text-left">Lihat catatan setoran</span>
                    <ChevronRight className="size-4.5" />
                </button>
            </section>
            <SampleFootnote />
        </div>
    );
}

/* ---------- 02 Setor: pilih penjahit ---------- */

function TailorList({ tailors, onPick, selectedId, emptyText }: { tailors: ProtoTailor[]; onPick: (tailor: ProtoTailor) => void; selectedId?: number; emptyText: string }) {
    if (tailors.length === 0) return <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>;

    return (
        <ul className="flex flex-col gap-2">
            {tailors.map((tailor) => {
                const total = holdingTotal(tailor);
                return (
                    <li key={tailor.id}>
                        <button
                            type="button"
                            onClick={() => onPick(tailor)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-2xl border bg-card p-3 text-left shadow-2xs transition-colors hover:border-primary/40',
                                selectedId === tailor.id ? 'border-primary ring-2 ring-primary/15' : 'border-border/70',
                            )}
                        >
                            <Initial name={tailor.name} />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-semibold">{tailor.name}</span>
                                <span className="block text-xs text-muted-foreground">
                                    {tailor.type === 'makloon' ? 'Makloon · ' : ''}
                                    {tailor.holdings.length > 0 ? `${tailor.holdings.length} artikel sedang dikerjakan` : 'Tidak memegang barang'}
                                </span>
                            </span>
                            {total > 0 && (
                                <span className="text-right">
                                    <span className="block font-display text-lg leading-none font-bold tabular">{total}</span>
                                    <span className="text-[11px] text-muted-foreground">pcs</span>
                                </span>
                            )}
                            {selectedId === tailor.id ? <Check className="size-5 text-primary" /> : <ChevronRight className="size-5 text-muted-foreground" />}
                        </button>
                    </li>
                );
            })}
        </ul>
    );
}

function SetorTailorScreen({ tailors, onBack, onPick }: { tailors: ProtoTailor[]; onBack?: () => void; onPick: (tailor: ProtoTailor) => void }) {
    const [query, setQuery] = useState('');
    const [filter, setFilter] = useState<'holding' | 'all'>('holding');
    const shown = tailors.filter((tailor) => (filter === 'all' || holdingTotal(tailor) > 0) && tailor.name.toLowerCase().includes(query.trim().toLowerCase()));

    return (
        <>
            <ScreenHeader title="Setor jahitan" subtitle="1 dari 2 · Pilih penjahit" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4">
                <SearchField value={query} onChange={setQuery} placeholder="Cari nama penjahit" />
                <Segmented
                    options={[
                        { value: 'holding', label: 'Memegang barang' },
                        { value: 'all', label: 'Semua penjahit' },
                    ]}
                    value={filter}
                    onChange={setFilter}
                />
                <h2 className="pt-1 text-sm font-bold">Siapa yang menyetor?</h2>
                <TailorList tailors={shown} onPick={(tailor) => (holdingTotal(tailor) > 0 ? onPick(tailor) : toast.info(`${tailor.name} tidak sedang memegang barang.`))} emptyText="Tidak ada penjahit yang cocok." />
                <Note>Pilih nama, lalu catat jumlah jahitan yang diserahkan.</Note>
                <SampleFootnote />
            </div>
        </>
    );
}

/* ---------- 03 Setor: isi jumlah ---------- */

function SizeRows({ sizes, qty, onQty }: { sizes: SizeQty; qty: SizeQty; onQty: (size: string, value: number) => void }) {
    return (
        <div className="divide-y divide-border/60">
            {sortSizes(Object.keys(sizes))
                .filter((size) => sizes[size] > 0)
                .map((size) => (
                    <div key={size} className="flex items-center justify-between gap-3 py-2.5">
                        <div>
                            <p className="font-bold">{size}</p>
                            <p className="text-xs text-muted-foreground">Sisa {sizes[size]} pcs</p>
                        </div>
                        <QtyStepper value={qty[size] ?? 0} min={0} max={sizes[size]} onChange={(value) => onQty(size, value)} label={`Jumlah ukuran ${size}`} className="[&_input]:h-10 [&_input]:w-14" />
                    </div>
                ))}
        </div>
    );
}

function SelectedTailor({ label, tailor, onChange }: { label: string; tailor: ProtoTailor; onChange: () => void }) {
    return (
        <Panel className="flex items-center gap-3 p-3">
            <UserRound className="size-5 text-primary" />
            <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{tailor.name}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
            </div>
            <button type="button" onClick={onChange} className="h-12 min-w-16 rounded-lg px-3 text-sm font-semibold text-primary hover:bg-primary/8">
                Ganti
            </button>
        </Panel>
    );
}

function SetorQtyScreen({
    tailor,
    qty,
    onQty,
    onBack,
    onNext,
}: {
    tailor: ProtoTailor;
    qty: Record<string, SizeQty>;
    onQty: (holdingId: string, size: string, value: number) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const [showAll, setShowAll] = useState(tailor.holdings.length <= 1);
    const visible = showAll ? tailor.holdings : tailor.holdings.slice(0, 1);
    const total = Object.values(qty).reduce((sum, sizes) => sum + sumSizes(sizes), 0);

    return (
        <>
            <ScreenHeader title="Jumlah setoran" subtitle="2 dari 2 · Isi jumlah per ukuran" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-4">
                <SelectedTailor label={tailor.type === 'makloon' ? 'Makloon' : 'Penjahit internal'} tailor={tailor} onChange={onBack} />
                {visible.map((holding) => (
                    <Panel key={holding.id} className="px-4 pt-3 pb-1">
                        <p className="font-display text-lg font-bold">{holding.article}</p>
                        <p className="text-xs text-muted-foreground">
                            {holding.wo} · {holding.color} · {holding.workType}
                        </p>
                        <SizeRows sizes={holding.sizes} qty={qty[holding.id] ?? {}} onQty={(size, value) => onQty(holding.id, size, value)} />
                    </Panel>
                ))}
                {!showAll && (
                    <button type="button" onClick={() => setShowAll(true)} className="flex min-h-12 items-center gap-2 rounded-2xl border border-dashed border-primary/40 px-4 text-sm font-semibold text-primary">
                        <Plus className="size-4.5" />
                        Tambah artikel lain ({tailor.holdings.length - 1})
                    </button>
                )}
                <p className="text-xs text-muted-foreground">Masukkan jumlah yang benar-benar diterima.</p>
            </div>
            <ActionBar label="Total setoran" value={`${total} pcs`}>
                <Button size="lg" className="h-12 rounded-xl" disabled={total === 0} onClick={onNext}>
                    Periksa setoran
                </Button>
            </ActionBar>
        </>
    );
}

/* ---------- 04 Setor: periksa ---------- */

function ReviewLines({ title, lines }: { title: string; lines: { key: string; article: string; sub: string; sizes: SizeQty }[] }) {
    const total = lines.reduce((sum, line) => sum + sumSizes(line.sizes), 0);
    return (
        <>
            {lines.map((line) => (
                <div key={line.key} className="border-t border-border/60 pt-3">
                    <p className="font-display text-lg font-bold">{line.article}</p>
                    <p className="mb-2 text-xs text-muted-foreground">{line.sub}</p>
                    {sortSizes(Object.keys(line.sizes)).map((size) => (
                        <div key={size} className="flex justify-between py-1 text-sm">
                            <span className="text-muted-foreground">Ukuran {size}</span>
                            <span className="font-semibold tabular">{line.sizes[size]} pcs</span>
                        </div>
                    ))}
                </div>
            ))}
            <div className="mt-2 flex items-baseline justify-between border-t border-border/60 pt-3">
                <span className="text-sm font-semibold">{title}</span>
                <span className="font-display text-2xl font-bold text-primary tabular">{total} pcs</span>
            </div>
        </>
    );
}

function SetorReviewScreen({ tailor, qty, onBack, onSave }: { tailor: ProtoTailor; qty: Record<string, SizeQty>; onBack: () => void; onSave: () => void }) {
    const lines = tailor.holdings
        .map((holding) => ({
            key: holding.id,
            article: holding.article,
            sub: `${holding.wo} · ${holding.color}`,
            sizes: Object.fromEntries(Object.entries(qty[holding.id] ?? {}).filter(([, value]) => value > 0)),
        }))
        .filter((line) => sumSizes(line.sizes) > 0);

    return (
        <>
            <ScreenHeader title="Periksa setoran" subtitle="Pastikan jumlahnya sudah sesuai" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-4">
                <Panel className="flex flex-col gap-3 p-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Penjahit</p>
                        <p className="font-display text-lg font-bold">{tailor.name}</p>
                    </div>
                    <ReviewLines title="Total" lines={lines} />
                </Panel>
                <Note icon={FileText}>Setoran masuk ke catatan produksi dan perhitungan upah.</Note>
            </div>
            <ActionBar>
                <Button size="lg" className="h-12 rounded-xl" onClick={onSave}>
                    <Check />
                    Simpan setoran
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl" onClick={onBack}>
                    Ubah jumlah
                </Button>
            </ActionBar>
        </>
    );
}

/* ---------- 06 Ambil: pilih barang ---------- */

function AmbilPickScreen({
    receiver,
    stock,
    onBack,
    onReceiver,
    onPick,
}: {
    receiver: ProtoTailor;
    stock: StockItem[];
    onBack: () => void;
    onReceiver: () => void;
    onPick: (item: StockItem) => void;
}) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const shown = stock.filter((item) => sumSizes(item.sizes) > 0 && (item.article.toLowerCase().includes(q) || item.wo.toLowerCase().includes(q)));

    return (
        <>
            <ScreenHeader title="Ambil barang" subtitle="Pilih penerima dan barang yang diambil" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4">
                <button type="button" onClick={onReceiver} className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card p-3 text-left shadow-2xs">
                    <UserRound className="size-5 text-primary" />
                    <span className="min-w-0 flex-1">
                        <span className="block text-[11px] text-muted-foreground">Penerima</span>
                        <span className="block truncate font-semibold">{receiver.name}</span>
                    </span>
                    <ChevronRight className="size-5 text-muted-foreground" />
                </button>
                <SearchField value={query} onChange={setQuery} placeholder="Cari artikel atau nomor WO" />
                <h2 className="pt-1 text-sm font-bold">Barang siap diambil</h2>
                {shown.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada barang yang cocok.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {shown.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => onPick(item)}
                                    className="flex w-full items-start gap-3 rounded-2xl border border-border/70 bg-card p-3.5 text-left shadow-2xs hover:border-primary/40"
                                >
                                    <span className="min-w-0 flex-1">
                                        <span className="block font-semibold">{item.article}</span>
                                        <span className="block text-xs text-muted-foreground">
                                            {item.wo} · {item.color}
                                        </span>
                                        <span className="mt-1.5 flex justify-between text-xs">
                                            <span className="font-semibold text-primary">{sumSizes(item.sizes)} pcs tersedia</span>
                                            <span className="text-muted-foreground">{sortSizes(Object.keys(item.sizes).filter((size) => item.sizes[size] > 0)).join(' · ')}</span>
                                        </span>
                                    </span>
                                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary" aria-hidden>
                                        <Plus className="size-5" />
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
                <SampleFootnote />
            </div>
        </>
    );
}

function TailorPicker({ tailors, selectedId, onBack, onPick }: { tailors: ProtoTailor[]; selectedId: number; onBack: () => void; onPick: (tailor: ProtoTailor) => void }) {
    const [query, setQuery] = useState('');
    const shown = tailors.filter((tailor) => tailor.name.toLowerCase().includes(query.trim().toLowerCase()));

    return (
        <>
            <ScreenHeader title="Pilih penerima" subtitle="Siapa yang mengambil barang?" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-6">
                <SearchField value={query} onChange={setQuery} placeholder="Cari nama penjahit" />
                <TailorList tailors={shown} selectedId={selectedId} onPick={onPick} emptyText="Tidak ada penjahit yang cocok." />
            </div>
        </>
    );
}

/* ---------- 07 & 08 Ambil: jumlah dan periksa ---------- */

function AmbilQtyScreen({
    receiver,
    item,
    qty,
    onQty,
    onBack,
    onNext,
}: {
    receiver: ProtoTailor;
    item: StockItem;
    qty: SizeQty;
    onQty: (size: string, value: number) => void;
    onBack: () => void;
    onNext: () => void;
}) {
    const total = sumSizes(qty);

    return (
        <>
            <ScreenHeader title="Jumlah pengambilan" subtitle={`${item.article} · ${item.wo} · ${item.color}`} onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-4">
                <SelectedTailor label={receiver.type === 'makloon' ? 'Makloon' : 'Jahit lengkap'} tailor={receiver} onChange={onBack} />
                <Panel className="px-4 pt-3 pb-1">
                    <p className="font-display text-lg font-bold">Jumlah per ukuran</p>
                    <SizeRows sizes={item.sizes} qty={qty} onQty={onQty} />
                </Panel>
                <Note>Barang akan tercatat sebagai pekerjaan yang dipegang {receiver.name}.</Note>
            </div>
            <ActionBar label="Total diambil" value={`${total} pcs`}>
                <Button size="lg" className="h-12 rounded-xl" disabled={total === 0} onClick={onNext}>
                    Periksa pengambilan
                </Button>
            </ActionBar>
        </>
    );
}

function AmbilReviewScreen({ receiver, item, qty, onBack, onSave }: { receiver: ProtoTailor; item: StockItem; qty: SizeQty; onBack: () => void; onSave: () => void }) {
    const sizes = Object.fromEntries(sortSizes(Object.keys(item.sizes)).map((size) => [size, qty[size] ?? 0]));

    return (
        <>
            <ScreenHeader title="Periksa pengambilan" subtitle="Pastikan jumlahnya sudah sesuai" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-4">
                <Panel className="flex flex-col gap-3 p-4">
                    <div>
                        <p className="text-xs text-muted-foreground">Penerima</p>
                        <p className="font-display text-lg font-bold">{receiver.name}</p>
                    </div>
                    <ReviewLines title="Total" lines={[{ key: item.id, article: item.article, sub: `${item.wo} · ${item.color}`, sizes }]} />
                </Panel>
                <Note icon={FileText}>Barang tercatat sebagai pekerjaan yang dipegang penjahit.</Note>
            </div>
            <ActionBar>
                <Button size="lg" className="h-12 rounded-xl" onClick={onSave}>
                    <Check />
                    Simpan pengambilan
                </Button>
                <Button size="lg" variant="outline" className="h-12 rounded-xl" onClick={onBack}>
                    Ubah jumlah
                </Button>
            </ActionBar>
        </>
    );
}

/* ---------- 10 Produksi ---------- */

function ProduksiScreen({ workOrders, tab, onTab }: { workOrders: ProtoWorkOrder[]; tab: 'running' | 'late' | 'done'; onTab: (tab: 'running' | 'late' | 'done') => void }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const running = workOrders.filter((wo) => wo.delivered < wo.planned);
    const late = running.filter((wo) => wo.dueInDays < 0);
    const done = workOrders.filter((wo) => wo.delivered >= wo.planned);
    const list = (tab === 'running' ? running : tab === 'late' ? late : done).filter((wo) => wo.article.toLowerCase().includes(q) || wo.wo.toLowerCase().includes(q));

    return (
        <>
            <ScreenHeader title="Produksi" subtitle="Pantau pekerjaan dan tenggatnya" />
            <div className="flex flex-col gap-3 px-4">
                <SearchField value={query} onChange={setQuery} placeholder="Cari artikel atau nomor WO" />
                <Segmented
                    options={[
                        { value: 'running', label: `Berjalan · ${running.length}` },
                        { value: 'late', label: `Terlambat · ${late.length}` },
                        { value: 'done', label: `Selesai · ${done.length}` },
                    ]}
                    value={tab}
                    onChange={onTab}
                />
                {list.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada WO di sini.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {list.map((wo) => {
                            const due = dueLabel(wo.dueInDays);
                            const pct = Math.min(100, Math.round((wo.delivered / wo.planned) * 100));
                            return (
                                <li key={wo.wo}>
                                    <Panel className="p-4">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground">{wo.wo}</span>
                                            {wo.delivered < wo.planned && (
                                                <span
                                                    className={cn(
                                                        'font-semibold',
                                                        due.tone === 'late' ? 'text-stage-revision' : due.tone === 'today' ? 'text-stage-sewing' : 'text-muted-foreground',
                                                    )}
                                                >
                                                    {due.text}
                                                </span>
                                            )}
                                        </div>
                                        <p className="mt-1 font-display text-lg font-bold">{wo.article}</p>
                                        <div className="mt-2 flex justify-between text-xs">
                                            <span className="text-muted-foreground">Sudah disetor</span>
                                            <span className="font-semibold tabular">
                                                {wo.delivered} / {wo.planned} pcs
                                            </span>
                                        </div>
                                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                                            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                                        </div>
                                    </Panel>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <SampleFootnote />
            </div>
        </>
    );
}

/* ---------- 11 Menu lainnya ---------- */

function MenuScreen({ onQc, onCatatan }: { onQc: () => void; onCatatan: () => void }) {
    const soon = (label: string) => () => toast.info(`${label} belum ada di pratinjau. Di aplikasi sudah tersedia lewat menu laptop.`);

    return (
        <>
            <ScreenHeader title="Menu lainnya" subtitle="Semua fitur tetap mudah ditemukan" />
            <div className="flex flex-col gap-3 px-4">
                <section className="flex items-center gap-3 rounded-2xl bg-[image:var(--azflow-gradient)] p-4 text-white">
                    <UserRound className="size-6 text-white/75" />
                    <div>
                        <p className="font-bold">Admin OPSEW</p>
                        <p className="text-xs text-white/75">Contoh akses pemilik · menu mengikuti hak akses</p>
                    </div>
                </section>
                <h2 className="pt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Operasional</h2>
                <Panel className="divide-y divide-border/70 overflow-hidden">
                    <RowButton icon={UserCheck} title="Kehadiran penjahit" onClick={soon('Kehadiran penjahit')} />
                    <RowButton icon={Truck} title="Kirim ke QC" onClick={onQc} />
                    <RowButton icon={Wrench} title="Catat revisi" onClick={soon('Catat revisi')} />
                    <RowButton icon={List} title="Catatan setoran" onClick={onCatatan} />
                </Panel>
                <h2 className="pt-1 text-xs font-bold tracking-wide text-muted-foreground uppercase">Keuangan & data</h2>
                <Panel className="divide-y divide-border/70 overflow-hidden">
                    <RowButton icon={Banknote} title="Gaji & pembayaran" onClick={soon('Gaji & pembayaran')} />
                    <RowButton icon={Users} title="Penjahit & artikel" onClick={soon('Penjahit & artikel')} />
                    <RowButton icon={Settings} title="Pengguna & pengaturan" onClick={soon('Pengguna & pengaturan')} />
                </Panel>
                <SampleFootnote />
            </div>
        </>
    );
}

/* ---------- 12 Catatan setoran ---------- */

function CatatanScreen({ deliveries, onBack }: { deliveries: ProtoDelivery[]; onBack: () => void }) {
    const [query, setQuery] = useState('');
    const q = query.trim().toLowerCase();
    const shown = deliveries.filter((delivery) => delivery.tailor.toLowerCase().includes(q) || delivery.article.toLowerCase().includes(q));
    const total = deliveries.reduce((sum, delivery) => sum + sumSizes(delivery.sizes), 0);

    return (
        <>
            <ScreenHeader title="Catatan setoran" subtitle={formatToday()} onBack={onBack} />
            <div className="flex flex-col gap-3 px-4">
                <SearchField value={query} onChange={setQuery} placeholder="Cari penjahit atau artikel" />
                <div className="rounded-2xl bg-primary/8 p-4">
                    <p className="text-xs text-muted-foreground">Jahitan masuk hari ini</p>
                    <p className="font-display text-3xl font-bold text-primary tabular">{total} pcs</p>
                </div>
                <ul className="flex flex-col gap-2">
                    {shown.map((delivery) => (
                        <li key={delivery.id}>
                            <Panel className="flex items-start justify-between gap-3 p-3.5">
                                <div className="min-w-0">
                                    <p className="truncate font-semibold">{delivery.tailor}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {delivery.article} · {delivery.color}
                                    </p>
                                </div>
                                <div className="shrink-0 text-right">
                                    <p className="font-semibold text-primary tabular">{sumSizes(delivery.sizes)} pcs</p>
                                    <p className="text-[11px] text-muted-foreground">{formatTime(delivery.at)}</p>
                                </div>
                            </Panel>
                        </li>
                    ))}
                    {shown.length === 0 && <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Tidak ada setoran yang cocok.</p>}
                </ul>
                <SampleFootnote />
            </div>
        </>
    );
}

/* ---------- 13 Kirim ke QC ---------- */

function QcScreen({ deliveries, onBack, onSend }: { deliveries: ProtoDelivery[]; onBack: () => void; onSend: (ids: number[]) => void }) {
    const pending = useMemo(() => deliveries.filter((delivery) => !delivery.sentToQc), [deliveries]);
    const [selected, setSelected] = useState<number[]>(() => pending.map((delivery) => delivery.id));
    const [confirming, setConfirming] = useState(false);
    const chosen = pending.filter((delivery) => selected.includes(delivery.id));
    const total = chosen.reduce((sum, delivery) => sum + sumSizes(delivery.sizes), 0);

    return (
        <>
            <ScreenHeader title="Kirim ke QC" subtitle="Pilih setoran yang akan dikirim" onBack={onBack} />
            <div className="flex flex-col gap-3 px-4 pb-4">
                <section className="rounded-2xl bg-[image:var(--azflow-gradient)] p-4 text-white">
                    <p className="text-xs text-white/75">Siap dikirim</p>
                    <p className="font-display text-3xl font-black tabular">{total} pcs</p>
                </section>
                {pending.length === 0 ? (
                    <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">Semua setoran sudah dikirim ke QC.</p>
                ) : (
                    <ul className="flex flex-col gap-2">
                        {pending.map((delivery) => {
                            const checked = selected.includes(delivery.id);
                            return (
                                <li key={delivery.id}>
                                    <label className={cn('flex cursor-pointer items-start gap-3 rounded-2xl border bg-card p-3.5 shadow-2xs', checked ? 'border-primary/50' : 'border-border/70')}>
                                        <Checkbox
                                            checked={checked}
                                            onCheckedChange={(value) => setSelected((current) => (value ? [...current, delivery.id] : current.filter((id) => id !== delivery.id)))}
                                            className="mt-0.5 size-5 rounded-md"
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-semibold">{delivery.article}</span>
                                            <span className="block text-xs text-muted-foreground">
                                                {delivery.tailor} · {delivery.color}
                                            </span>
                                            <span className="mt-1 block text-xs font-semibold text-primary">{sumSizes(delivery.sizes)} pcs</span>
                                        </span>
                                    </label>
                                </li>
                            );
                        })}
                    </ul>
                )}
                <p className="text-xs text-muted-foreground">{chosen.length} setoran dipilih</p>
            </div>
            {pending.length > 0 && (
                <ActionBar>
                    {confirming ? (
                        <>
                            <p className="text-center text-sm">
                                Kirim {chosen.length} setoran ({total} pcs) ke QC?
                            </p>
                            <Button
                                size="lg"
                                className="h-12 rounded-xl"
                                onClick={() => {
                                    onSend(chosen.map((delivery) => delivery.id));
                                    setSelected([]);
                                    setConfirming(false);
                                }}
                            >
                                <Truck />
                                Ya, kirim
                            </Button>
                            <Button size="lg" variant="outline" className="h-12 rounded-xl" onClick={() => setConfirming(false)}>
                                Batal
                            </Button>
                        </>
                    ) : (
                        <Button size="lg" className="h-12 rounded-xl" disabled={chosen.length === 0} onClick={() => setConfirming(true)}>
                            <Truck />
                            Periksa kiriman · {total} pcs
                        </Button>
                    )}
                </ActionBar>
            )}
        </>
    );
}

