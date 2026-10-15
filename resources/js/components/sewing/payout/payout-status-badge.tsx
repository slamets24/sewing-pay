import { ToneBadge } from '@/components/sewing/tone-badge';
import { PayoutTone, type PayoutStatus } from '@/domain/payout/payout-tone';
import { ToneStyle } from '@/lib/tone';
import { cn } from '@/lib/utils';
import { CircleCheck, Clock } from 'lucide-react';

type PayoutStatusBadgeProps = {
    status: PayoutStatus;
    label: string;
    /** Filled pill with an icon, for dark backgrounds such as the slip header band. */
    solid?: boolean;
    className?: string;
};

/** Draft (yellow) or paid (green) status of a pay run or a slip. */
export function PayoutStatusBadge({ status, label, solid = false, className }: PayoutStatusBadgeProps) {
    const tone = PayoutTone.forStatus(status);

    if (!solid) {
        return (
            <ToneBadge tone={tone} className={className}>
                {label}
            </ToneBadge>
        );
    }

    const Icon = status === 'paid' ? CircleCheck : Clock;

    return (
        <span className={cn('inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-base font-bold whitespace-nowrap', ToneStyle.solid(tone), className)}>
            <Icon className="size-4" aria-hidden />
            {label}
        </span>
    );
}
