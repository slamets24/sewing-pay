<script setup lang="ts">
import { Badge } from '@/Components/ui/badge';
import { Button } from '@/Components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/Components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/Components/ui/table';
import { Head } from '@inertiajs/vue3';
import { MessageCircle } from '@lucide/vue';

type SlipLine = {
    id: number;
    article_name: string;
    color: string | null;
    size: string | null;
    work_type_name: string;
    completed_qty: number;
    unit_rate_amount: number;
    subtotal_amount: number;
    completed_at: string;
};

const props = defineProps<{
    slip: {
        invoice_number: string;
        status_label: string;
        completed_qty: number;
        gross_amount: number;
        bonus_amount: number;
        deduction_amount: number;
        net_amount: number;
        whatsapp_url: string | null;
        tailor: { name: string; code: string; whatsapp_number: string | null };
        period: { code: string; starts_at: string; ends_at: string; status_label: string };
        lines: SlipLine[];
    };
}>();

const formatIdr = (value: number) => new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
}).format(value);

const lineMeta = (line: SlipLine) => [line.color, line.size, line.work_type_name].filter(Boolean).join(' / ');
</script>

<template>
    <Head :title="`Slip Gaji ${slip.invoice_number}`" />

    <main class="min-h-screen bg-background px-4 py-6 text-foreground sm:px-6 lg:px-8">
        <div class="mx-auto flex max-w-5xl flex-col gap-5">
            <section class="flex flex-col gap-4 rounded-lg border bg-card p-5 sm:flex-row sm:items-start sm:justify-between">
                <div class="flex flex-col gap-2">
                    <div class="flex flex-wrap items-center gap-2">
                        <h1 class="text-2xl font-semibold tracking-normal">Slip Gaji Jahit</h1>
                        <Badge variant="secondary">{{ slip.status_label }}</Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">{{ slip.invoice_number }}</p>
                    <div class="text-sm">
                        <p class="font-medium">{{ slip.tailor.name }} / {{ slip.tailor.code }}</p>
                        <p class="text-muted-foreground">Periode {{ slip.period.starts_at }} - {{ slip.period.ends_at }}</p>
                    </div>
                </div>
                <a v-if="slip.whatsapp_url" :href="slip.whatsapp_url" target="_blank" rel="noreferrer">
                    <Button>
                        <MessageCircle data-icon="inline-start" />
                        Kirim WhatsApp
                    </Button>
                </a>
            </section>

            <section class="grid gap-3 sm:grid-cols-4">
                <Card>
                    <CardHeader class="pb-3">
                        <CardDescription>Total Qty</CardDescription>
                        <CardTitle class="text-2xl">{{ slip.completed_qty }}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader class="pb-3">
                        <CardDescription>Gaji Kotor</CardDescription>
                        <CardTitle class="text-xl">{{ formatIdr(slip.gross_amount) }}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader class="pb-3">
                        <CardDescription>Bonus / Potongan</CardDescription>
                        <CardTitle class="text-xl">{{ formatIdr(slip.bonus_amount - slip.deduction_amount) }}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader class="pb-3">
                        <CardDescription>Total Diterima</CardDescription>
                        <CardTitle class="text-xl">{{ formatIdr(slip.net_amount) }}</CardTitle>
                    </CardHeader>
                </Card>
            </section>

            <Card>
                <CardHeader>
                    <CardTitle class="text-base">Detail Pekerjaan</CardTitle>
                    <CardDescription>Semua item sudah memakai snapshot tarif saat pekerjaan dicatat selesai.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div class="hidden overflow-x-auto md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Artikel</TableHead>
                                    <TableHead class="text-right">Qty</TableHead>
                                    <TableHead class="text-right">Tarif</TableHead>
                                    <TableHead class="text-right">Subtotal</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow v-for="line in slip.lines" :key="line.id">
                                    <TableCell>{{ line.completed_at }}</TableCell>
                                    <TableCell>
                                        <div class="flex flex-col gap-1">
                                            <span>{{ line.article_name }}</span>
                                            <span class="text-xs text-muted-foreground">{{ lineMeta(line) }}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell class="text-right">{{ line.completed_qty }}</TableCell>
                                    <TableCell class="text-right">{{ formatIdr(line.unit_rate_amount) }}</TableCell>
                                    <TableCell class="text-right font-medium">{{ formatIdr(line.subtotal_amount) }}</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </div>
                    <div class="grid gap-3 md:hidden">
                        <article v-for="line in slip.lines" :key="line.id" class="rounded-lg border p-3">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <p class="font-medium">{{ line.article_name }}</p>
                                    <p class="text-sm text-muted-foreground">{{ lineMeta(line) }}</p>
                                    <p class="text-xs text-muted-foreground">{{ line.completed_at }}</p>
                                </div>
                                <p class="shrink-0 text-sm font-semibold">{{ formatIdr(line.subtotal_amount) }}</p>
                            </div>
                            <p class="mt-2 text-sm text-muted-foreground">{{ line.completed_qty }} pcs x {{ formatIdr(line.unit_rate_amount) }}</p>
                        </article>
                    </div>
                </CardContent>
            </Card>
        </div>
    </main>
</template>
