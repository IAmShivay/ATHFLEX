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
const navigation = moduleAt('src/lib/navigation.ts');
const workflow = moduleAt('src/lib/workflow.ts');
const permissions = moduleAt('src/lib/permissions.ts');

const allNavItems = () => navigation.NAV_GROUPS.flatMap((group) => group.items);
const freshStyle = { fabricAssigned: false, trimAssigned: false, skuCount: 0, ppStatus: 'pending', reworkRounds: 0, poCount: 0, issuedPoCount: 0, openPoCount: 0, piecesReceived: 0 };

test('navigation registry has unique modules and every Phase 2 module is reserved, not live', () => {
  const items = allNavItems();
  assert.equal(new Set(items.map((item) => item.key)).size, items.length);
  assert.equal(new Set(items.map((item) => item.href)).size, items.length);
  const phase2 = navigation.NAV_GROUPS.find((group) => group.phase === 'phase2');
  assert.equal(JSON.stringify(phase2.items.map((item) => item.key)), JSON.stringify(['ecommerce', 'inventory', 'forecasting', 'product-planning', 'purchase-planning']));
  for (const item of phase2.items) {
    assert.equal(item.status, 'planned');
    assert.ok(item.href.startsWith('/planning/'));
    assert.ok(item.summary);
  }
});

test('navigation only shows modules a user may use and keeps Phase 2 placeholders off until switched on', () => {
  const inwardOnly = navigation.visibleGroups(false, (permission) => permission === 'inward');
  const live = inwardOnly.flatMap((group) => group.items).filter((item) => item.status === 'live').map((item) => item.key);
  assert.equal(JSON.stringify(live), JSON.stringify(['inward', 'settings']));
  assert.equal(navigation.SHOW_PLANNED_MODULES, false);
  assert.ok(!inwardOnly.some((group) => group.phase === 'phase2'));
  const admin = navigation.visibleGroups(true, () => true).flatMap((group) => group.items).map((item) => item.key);
  assert.ok(admin.includes('users'));
  assert.ok(!navigation.visibleGroups(false, () => true).flatMap((group) => group.items).some((item) => item.key === 'users'));
});

test('navigation highlights the right module for nested and print routes', () => {
  const byKey = (key) => allNavItems().find((item) => item.key === key);
  assert.equal(navigation.isItemActive(byKey('dashboard'), '/'), true);
  assert.equal(navigation.isItemActive(byKey('dashboard'), '/techpacks'), false);
  assert.equal(navigation.isItemActive(byKey('fob-pos'), '/purchase-orders/7'), true);
  assert.equal(navigation.isItemActive(byKey('fob-pos'), '/print/purchase-orders/7/qr'), true);
  assert.equal(navigation.isItemActive(byKey('techpacks'), '/techpacks-archive'), false);
});

test('sidebar tabs follow the Phase 1 flow order from the workflow document', () => {
  const order = allNavItems().map((item) => item.key);
  const flow = ['techpacks', 'fabric-master', 'trim-master', 'skus', 'pp-approvals', 'fob-pos', 'inward', 'reports'];
  assert.equal(JSON.stringify(order.filter((key) => flow.includes(key))), JSON.stringify(flow));
  assert.equal(JSON.stringify(navigation.NAV_GROUPS.map((group) => group.key)), JSON.stringify(['overview', 'techpack-sku', 'approval-po', 'qr-inward', 'reports', 'planning', 'administration']));
});

test('fabric and trim masters highlight independently', () => {
  const byKey = (key) => allNavItems().find((item) => item.key === key);
  assert.equal(navigation.isItemActive(byKey('fabric-master'), '/materials/fabric'), true);
  assert.equal(navigation.isItemActive(byKey('fabric-master'), '/materials/trim'), false);
  assert.equal(navigation.isItemActive(byKey('trim-master'), '/materials/trim'), true);
});

