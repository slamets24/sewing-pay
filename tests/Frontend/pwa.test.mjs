import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

test('manifest contains standalone launch and installable icons', async () => {
    const manifest = JSON.parse(await readFile('public/manifest.webmanifest', 'utf8'));
    assert.equal(manifest.display, 'standalone');
    assert.equal(manifest.start_url, '/');
    for (const size of ['192x192', '512x512']) {
        const icon = manifest.icons.find((item) => item.sizes === size);
        assert.ok(icon);
        await readFile(`public${icon.src}`);
    }
});

test('offline fallback is limited to failed page navigation', async () => {
    const handlers = {};
    const self = { addEventListener: (name, handler) => { handlers[name] = handler; } };
    const offline = new Response('offline');
    const caches = { open: async () => ({ add: async () => {}, match: async () => offline }) };
    const source = await readFile('public/service-worker.js', 'utf8');
    vm.runInNewContext(source, { self, caches, fetch: async () => { throw new Error('offline'); } });
    let result;
    handlers.fetch({ request: { mode: 'navigate', method: 'GET' }, respondWith: (promise) => { result = promise; } });
    assert.equal(await result, offline);
    result = undefined;
    handlers.fetch({ request: { mode: 'cors', method: 'GET' }, respondWith: (promise) => { result = promise; } });
    assert.equal(result, undefined);
});
