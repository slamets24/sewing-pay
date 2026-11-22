import { createContext, useContext, type AriaAttributes } from 'react';

type FieldAccessibility = {
    labelId: string;
    errorId?: string;
    invalid: boolean;
};

export const FieldContext = createContext<FieldAccessibility | null>(null);

export function useFieldAccessibility(props: AriaAttributes, { inheritLabel = true }: { inheritLabel?: boolean } = {}) {
    const field = useContext(FieldContext);
    const describedBy = [...new Set([props['aria-describedby'], field?.errorId].filter(Boolean))].join(' ') || undefined;

    return {
        'aria-invalid': field?.invalid || props['aria-invalid'],
        'aria-describedby': describedBy,
        'aria-labelledby': props['aria-labelledby'] ?? (inheritLabel && !props['aria-label'] ? field?.labelId : undefined),
    };
}
