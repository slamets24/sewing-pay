/**
 * Open/closed state of a form drawer and the record it edits (null = adding a new one).
 * The target is kept while the drawer slides closed so its content does not blank out,
 * and every opening gets a new session number so the form inside starts fresh.
 */
export class SheetState<T> {
    private constructor(
        readonly open: boolean,
        readonly target: T | null,
        readonly session: number,
    ) {}

    static closed<T>(): SheetState<T> {
        return new SheetState<T>(false, null, 0);
    }

    openFor(target: T | null): SheetState<T> {
        return new SheetState(true, target, this.session + 1);
    }

    close(): SheetState<T> {
        return new SheetState(false, this.target, this.session);
    }

    /** Matches Radix's onOpenChange so the drawer can be closed with Esc or by tapping outside. */
    withOpen(open: boolean): SheetState<T> {
        return open ? new SheetState(true, this.target, this.session) : this.close();
    }
}
