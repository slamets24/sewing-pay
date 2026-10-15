const idrFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

const compactIdrFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    notation: 'compact',
    maximumFractionDigits: 1,
});

export const formatIdr = (value: number) => idrFormatter.format(value);

/** Short form for tight spaces, e.g. "Rp 1,3 jt". */
export const formatIdrCompact = (value: number) => compactIdrFormatter.format(value);

export const joinMeta = (...parts: Array<string | null | undefined>) => parts.filter(Boolean).join(' / ');

export const progressPercent = (done: number, total: number) => Math.min(100, Math.round((done / Math.max(total, 1)) * 100));

const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const parseLocal = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value.replace(' ', 'T'));

/** "02 Okt 2026" from "2026-10-02". */
export const formatDate = (value: string | null | undefined) => (value ? dateFormatter.format(parseLocal(value)) : '-');

/** "02 Okt 14.30" from "2026-10-02 14:30". */
export const formatDateTime = (value: string | null | undefined) => (value ? dateTimeFormatter.format(parseLocal(value)) : '-');

/** Days from today until a date (negative = already past). */
export const daysUntil = (value: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return Math.round((parseLocal(value).getTime() - today.getTime()) / 86_400_000);
};

/** Plain-language deadline, e.g. "Lewat 2 hari", "Hari ini", "3 hari lagi". */
export const dueLabel = (value: string | null | undefined) => {
    if (!value) return null;

    const days = daysUntil(value);

    if (days < 0) return `Lewat ${Math.abs(days)} hari`;
    if (days === 0) return 'Hari ini';
    if (days === 1) return 'Besok';

    return `${days} hari lagi`;
};

export const todayIso = () => {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

export const variantLabel = (color: string | null, size: string | null) => [color, size].filter(Boolean).join(' · ');