test('workflow follows the ten Phase 1 steps in the agreed order', () => {
  assert.equal(JSON.stringify(workflow.PHASE1_WORKFLOW.map((step) => step.key)), JSON.stringify(['techpack', 'fabric', 'trim', 'sku', 'pp', 'po', 'qr', 'stick', 'inward', 'reports']));
  assert.equal(workflow.PHASE1_WORKFLOW.find((step) => step.key === 'stick').offline, true);
});

test('a brand new style is done at step 1 and points to the fabric master next', () => {
  const states = workflow.styleWorkflowStates(freshStyle);
  assert.equal(states.techpack, 'done');
  assert.equal(states.fabric, 'current');
  assert.equal(states.pp, 'upcoming');
  assert.equal(states.stick, 'offline');
});

test('a rejected PP sample shows rework instead of silently blocking the flow', () => {
  const states = workflow.styleWorkflowStates({ ...freshStyle, fabricAssigned: true, trimAssigned: true, skuCount: 6, ppStatus: 'rejected', reworkRounds: 1 });
  assert.equal(states.pp, 'rework');
  assert.equal(states.po, 'upcoming');
  assert.ok(!Object.values(states).includes('current'));
});

test('a style moves through PO, QR and inward to reports', () => {
  const ordered = { ...freshStyle, fabricAssigned: true, trimAssigned: true, skuCount: 6, ppStatus: 'approved', poCount: 1, issuedPoCount: 1, openPoCount: 1 };
  assert.equal(workflow.styleWorkflowStates(ordered).stick, 'current');
  const receiving = workflow.styleWorkflowStates({ ...ordered, piecesReceived: 3 });
  assert.equal(receiving.inward, 'current');
  assert.equal(receiving.stick, 'done');
  const finished = workflow.styleWorkflowStates({ ...ordered, piecesReceived: 5, openPoCount: 0 });
  assert.equal(finished.inward, 'done');
  assert.equal(finished.reports, 'done');
});

test('portfolio summaries pluralise counts for the dashboard tracker', () => {
  const summaries = workflow.portfolioSummaries({ styles: 1, fabricStyles: 0, trimStyles: 1, styledWithSkus: 1, skus: 6, ppPending: 0, ppRework: 1, ppApproved: 0, pos: 2, issuedPos: 1, piecesOrdered: 1, piecesReceived: 0 });
  assert.equal(summaries.techpack, '1 style');
  assert.equal(summaries.fabric, '0 of 1 style tagged');
  assert.equal(summaries.sku, '6 SKUs');
  assert.equal(summaries.inward, '0 of 1 piece');
  assert.equal(summaries.pp, '0 approved · 0 pending · 1 rework');
});

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

const staff = (...granted) => ({ role: 'staff', permissions: granted });
const landingFor = (user) => navigation.landingPath(user.role === 'admin', (permission) => permissions.hasPermission(user, permission));

test('a PP approver can open tech packs and the PP queue they were invited to decide on', () => {
  const approver = staff('pp_approve');
  assert.equal(permissions.hasPermission(approver, 'techpacks'), true);
  assert.equal(permissions.hasPermission(approver, 'techpacks_manage'), false);
  assert.equal(permissions.hasPermission(approver, 'production'), false);
  const links = navigation.visibleGroups(false, (permission) => permissions.hasPermission(approver, permission)).flatMap((group) => group.items).map((item) => item.key);
  assert.ok(links.includes('pp-approvals'));
});

test('an invited user lands on the first module they can use, not an empty settings page', () => {
  assert.equal(landingFor({ role: 'admin', permissions: [] }), '/');
  assert.equal(landingFor(staff('dashboard', 'techpacks')), '/');
  assert.equal(landingFor(staff('techpacks')), '/techpacks');
  assert.equal(landingFor(staff('pp_approve')), '/techpacks');
  assert.equal(landingFor(staff('production_manage')), '/jobbers');
  assert.equal(landingFor(staff('inward')), '/inward');
  assert.equal(landingFor(staff('production_reports')), '/reports');
  assert.equal(landingFor(staff('analytics')), '/analytics');
  assert.equal(landingFor(staff()), '/settings');
});
