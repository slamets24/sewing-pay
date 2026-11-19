/** Shapes sent by ProductionReportController. */
export type TrendDay = {
    date: string;
    label: string;
    full_date: string;
    day_name: string;
    qty: number;
    earnings: number;
    deliveries_count: number;
};

export type TopArticleVariant = {
    label: string;
    qty: number;
};

export type TopArticle = {
    id: number;
    name: string;
    brand_name: string | null;
    category_name: string | null;
    total_qty: number;
    total_earnings: number;
    percentage: number;
    deliveries_count: number;
    variants: TopArticleVariant[];
};

export type TopTailor = {
    id: number;
    name: string;
    code: string | null;
    type: string;
    total_qty: number;
    total_earnings: number;
    percentage: number;
    deliveries_count: number;
    active_days: number;
    daily_avg: number;
    top_article: string | null;
};

export type DeliveryLog = {
    id: number;
    tailor_id: number;
    tailor_name: string;
    tailor_code: string | null;
    article_name: string;
    work_order_number: string;
    color: string | null;
    size: string | null;
    qty: number;
    sewing_rate: number;
    subtotal: number;
    is_payable: boolean;
    delivered_at: string;
    qc_shipment_number: string | null;
};
