import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

registerHooks({
    resolve(specifier, context, next) {
        if (specifier.startsWith('@/')) {
            const base = path.resolve('resources/js', specifier.slice(2));
            const file = ['.tsx', '.ts'].map(ext => base + ext).find(existsSync);
            if (file) return { url: pathToFileURL(file).href, shortCircuit: true };
        }
        return next(specifier, context);
    },
    load(url, context, next) {
        if (/\.(tsx|ts)$/.test(url) && url.startsWith('file:')) {
            const source = readFileSync(fileURLToPath(url), 'utf8');
            return {
                format: 'module', shortCircuit: true,
                source: ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext } }).outputText,
            };
        }
        return next(url, context);
    },
});
const { Card } = await import('../../resources/js/components/ui/card.tsx');
const { Button } = await import('../../resources/js/components/ui/button.tsx');
const { Progress } = await import('../../resources/js/components/ui/progress.tsx');
const { Table } = await import('../../resources/js/components/ui/table.tsx');
const { FormField } = await import('../../resources/js/components/form-field.tsx');
const { Input } = await import('../../resources/js/components/ui/input.tsx');
const { PasswordField } = await import('../../resources/js/components/sewing/master/password-field.tsx');
const { Checkbox } = await import('../../resources/js/components/ui/checkbox.tsx');
const { Label } = await import('../../resources/js/components/ui/label.tsx');
const render = (component, props, children) => renderToStaticMarkup(React.createElement(component, props, children));

test('cards can keep an existing article root and its layout classes', () => {
    const html = render(Card, { asChild: true }, React.createElement('article', { className: 'grid gap-3 p-4', id: 'existing-panel' }, 'Isi'));
    assert.match(html, /^<article /);
    assert.match(html, /data-slot="card"/);
    assert.match(html, /class="[^"]*grid gap-3 p-4/);
    assert.doesNotMatch(html, /flex-col|py-6/);
});

test('custom picker buttons keep layout and explicit button type', () => {
    const html = render(Button, { variant: 'plain', size: 'plain', type: 'button', className: 'grid grid-cols-2 p-3', 'aria-pressed': true }, 'Pilih');
    assert.match(html, /type="button"/);
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /grid grid-cols-2 p-3/);
    assert.match(html, /focus-visible:ring/);
    assert.doesNotMatch(html, /inline-flex|h-11|px-5|whitespace-nowrap/);
});

test('progress exposes the displayed value and supports production status colors', () => {
    const html = render(Progress, { value: 45, 'aria-label': 'Selesai jahit', indicatorClassName: 'bg-stage-done' });
    assert.match(html, /aria-valuenow="45"/);
    assert.match(html, /aria-label="Selesai jahit"/);
    assert.match(html, /translateX\(-55%\)/);
    assert.match(html, /class="[^"]*bg-stage-done/);
    assert.doesNotMatch(html, /indicatorClassName=/);
});

test('tables can reuse an existing scroll container without an extra wrapper', () => {
    const html = render(Table, { scrollContainer: false, className: 'w-full text-xs' }, React.createElement('tbody', null, React.createElement('tr', null, React.createElement('td', null, 'Isi'))));
    assert.match(html, /^<table /);
    assert.match(html, /data-slot="table"/);
    assert.doesNotMatch(html, /scrollContainer=/);
});

test('field errors are announced and associated without losing existing input hints', () => {
    const html = render(FormField, { label: 'Email', htmlFor: 'account-email', error: 'Email sudah digunakan.' }, React.createElement(Input, { id: 'account-email', 'aria-describedby': 'email-hint' }));
    const errorId = html.match(/<p[^>]*id="([^"]+)"[^>]*role="alert"/)?.[1];
    assert.ok(errorId, 'The visible error needs an accessible identifier and alert role');
    assert.match(html, new RegExp(`<input[^>]*aria-describedby="email-hint ${errorId}"`));
    assert.match(html, /<input[^>]*aria-invalid="true"/);
    assert.match(html, /<label[^>]*for="account-email"/);
});

test('a nested password input receives its field error and accessible label', () => {
    const html = render(FormField, { label: 'Password baru', htmlFor: 'new-password', error: 'Minimal 8 karakter.' }, React.createElement(PasswordField, { id: 'new-password', value: '', onChange: () => {} }));
    assert.match(html, /<input[^>]*aria-invalid="true"/);
    assert.match(html, /<input[^>]*aria-describedby="[^"]+"/);
    assert.match(html, /<input[^>]*aria-labelledby="[^"]+"/);
    const validHtml = render(FormField, { label: 'Nama', htmlFor: 'name' }, React.createElement(Input, { id: 'name' }));
    assert.doesNotMatch(validHtml, /aria-invalid="true"|role="alert"/);
});

test('checkbox choices retain their individual labels inside a field group', () => {
    const html = render(FormField, { label: 'Hak akses', error: 'Pilih hak akses.' }, React.createElement('div', null,
        React.createElement(Checkbox, { id: 'ability-view' }),
        React.createElement(Label, { htmlFor: 'ability-view' }, 'Lihat laporan'),
    ));
    const checkbox = html.match(/<button[^>]*role="checkbox"[^>]*>/)?.[0];
    assert.ok(checkbox);
    assert.match(checkbox, /aria-describedby="[^"]+"/);
    assert.doesNotMatch(checkbox, /aria-labelledby=/);
    assert.match(html, /for="ability-view"/);
});
