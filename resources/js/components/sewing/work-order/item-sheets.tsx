import { FormField } from '@/components/form-field';
import { QtyStepper } from '@/components/sewing/qty-stepper';
import { ArticlePicker } from '@/components/sewing/work-order/article-picker';
import { WorkOrderHeaderFields, type HeaderValues } from '@/components/sewing/work-order/header-fields';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { variantLabel } from '@/lib/format';
import type { CatalogArticle, WorkOrderDetail, WorkOrderItemRecord } from '@/types/sewing';
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
                <form
                    className="flex flex-1 flex-col"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onSubmit(() => setOpen(false));
                    }}
                >
                    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4">{children}</div>
                    <SheetFooter>
                        <Button type="submit" size="lg" disabled={processing}>
                            {submitLabel}
                        </Button>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    );
}

export function ReceiveHancaanSheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const form = useForm({ qty: Math.max(1, item.pending_qty), received_at: '', notes: '' });

    return (
        <SheetForm
            trigger={trigger}
            title="Hancaan masuk gudang"
            description={`${item.article_name} · ${variantLabel(item.color, item.size)} — masih di divisi lain: ${item.pending_qty} pcs`}
            submitLabel="Simpan masuk gudang"
            processing={form.processing}
            onOpen={() => form.setData({ qty: Math.max(1, item.pending_qty), received_at: '', notes: '' })}
            onSubmit={(close) => form.post(route('hancaan-receipts.store', item.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Jumlah yang masuk" error={form.errors.qty}>
                <QtyStepper value={form.data.qty} min={1} onChange={(qty) => form.setData('qty', qty)} />
            </FormField>
            {form.data.qty > item.pending_qty && <p className="text-sm font-semibold text-stage-sewing">Lebih banyak dari sisa rencana WO ({item.pending_qty}). Tetap boleh disimpan.</p>}
            <FormField label="Tanggal masuk (kosongkan = sekarang)" htmlFor={`receive-${item.id}-date`} error={form.errors.received_at}>
                <Input id={`receive-${item.id}-date`} type="datetime-local" value={form.data.received_at} onChange={(event) => form.setData('received_at', event.target.value)} />
            </FormField>
            <FormField label="Catatan (opsional)" htmlFor={`receive-${item.id}-notes`} error={form.errors.notes}>
                <Input id={`receive-${item.id}-notes`} value={form.data.notes} onChange={(event) => form.setData('notes', event.target.value)} />
            </FormField>
        </SheetForm>
    );
}

export function PlannedQtySheet({ item, trigger }: { item: WorkOrderItemRecord; trigger: ReactNode }) {
    const form = useForm({ planned_qty: item.planned_qty });

    return (
        <SheetForm
            trigger={trigger}
            title="Ubah qty rencana"
            description={`${item.article_name} · ${variantLabel(item.color, item.size)}`}
            submitLabel="Simpan"
            processing={form.processing}
            onOpen={() => form.setData('planned_qty', item.planned_qty)}
            onSubmit={(close) => form.patch(route('work-order-items.update', item.id), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Qty rencana (sesuai WO)" error={form.errors.planned_qty}>
                <QtyStepper value={form.data.planned_qty} min={1} onChange={(qty) => form.setData('planned_qty', qty)} />
            </FormField>
        </SheetForm>
    );
}

export function AddItemSheet({ workOrderId, articles, trigger }: { workOrderId: number; articles: CatalogArticle[]; trigger: ReactNode }) {
    const form = useForm<{ article_id: number | null; color: string; size: string; planned_qty: number }>({ article_id: null, color: '', size: '', planned_qty: 1 });

    return (
        <SheetForm
            trigger={trigger}
            title="Tambah baris artikel"
            submitLabel="Tambahkan"
            processing={form.processing}
            onOpen={() => form.reset()}
            onSubmit={(close) => form.post(route('work-order-items.store', workOrderId), { preserveScroll: true, onSuccess: close })}
        >
            <FormField label="Artikel" error={form.errors.article_id}>
                <ArticlePicker articles={articles} value={form.data.article_id} onChange={(articleId) => form.setData('article_id', articleId)} />
            </FormField>
            <FormField label="Warna" htmlFor="add-item-color" error={form.errors.color}>
                <Input id="add-item-color" value={form.data.color} onChange={(event) => form.setData('color', event.target.value)} />
            </FormField>
            <FormField label="Ukuran" htmlFor="add-item-size" error={form.errors.size}>
                <Input id="add-item-size" value={form.data.size} onChange={(event) => form.setData('size', event.target.value.toUpperCase())} className="uppercase" />
            </FormField>
            <FormField label="Qty rencana" error={form.errors.planned_qty}>
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
