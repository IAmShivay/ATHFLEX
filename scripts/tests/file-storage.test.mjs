import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
const load = createRequire(import.meta.url);

function storage(env = {}, fail = false) {
  const calls = [];
  class Command { constructor(input) { this.input = input; } }
  class PutObjectCommand extends Command {}
  class GetObjectCommand extends Command {}
  class DeleteObjectCommand extends Command {}
  const sdk = { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, S3Client: class {
    constructor(config) { calls.push({ config }); }
    async send(command) { calls.push(command); if (fail) throw new Error('Storage unavailable'); return { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } }; }
    destroy() {}
  }};
  const source = ts.transpileModule(fs.readFileSync('src/lib/file-storage.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, process: { env }, Buffer, require: (name) => name === '@aws-sdk/client-s3' ? sdk : load(name) });
  return { api: exports, calls, PutObjectCommand, GetObjectCommand, DeleteObjectCommand };
}
const config = { R2_ACCOUNT_ID: 'a'.repeat(32), R2_BUCKET_NAME: 'configured-bucket', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret' };

test('unconfigured storage keeps original bytes in the database without a network call', async () => {
  const { api, calls } = storage();
  const original = Buffer.from('image-data');
  const file = await api.storeFile(original, 'image/png');
  assert.equal(file.backend, 'database'); assert.equal(file.content, original); assert.equal(file.key, null);
  assert.deepEqual(Array.from(await api.readStoredFile(file)), Array.from(original)); assert.equal(calls.length, 0);
});
test('partial R2 settings fail without silently storing the upload elsewhere', async () => {
  const { api } = storage({ R2_BUCKET_NAME: 'bucket-only' });
  await assert.rejects(api.storeFile(Buffer.from('data'), 'image/png'), /incomplete/);
});
test('R2 uploads retain only object metadata and reads use the recorded bucket', async () => {
  const { api, calls, PutObjectCommand, GetObjectCommand } = storage(config);
  const file = await api.storeFile(Buffer.from('image-data'), 'image/png');
  assert.equal(file.backend, 'r2'); assert.equal(file.content, null); assert.match(file.key, /^techpacks\/[a-f0-9-]+$/);
  const put = calls.find((call) => call instanceof PutObjectCommand);
  assert.equal(put.input.Bucket, 'configured-bucket'); assert.equal(put.input.ContentType, 'image/png');
  assert.equal(calls[0].config.endpoint, `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`);
  assert.deepEqual(Array.from(await api.readStoredFile({ ...file, bucket: 'original-bucket' })), [1, 2, 3]);
  assert.equal(calls.find((call) => call instanceof GetObjectCommand).input.Bucket, 'original-bucket');
});
test('failed R2 uploads propagate the failure', async () => {
  await assert.rejects(storage(config, true).api.storeFile(Buffer.from('data'), 'image/png'), /Storage unavailable/);
});
test('compensation deletes only the new R2 object, never a database file', async () => {
  const { api, calls, DeleteObjectCommand } = storage(config);
  await api.discardNewUpload({ backend: 'database', content: Buffer.from('data'), key: null, bucket: null });
  assert.equal(calls.length, 0);
  await api.discardNewUpload({ backend: 'r2', content: null, key: 'techpacks/test-object', bucket: 'original-bucket' });
  const removed = calls.find((call) => call instanceof DeleteObjectCommand);
  assert.equal(removed.input.Key, 'techpacks/test-object'); assert.equal(removed.input.Bucket, 'original-bucket');
});
