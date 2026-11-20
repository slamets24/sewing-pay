import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { copyText, whatsappShareUrl } from '@/domain/work-order/wa-report';
import { Copy, ExternalLink, Link2, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

type WaReportButtonProps = {
    /** Teks laporan yang disalin / dikirim. */
    text: string;
    /** Tautan WO publik (lampiran), kalau hanya satu WO. */
    publicUrl?: string;
    label?: string;
    disabled?: boolean;
    size?: 'default' | 'lg';
};

/** Laporan WO ke grup WhatsApp: salin teks, buka WhatsApp, atau salin/buka tautan WO publik. */
export function WaReportButton({ text, publicUrl, label = 'Laporan WA', disabled, size = 'default' }: WaReportButtonProps) {
    const copy = async (value: string, message: string) => {
        if (await copyText(value)) toast.success(message);
        else toast.error('Gagal menyalin. Coba lewat tombol Buka WhatsApp.');
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size={size} disabled={disabled}>
                    <MessageCircle />
                    {label}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuItem onSelect={() => copy(text, 'Teks laporan disalin. Tinggal tempel di grup WA.')}>
                    <Copy />
                    Salin teks laporan
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => window.open(whatsappShareUrl(text), '_blank', 'noopener')}>
                    <Send />
                    Buka WhatsApp (pilih grup)
                </DropdownMenuItem>
                {publicUrl && (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={() => copy(publicUrl, 'Tautan WO publik disalin.')}>
                            <Link2 />
                            Salin tautan WO publik
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => window.open(publicUrl, '_blank', 'noopener')}>
                            <ExternalLink />
                            Lihat WO publik
                        </DropdownMenuItem>
                    </>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
