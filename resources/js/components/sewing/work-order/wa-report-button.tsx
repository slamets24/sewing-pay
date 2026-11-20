import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { copyText, whatsappShareUrl } from '@/domain/work-order/wa-report';
import { Copy, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';

type WaReportButtonProps = {
    /** Teks laporan yang disalin / dikirim. */
    text: string;
    label?: string;
    disabled?: boolean;
    size?: 'default' | 'lg';
};

/** Laporan WO ke grup WhatsApp: salin teks atau buka WhatsApp dengan teks terisi. */
export function WaReportButton({ text, label = 'Laporan WA', disabled, size = 'default' }: WaReportButtonProps) {
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
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
