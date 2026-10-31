import { EmptyState } from '@/components/empty-state';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatIdr, joinMeta } from '@/lib/format';
import type { Assignment } from '@/types';
import { PackageCheck } from 'lucide-react';
import { useState } from 'react';

export function MonitoringCard({ assignments }: { assignments: Assignment[] }) {
    const [search, setSearch] = useState('');

    const query = search.trim().toLowerCase();
    const filtered = query
        ? assignments.filter((assignment) =>
              [assignment.tailor_name, assignment.article_name, assignment.color, assignment.size, assignment.work_type_name, assignment.status_label]
                  .filter(Boolean)
                  .join(' ')
                  .toLowerCase()
                  .includes(query),
          )
        : assignments;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <PackageCheck className="size-4" />
                    Sedang Dikerjakan
                </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
                <Input
                    aria-label="Cari pekerjaan aktif"
                    placeholder="Cari penjahit, hancaan, warna, size, atau status"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                />
                {!filtered.length ? (
                    <EmptyState>Belum ada hancaan yang sedang dikerjakan.</EmptyState>
                ) : (
                    <>
                        <div className="hidden md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Penjahit</TableHead>
                                        <TableHead>Hancaan</TableHead>
                                        <TableHead className="text-right">Progress</TableHead>
                                        <TableHead className="text-right">Sisa</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Estimasi</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filtered.map((assignment) => (
                                        <TableRow key={assignment.id}>
                                            <TableCell className="font-medium">{assignment.tailor_name}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1">
                                                    <span>{assignment.article_name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        {joinMeta(assignment.color, assignment.size, assignment.work_type_name)}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">
                                                {assignment.completed_qty} / {assignment.assigned_qty}
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{assignment.remaining_qty}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">{assignment.status_label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-right tabular-nums">{formatIdr(assignment.running_subtotal)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="grid gap-3 md:hidden">
                            {filtered.map((assignment) => (
                                <article key={assignment.id} className="rounded-lg border p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="font-medium">{assignment.tailor_name}</h3>
                                            <p className="text-sm text-muted-foreground">{assignment.article_name}</p>
                                        </div>
                                        <Badge variant="secondary">{assignment.status_label}</Badge>
                                    </div>
                                    <Separator className="my-3" />
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div>
                                            <p className="text-muted-foreground">Diambil</p>
                                            <p className="font-medium">{assignment.assigned_qty}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Selesai</p>
                                            <p className="font-medium">{assignment.completed_qty}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Sisa</p>
                                            <p className="font-medium">{assignment.remaining_qty}</p>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
