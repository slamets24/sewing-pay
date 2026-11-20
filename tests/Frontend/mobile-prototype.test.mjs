import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemo, commitDraft, validateDraft, quantityTotal } from '../../resources/js/Pages/MobilePrototype/demo.ts';

test('pengambilan mengurangi stok dan menambah pegangan penjahit tanpa mengubah sumber', () => {
    const initial = createDemo();
    const draft = { mode: 'ambil', tailorId: 1, items: [{ articleId: 1, qty: { M: 12, L: 12, XL: 0 } }] };
    const result = commitDraft(initial, draft, '10.00');
    assert.equal(quantityTotal(result.stock[1]), 56);
    assert.equal(quantityTotal(result.holdings[1][1]), 72);
    assert.equal(quantityTotal(initial.stock[1]), 80);
});

test('setoran berpindah dari pegangan ke riwayat dan antrean QC', () => {
    const initial = createDemo();
    const draft = { mode: 'setor', tailorId: 1, items: [{ articleId: 1, qty: { M: 12, L: 8, XL: 4 } }] };
    const result = commitDraft(initial, draft, '10.00');
    assert.equal(quantityTotal(result.holdings[1][1]), 24);
    assert.equal(result.deliveries.length, initial.deliveries.length + 1);
    assert.equal(result.deliveries[0].shipped, false);
    assert.deepEqual(result.deliveries[0].qty, draft.items[0].qty);
    assert.equal(quantityTotal(result.stock[1]), 80);
});

test('jumlah kosong, pecahan, negatif, kelebihan stok, dan artikel ganda ditolak', () => {
    const state = createDemo();
    for (const qty of [0, -1, 1.5, 31, Infinity, NaN]) {
        const draft = { mode: 'ambil', tailorId: 1, items: [{ articleId: 1, qty: { M: qty, L: 0, XL: 0 } }] };
        assert.ok(validateDraft(state, draft));
        assert.throws(() => commitDraft(state, draft, '10.00'));
    }
    const item = { articleId: 1, qty: { M: 1, L: 0, XL: 0 } };
    assert.ok(validateDraft(state, { mode: 'ambil', tailorId: 1, items: [item, item] }));
    assert.ok(validateDraft(state, { mode: 'setor', tailorId: 5, items: [item] }));
});
