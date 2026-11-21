import { FormField } from '@/components/form-field';
import { NowDateTimeInput } from '@/components/sewing/now-datetime-input';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ArticlePicker } from '@/components/sewing/work-order/article-picker';
import { WorkOrderHeaderFields, type HeaderValues } from '@/components/sewing/work-order/header-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { variantLabel } from '@/lib/format';
import type { CatalogArticle, CuttingReceiptRecord, HancaanReceiptRecord, WorkOrderDetail, WorkOrderItemRecord } from '@/types/sewing';
import { useForm } from '@inertiajs/react';
import { useState, type ReactNode } from 'react';

type SheetFormProps = {
    trigger: ReactNode;
    title: string;
    description?: ReactNode;
    submitLabel: string;
    processing: boolean;
    onSubmit: (close: () => void) => void;
    onOpen?: () => void;
    children: ReactNode;
};

/** Side sheet holding one small form, closed automatically after a successful save. */
function SheetForm({ trigger, title, description, submitLabel, processing, onSubmit, onOpen, children }: SheetFormProps) {
    const [open, setOpen] = useState(false);

    return (
        <Sheet
            open={open}
            onOpenChange={(next) => {
                setOpen(next);
                if (next) onOpen?.();
            }}
        >
            <SheetTrigger asChild>{trigger}</SheetTrigger>
            <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
                <SheetHeader>
                    <SheetTitle className="text-2xl">{title}</SheetTitle>
                    {description && <SheetDescription className="text-base">{description}</SheetDescription>}
                </SheetHeader>
                {/* min-h-0: tanpa ini isi form memanjang melebihi layar dan tidak bisa di-scroll. */}
                <form
                    className="flex min-h-0 flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(() => setOpen(false));
                    }}
                >
                    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-4">{children}</div>
                    <SheetFooter className="border-t bg-background pb-[calc(1rem+env(safe-area-inset-bottom))]">
                        <Button type="submit" size="lg" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export function TransferCuttingSheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const form = useForm({ qty: Math.max(1, item.printing_qty), transferred_at: '', notes: '' });

    return (
        <SheetForm
            trigger={trigger}
            title="Kirim kain ke cutting"
            description={`${item.article_name} · ${variantLabel(item.color, item.size)} — sisa di printing: ${item.printing_qty} pcs`}
            submitLabel="Simpan kirim ke cutting"
            processing={form.processing}
            onOpen={() => form.setData({ qty: Math.max(1, item.printing_qty), transferred_at: '', notes: '' })}
            onSubmit={(close) => form.post(route('cutting-receipts.store', item.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Jumlah kirim" error={form.errors.qty}>
                <QtyStepper value={form.data.qty} min={1} onChange={(qty) => form.setData('qty', qty)} />
            </FormField>
            {form.data.qty > item.printing_qty && (
                <p className="text-sm font-semibold text-stage-sewing">Maksimal sisa di printing adalah {item.printing_qty} pcs.</p>
            )}
            <FormField label="Tanggal kirim" htmlFor={`transfer-${item.id}-date`} error={form.errors.transferred_at}>
                <NowDateTimeInput id={`transfer-${item.id}-date`} value={form.data.transferred_at} onChange={(value) => form.setData('transferred_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor={`transfer-${item.id}-notes`} error={form.errors.notes}>
                <Input id={`transfer-${item.id}-notes`} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </SheetForm>
    );
}

export function ReceiveHancaanSheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const readyQty = item.cutting_qty;
    const form = useForm({ qty: Math.max(1, readyQty), received_at: '', notes: '' });

    return (
        <SheetForm
            trigger={trigger}
            title="Hancaan masuk gudang"
            description={`${item.article_name} · ${variantLabel(item.color, item.size)} — ada di cutting: ${item.cutting_qty} pcs`}
            submitLabel="Simpan masuk gudang"
            processing={form.processing}
            onOpen={() => form.setData({ qty: Math.max(1, item.cutting_qty), received_at: '', notes: '' })}
            onSubmit={(close) => form.post(route('hancaan-receipts.store', item.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Jumlah masuk" error={form.errors.qty}>
                <QtyStepper value={form.data.qty} min={1} onChange={(qty) => form.setData('qty', qty)} />
            </FormField>
            {form.data.qty > item.cutting_qty && (
                <p className="text-sm font-semibold text-stage-sewing">
                    {item.is_polosan ? `Sisa di cutting: ${item.cutting_qty} pcs.` : `Di cutting hanya ada ${item.cutting_qty} pcs yang siap masuk gudang.`}
                </p>
            )}
            <FormField label="Tanggal masuk" htmlFor={`receive-${item.id}-date`} error={form.errors.received_at}>
                <NowDateTimeInput id={`receive-${item.id}-date`} value={form.data.received_at} onChange={(value) => form.setData('received_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor={`receive-${item.id}-notes`} error={form.errors.notes}>
                <Input id={`receive-${item.id}-notes`} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </SheetForm>
    );
}

export function EditCuttingReceiptSheet({ receipt, trigger }: { receipt: CuttingReceiptRecord; trigger: ReactNode }) {
    const form = useForm({ qty: receipt.qty });

    return (
        <SheetForm
            trigger={trigger}
            title="Ubah qty kirim ke cutting"
            description={`${receipt.article_name} · ${variantLabel(receipt.color, receipt.size)}`}
            submitLabel="Simpan perubahan"
            processing={form.processing}
            onOpen={() => form.setData({ qty: receipt.qty })}
            onSubmit={(close) => form.patch(route('cutting-receipts.update', receipt.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Qty kirim" error={form.errors.qty}>
                <QtyStepper value={form.data.qty} min={1} onChange={(qty) => form.setData('qty', qty)} />
            </FormField>
        </SheetForm>
    );
}

export function EditHancaanReceiptSheet({ receipt, trigger }: { receipt: HancaanReceiptRecord; trigger: ReactNode }) {
    const form = useForm({ qty: receipt.qty });

    return (
        <SheetForm
            trigger={trigger}
            title="Ubah qty hancaan masuk"
            description={`${receipt.article_name} · ${variantLabel(receipt.color, receipt.size)}`}
            submitLabel="Simpan perubahan"
            processing={form.processing}
            onOpen={() => form.setData({ qty: receipt.qty })}
            onSubmit={(close) => form.patch(route('hancaan-receipts.update', receipt.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Qty masuk" error={form.errors.qty}>
                <QtyStepper value={form.data.qty} min={1} onChange={(qty) => form.setData('qty', qty)} />
            </FormField>
        </SheetForm>
    );
}

export function BatchTransferCuttingSheet({
    workOrderId,
    items,
    trigger,
    onSuccess,
}: {
    workOrderId: number;
    items: WorkOrderItemRecord[];
    trigger: ReactNode;
    onSuccess?: () => void;
}) {
    const initialData = () => ({
        items: items.map((item) => ({ work_order_item_id: item.id, qty: item.printing_qty })),
        transferred_at: '',
        notes: '',
    });

    const form = useForm(initialData());
    const totalQty = form.data.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const updateItemQty = (itemId: number, qty: number) => {
        form.setData(
            'items',
            form.data.items.map((i) => (i.work_order_item_id === itemId ? { ...i, qty } : i)),
        );
    };

    return (
        <SheetForm
            trigger={trigger}
            title="Kirim ke cutting massal"
            description={`${items.length} artikel dipilih (${totalQty} pcs)`}
            submitLabel={`Simpan kirim ${totalQty} pcs`}
            processing={form.processing}
            onOpen={() => form.setData(initialData())}
            onSubmit={(close) =>
                form.post(route('cutting-receipts.batch', workOrderId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        close();
                        onSuccess?.();
                    },
                })
            }
        >
            <div className="flex flex-col gap-3 divide-y">
                {items.map((item) => {
                    const line = form.data.items.find((i) => i.work_order_item_id === item.id);
                    const qty = line?.qty ?? item.printing_qty;

                    return (
                        <div key={item.id} className="flex items-center justify-between gap-3 pt-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold">{item.article_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {variantLabel(item.color, item.size)} · Sisa print: {item.printing_qty} pcs
                                </p>
                            </div>
                            <div className="w-28 shrink-0">
                                <Input
                                    type="number"
                                    min={1}
                                    max={item.printing_qty}
                                    value={qty}
                                    onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                                    className="text-center font-bold"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <FormField label="Tanggal kirim" htmlFor="batch-transfer-date" error={form.errors.transferred_at}>
                <NowDateTimeInput id="batch-transfer-date" value={form.data.transferred_at} onChange={(value) => form.setData('transferred_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor="batch-transfer-notes" error={form.errors.notes}>
                <Input id="batch-transfer-notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
            </FormField>
        </SheetForm>
    );
}

export function BatchReceiveHancaanSheet({
    workOrderId,
    items,
    trigger,
    onSuccess,
}: {
    workOrderId: number;
    items: WorkOrderItemRecord[];
    trigger: ReactNode;
    onSuccess?: () => void;
}) {
    const initialData = () => ({
        items: items.map((item) => ({ work_order_item_id: item.id, qty: item.cutting_qty })),
        received_at: '',
        notes: '',
    });

    const form = useForm(initialData());
    const totalQty = form.data.items.reduce((sum, i) => sum + (Number(i.qty) || 0), 0);

    const updateItemQty = (itemId: number, qty: number) => {
        form.setData(
            'items',
            form.data.items.map((i) => (i.work_order_item_id === itemId ? { ...i, qty } : i)),
        );
    };

    return (
        <SheetForm
            trigger={trigger}
            title="Hancaan masuk gudang massal"
            description={`${items.length} artikel dipilih (${totalQty} pcs)`}
            submitLabel={`Simpan masuk ${totalQty} pcs`}
            processing={form.processing}
            onOpen={() => form.setData(initialData())}
            onSubmit={(close) =>
                form.post(route('hancaan-receipts.batch', workOrderId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        close();
                        onSuccess?.();
                    },
                })
            }
        >
            <div className="flex flex-col gap-3 divide-y">
                {items.map((item) => {
                    const line = form.data.items.find((i) => i.work_order_item_id === item.id);
                    const qty = line?.qty ?? item.cutting_qty;

                    return (
                        <div key={item.id} className="flex items-center justify-between gap-3 pt-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold">{item.article_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {variantLabel(item.color, item.size)} · Ada di cutting: {item.cutting_qty} pcs
                                </p>
                            </div>
                            <div className="w-28 shrink-0">
                                <Input
                                    type="number"
                                    min={1}
                                    max={item.cutting_qty}
                                    value={qty}
                                    onChange={(e) => updateItemQty(item.id, Number(e.target.value))}
                                    className="text-center font-bold"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <FormField label="Tanggal masuk" htmlFor="batch-receive-date" error={form.errors.received_at}>
                <NowDateTimeInput id="batch-receive-date" value={form.data.received_at} onChange={(value) => form.setData('received_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor="batch-receive-notes" error={form.errors.notes}>
                <Input id="batch-receive-notes" value={form.data.notes} onChange={(e) => form.setData('notes', e.target.value)} />
            </FormField>
        </SheetForm>
    );
}

export function PlannedQtySheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const form = useForm({ planned_qty: item.planned_qty });

    return (
        <SheetForm
            trigger={trigger}
            title="Ubah qty WO"
            description={`${item.article_name} · ${variantLabel(item.color, item.size)}`}
            submitLabel="Simpan"
            processing={form.processing}
            onOpen={() => form.setData('planned_qty', item.planned_qty)}
            onSubmit={(close) => form.patch(route('work-order-items.update', item.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Qty WO" error={form.errors.planned_qty}>
                <QtyStepper value={form.data.planned_qty} min={Math.max(1, item.min_planned_qty)} onChange={(qty) => form.setData('planned_qty', qty)} />
            </FormField>
            {item.min_planned_qty > 0 && (
                <p className="text-sm text-muted-foreground">Minimal {item.min_planned_qty} pcs, karena sudah sebanyak itu yang jalan ke cutting / gudang.</p>
            )}
        </SheetForm>
    );
}

export function AddItemSheet({ workOrderId, articles, trigger }: { workOrderId: number; articles: CatalogArticle[]; trigger: ReactNode }) {
    const form = useForm<{ article_id: number | null; color: string; size: string; item_type: 'print' | 'polosan'; planned_qty: number }>({
        article_id: null,
        color: '',
        size: '',
        item_type: 'print',
        planned_qty: 1,
    });

    return (
        <SheetForm
            trigger={trigger}
            title="Tambah baris artikel"
            submitLabel="Tambahkan"
            processing={form.processing}
            onOpen={() => form.reset()}
            onSubmit={(close) => form.post(route('work-order-items.store', workOrderId), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Tipe artikel">
                <div className="flex gap-2">
                    <Button
                        type="button"
                        size="sm"
                        variant={form.data.item_type === 'print' ? 'default' : 'outline'}
                        onClick={() => form.setData('item_type', 'print')}
                    >
                        PRINT
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant={form.data.item_type === 'polosan' ? 'default' : 'outline'}
                        onClick={() => form.setData('item_type', 'polosan')}
                    >
                        POLOSAN
                    </Button>
                </div>
            </FormField>
            <FormField label="Artikel" error={form.errors.article_id}>
                <ArticlePicker articles={articles} value={form.data.article_id} onChange={(articleId) => form.setData('article_id', articleId)} />
            </FormField>
            <FormField label="Warna" htmlFor="add-item-color" error={form.errors.color}>
                <Input id="add-item-color" value={form.data.color} onChange={(event) => form.setData('color', event.target.value)} />
            </FormField>
            <FormField label="Ukuran" htmlFor="add-item-size" error={form.errors.size}>
                <Input id="add-item-size" value={form.data.size} onChange={(event) => form.setData('size', event.target.value.toUpperCase())} className="uppercase" />
            </FormField>
            <FormField label="Qty WO" error={form.errors.planned_qty}>
                <QtyStepper value={form.data.planned_qty} min={1} onChange={(qty) => form.setData('planned_qty', qty)} />
            </FormField>
        </SheetForm>
    );
}

export function EditWorkOrderSheet({ workOrder, trigger }: { workOrder: WorkOrderDetail; trigger: ReactNode }) {
    const initial = (): HeaderValues => ({
        number: workOrder.number,
        channel: workOrder.channel ?? '',
        category: workOrder.category ?? '',
        ordered_at: workOrder.ordered_at ?? '',
        due_at: workOrder.due_at ?? '',
        notes: workOrder.notes ?? '',
    });
    const form = useForm<HeaderValues>(initial());

    return (
        <SheetForm
            trigger={trigger}
            title="Ubah data WO"
            submitLabel="Simpan perubahan"
            processing={form.processing}
            onOpen={() => form.setData(initial())}
            onSubmit={(close) => form.patch(route('work-orders.update', workOrder.id), { preserveScroll: true, onSuccess: close })}
        >
            <div className="[&>div]:grid-cols-1 [&>div]:lg:grid-cols-1">
                <WorkOrderHeaderFields values={form.data} onChange={(changes) => form.setData({ ...form.data, ...changes })} errors={form.errors} idPrefix="wo-edit" />
            </div>
        </SheetForm>
    );
}

/** Proses vendor (Bordir, Prisket, ...) yang masih punya barang menunggu dikirim di baris-baris ini. */
export function vendorProcessesToSend(items: WorkOrderItemRecord[]): string[] {
    const names: string[] = [];

    items.forEach((item) =>
        (item.vendor_steps ?? []).forEach((step) => {
            if (step.waiting_qty > 0 && !names.includes(step.process)) names.push(step.process);
        }),
    );

    return names;
}

const waitingFor = (item: WorkOrderItemRecord, process: string) => item.vendor_steps?.find((step) => step.process === process)?.waiting_qty ?? 0;

/** Hancaan keluar gudang ke vendor untuk satu proses; bisa satu baris atau banyak baris sekaligus. */
export function SendToVendorSheet({
    workOrderId,
    items,
    vendorNames = [],
    trigger,
    onSuccess,
}: {
    workOrderId: number;
    items: WorkOrderItemRecord[];
    vendorNames?: string[];
    trigger: ReactNode;
    onSuccess?: () => void;
}) {
    const processes = vendorProcessesToSend(items);
    const linesFor = (process: string) =>
        items.filter((item) => waitingFor(item, process) > 0).map((item) => ({ work_order_item_id: item.id, qty: waitingFor(item, process) }));
    const initialData = (process = processes[0] ?? '') => ({ process, vendor_name: '', items: linesFor(process), sent_at: '', notes: '' });

    const form = useForm(initialData());
    const totalQty = form.data.items.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);

    const chooseProcess = (process: string) => form.setData({ ...form.data, process, items: linesFor(process) });
    const updateQty = (itemId: number, qty: number) =>
        form.setData(
            'items',
            form.data.items.map((line) => (line.work_order_item_id === itemId ? { ...line, qty } : line)),
        );

    return (
        <SheetForm
            trigger={trigger}
            title="Kirim ke vendor"
            description={`Hancaan keluar gudang untuk proses ${form.data.process || '-'} (${totalQty} pcs)`}
            submitLabel={`Simpan kirim ${totalQty} pcs`}
            processing={form.processing}
            onOpen={() => form.setData(initialData())}
            onSubmit={(close) =>
                form.post(route('vendor-jobs.send', workOrderId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        close();
                        onSuccess?.();
                    },
                })
            }
        >
            {processes.length > 1 && (
                <FormField label="Proses" error={form.errors.process}>
                    <div className="flex flex-wrap gap-2">
                        {processes.map((process) => (
                            <Button key={process} type="button" variant={form.data.process === process ? 'default' : 'outline'} onClick={() => chooseProcess(process)}>
                                {process}
                            </Button>
                        ))}
                    </div>
                </FormField>
            )}
            <FormField label="Nama vendor" htmlFor={`vendor-name-${workOrderId}`} error={form.errors.vendor_name}>
                <Input
                    id={`vendor-name-${workOrderId}`}
                    list={`vendor-names-${workOrderId}`}
                    value={form.data.vendor_name}
                    placeholder="Misal: Bordir Pak Ujang"
                    onChange={(event) => form.setData('vendor_name', event.target.value)}
                />
                <datalist id={`vendor-names-${workOrderId}`}>
                    {vendorNames.map((name) => (
                        <option key={name} value={name} />
                    ))}
                </datalist>
            </FormField>
            {form.errors.items && <p className="text-sm font-semibold text-destructive">{form.errors.items}</p>}
            <div className="flex flex-col gap-3 divide-y">
                {form.data.items.map((line) => {
                    const item = items.find((candidate) => candidate.id === line.work_order_item_id);
                    if (!item) return null;
                    const waiting = waitingFor(item, form.data.process);

                    return (
                        <div key={item.id} className="flex items-center justify-between gap-3 pt-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold">{item.article_name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {variantLabel(item.color, item.size)} · Siap dikirim: {waiting} pcs
                                </p>
                            </div>
                            <div className="w-28 shrink-0">
                                <Input
                                    type="number"
                                    min={0}
                                    max={waiting}
                                    value={line.qty}
                                    aria-label={`Qty kirim ${item.article_name} ${variantLabel(item.color, item.size)}`}
                                    onChange={(event) => updateQty(item.id, Number(event.target.value))}
                                    className="text-center font-bold"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <FormField label="Tanggal kirim" htmlFor={`vendor-send-${workOrderId}-date`} error={form.errors.sent_at}>
                <NowDateTimeInput id={`vendor-send-${workOrderId}-date`} value={form.data.sent_at} onChange={(value) => form.setData('sent_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor={`vendor-send-${workOrderId}-notes`} error={form.errors.notes}>
                <Input id={`vendor-send-${workOrderId}-notes`} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </SheetForm>
    );
}

/** Barang dari vendor masuk gudang lagi; satu baris atau banyak baris sekaligus. */
export function ReceiveFromVendorSheet({
    workOrderId,
    items,
    trigger,
    onSuccess,
}: {
    workOrderId: number;
    items: WorkOrderItemRecord[];
    trigger: ReactNode;
    onSuccess?: () => void;
}) {
    const jobs = items.flatMap((item) => (item.open_vendor_jobs ?? []).map((job) => ({ ...job, item })));
    const initialData = () => ({ items: jobs.map((job) => ({ vendor_job_id: job.id, qty: job.open_qty })), returned_at: '', notes: '' });

    const form = useForm(initialData());
    const totalQty = form.data.items.reduce((sum, line) => sum + (Number(line.qty) || 0), 0);
    const updateQty = (jobId: number, qty: number) =>
        form.setData(
            'items',
            form.data.items.map((line) => (line.vendor_job_id === jobId ? { ...line, qty } : line)),
        );

    return (
        <SheetForm
            trigger={trigger}
            title="Terima dari vendor"
            description={`Barang kembali masuk gudang (${totalQty} pcs)`}
            submitLabel={`Simpan masuk ${totalQty} pcs`}
            processing={form.processing}
            onOpen={() => form.setData(initialData())}
            onSubmit={(close) =>
                form.post(route('vendor-jobs.receive', workOrderId), {
                    preserveScroll: true,
                    onSuccess: () => {
                        close();
                        onSuccess?.();
                    },
                })
            }
        >
            {form.errors.items && <p className="text-sm font-semibold text-destructive">{form.errors.items}</p>}
            <div className="flex flex-col gap-3 divide-y">
                {jobs.map((job) => {
                    const line = form.data.items.find((candidate) => candidate.vendor_job_id === job.id);

                    return (
                        <div key={job.id} className="flex items-center justify-between gap-3 pt-3">
                            <div className="min-w-0 flex-1">
                                <p className="font-bold">
                                    {job.item.article_name} · {variantLabel(job.item.color, job.item.size)}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                    {job.process} · {job.vendor_name} · masih di vendor {job.open_qty} pcs
                                </p>
                            </div>
                            <div className="w-28 shrink-0">
                                <Input
                                    type="number"
                                    min={0}
                                    max={job.open_qty}
                                    value={line?.qty ?? job.open_qty}
                                    aria-label={`Qty terima ${job.item.article_name} ${job.process}`}
                                    onChange={(event) => updateQty(job.id, Number(event.target.value))}
                                    className="text-center font-bold"
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
            <FormField label="Tanggal masuk" htmlFor={`vendor-receive-${workOrderId}-date`} error={form.errors.returned_at}>
                <NowDateTimeInput id={`vendor-receive-${workOrderId}-date`} value={form.data.returned_at} onChange={(value) => form.setData('returned_at', value)} />
            </FormField>
            <FormField label="Catatan" htmlFor={`vendor-receive-${workOrderId}-notes`} error={form.errors.notes}>
                <Input id={`vendor-receive-${workOrderId}-notes`} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </SheetForm>
    );
}
