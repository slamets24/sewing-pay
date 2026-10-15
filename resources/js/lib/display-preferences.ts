export type TextScale = 'normal' | 'large' | 'xlarge';

type StoredPreferences = { textScale?: TextScale; highContrast?: boolean };

const STORAGE_KEY = 'sweing-pay:display';

/**
 * Per-device reading aids for older eyes: bigger text and a high-contrast palette.
 * Stored in localStorage (best effort) and applied as classes on <html>, which the CSS scales from.
 */
export class DisplayPreferences {
    static readonly scales: { value: TextScale; label: string }[] = [
        { value: 'normal', label: 'Normal' },
        { value: 'large', label: 'Besar' },
        { value: 'xlarge', label: 'Sangat besar' },
    ];

    private constructor(
        readonly textScale: TextScale,
        readonly highContrast: boolean,
    ) {}

    static load(): DisplayPreferences {
        let stored: StoredPreferences = {};

        try {
            stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}') as StoredPreferences;
        } catch {
            stored = {};
        }

        const scale = DisplayPreferences.scales.some((option) => option.value === stored.textScale) ? stored.textScale! : 'normal';

        return new DisplayPreferences(scale, stored.highContrast === true);
    }

    withTextScale(textScale: TextScale): DisplayPreferences {
        return new DisplayPreferences(textScale, this.highContrast);
    }

    withHighContrast(highContrast: boolean): DisplayPreferences {
        return new DisplayPreferences(this.textScale, highContrast);
    }

    /** Steps through normal → besar → sangat besar → normal. */
    nextTextScale(): DisplayPreferences {
        const index = DisplayPreferences.scales.findIndex((option) => option.value === this.textScale);

        return this.withTextScale(DisplayPreferences.scales[(index + 1) % DisplayPreferences.scales.length].value);
    }

    get textScaleLabel(): string {
        return DisplayPreferences.scales.find((option) => option.value === this.textScale)?.label ?? 'Normal';
    }

    apply(): void {
        const root = document.documentElement;

        root.classList.toggle('text-large', this.textScale === 'large');
        root.classList.toggle('text-xlarge', this.textScale === 'xlarge');
        root.classList.toggle('contrast-high', this.highContrast);

        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ textScale: this.textScale, highContrast: this.highContrast }));
        } catch {
            // Private mode or blocked storage: the choice simply lasts for this page view.
        }
    }
}
