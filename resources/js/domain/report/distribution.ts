export type DistributionBrand = { key: string; name: string; qty: number };
export type DistributionTailor = {
    id: number;
    name: string;
    type: 'internal' | 'makloon';
    qty: number;
    amount: number;
    segments: Record<string, { qty: number; amount: number }>;
};
export type Distribution = { brands: DistributionBrand[]; tailors: DistributionTailor[] };

export type Measure = 'qty' | 'amount';
export type TailorScope = 'internal' | 'makloon' | 'all';

/** Warna tetap per brand menurut urutan dari server (terbanyak dulu); "Lainnya" selalu abu-abu. */
export function brandColor(brand: DistributionBrand, index: number): string {
    return brand.key === 'other' ? 'var(--series-8)' : `var(--series-${Math.min(index + 1, 7)})`;
}

export type BrandEvenness = {
    brand: DistributionBrand;
    color: string;
    total: number;
    average: number;
    min: { value: number; name: string };
    max: { value: number; name: string };
    takers: number;
    tailorCount: number;
    /** Koefisien variasi (simpangan baku ÷ rata-rata). 0 = rata sempurna. */
    spread: number;
    level: 'even' | 'fair' | 'uneven';
};

export function valueOf(segment: { qty: number; amount: number } | undefined, measure: Measure): number {
    return segment ? segment[measure] : 0;
}

export function filterTailors(tailors: DistributionTailor[], scope: TailorScope): DistributionTailor[] {
    return scope === 'all' ? tailors : tailors.filter((tailor) => tailor.type === scope);
}

/**
 * Pemerataan per brand: rata-rata per penjahit (penjahit yang tidak dapat brand itu dihitung 0),
 * terendah, tertinggi, dan seberapa timpang (koefisien variasi).
 */
export function brandEvenness(brands: DistributionBrand[], tailors: DistributionTailor[], measure: Measure): BrandEvenness[] {
    const n = tailors.length;
    if (n === 0) return [];

    return brands
        .map((brand, index) => {
            const values = tailors.map((tailor) => ({ name: tailor.name, value: valueOf(tailor.segments[brand.key], measure) }));
            const total = values.reduce((sum, entry) => sum + entry.value, 0);
            const average = total / n;
            const variance = values.reduce((sum, entry) => sum + (entry.value - average) ** 2, 0) / n;
            const spread = average > 0 ? Math.sqrt(variance) / average : 0;
            const sorted = [...values].sort((a, b) => a.value - b.value);

            return {
                brand,
                color: brandColor(brand, index),
                total,
                average,
                min: sorted[0],
                max: sorted[sorted.length - 1],
                takers: values.filter((entry) => entry.value > 0).length,
                tailorCount: n,
                spread,
                level: spread <= 0.25 ? 'even' : spread <= 0.5 ? 'fair' : 'uneven',
            } satisfies BrandEvenness;
        })
        .filter((row) => row.total > 0);
}

/** Angka sumbu yang enak dibaca (1, 2, 5 × 10^n) di atas nilai maksimum. */
export function niceMax(value: number): number {
    if (value <= 0) return 1;
    const power = 10 ** Math.floor(Math.log10(value));
    const step = [1, 2, 2.5, 5, 10].find((factor) => factor * power >= value) ?? 10;
    return step * power;
}
