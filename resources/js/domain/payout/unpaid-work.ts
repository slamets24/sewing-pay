export type UnpaidWorkProps = {
    delivery_amount: number;
    delivery_qty: number;
    revision_amount: number;
};

/** Everything earned but not on any slip yet (up to today), as sent by the pay run index. */
export class UnpaidWork {
    constructor(private readonly props: UnpaidWorkProps) {}

    get deliveryAmount(): number {
        return this.props.delivery_amount;
    }

    get deliveryQty(): number {
        return this.props.delivery_qty;
    }

    get revisionAmount(): number {
        return this.props.revision_amount;
    }

    get total(): number {
        return this.deliveryAmount + this.revisionAmount;
    }
}
