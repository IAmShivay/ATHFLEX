import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHmac } from 'node:crypto';
import ts from 'typescript';

const load = createRequire(import.meta.url);
const resolveModule = (id) => (id.startsWith('@/') ? moduleAt(`src/${id.slice(2)}.ts`) : load(id));
function moduleAt(path) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: resolveModule, process: { env: { SESSION_SECRET: 'test-only-session-secret-at-least-32-characters', NODE_ENV: 'test' } }, Buffer, URLSearchParams });
  return exports;
}
const sku = moduleAt('src/lib/sku-matrix.ts');
const auth = moduleAt('src/lib/auth.ts');
const callback = moduleAt('src/lib/shopify-callback.ts');

test('SKU matrix generates the agreed color and size format', () => {
  const rows = sku.buildSkuMatrix('af_jg', 'Black, Navy Blue', 'S, M');
  assert.equal(JSON.stringify(rows.map((row) => row.sku)), JSON.stringify(['AF_JG-BLACK-S','AF_JG-BLACK-M','AF_JG-NAVY-BLUE-S','AF_JG-NAVY-BLUE-M']));
});
test('SKU generation rejects collisions, empty dimensions and oversized matrices', () => {
  assert.throws(() => sku.buildSkuMatrix('AF', 'Navy Blue, navy-blue', 'M'), /same SKU/);
  assert.throws(() => sku.buildSkuMatrix('AF', 'Black', ''), /at least one/);
  assert.throws(() => sku.buildSkuMatrix('AF', Array.from({length:11},(_,i)=>`Color${i}`).join(','), Array.from({length:10},(_,i)=>`Size${i}`).join(',')), /100 combinations/);
});
test('sessions reject tampering, expiry, legacy versions and extra segments', () => {
  const payload = { uid:'1', email:'test@example.invalid', name:'Test', version:0, exp:Date.now()+60000 };
  const token = auth.signSession(payload);
  assert.equal(auth.verifySessionToken(token).uid, '1');
  assert.equal(auth.verifySessionToken(token + '.extra'), null);
  assert.equal(auth.verifySessionToken('X' + token.slice(1)), null);
  assert.equal(auth.verifySessionToken(auth.signSession({...payload, exp:Date.now()-1000})), null);
  assert.equal(auth.verifySessionToken(auth.signSession({...payload, version:undefined})), null);
});
test('password hashes verify only the correct password', () => {
  const stored = auth.hashPassword('correct-test-password');
  assert.equal(auth.verifyPassword('correct-test-password',stored), true);
  assert.equal(auth.verifyPassword('incorrect-test-password',stored), false);
});
function signedQuery() {
  const params = new URLSearchParams({ code:'test-code', shop:'example.myshopify.com', state:'nonce', timestamp:'1700000000' });
  const message = [...params].sort(([a],[b])=>a < b ? -1 : a > b ? 1 : 0).map(([k,v])=>`${k}=${v}`).join('&');
  params.set('hmac',createHmac('sha256','test-secret').update(message).digest('hex'));
  return params;
}
test('Shopify callbacks require an authentic signature for the configured shop', () => {
  assert.equal(callback.verifyShopifyCallback(signedQuery(),'test-secret','example.myshopify.com'), true);
  assert.equal(callback.verifyShopifyCallback(signedQuery(),'wrong-secret','example.myshopify.com'), false);
  assert.equal(callback.verifyShopifyCallback(signedQuery(),'test-secret','other.myshopify.com'), false);
  const changed = signedQuery(); changed.set('code','tampered');
  assert.equal(callback.verifyShopifyCallback(changed,'test-secret','example.myshopify.com'), false);
  const duplicate = signedQuery(); duplicate.append('state','another');
  assert.equal(callback.verifyShopifyCallback(duplicate,'test-secret','example.myshopify.com'), false);
  const missing = signedQuery(); missing.delete('hmac');
  assert.equal(callback.verifyShopifyCallback(missing,'test-secret','example.myshopify.com'), false);
});
