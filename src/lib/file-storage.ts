import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

export type StoredFile = { backend: "database" | "r2"; key: string | null; bucket: string | null; content: Buffer | null };

function r2Config() {
  const account = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  if (![account, bucket, accessKeyId, secretAccessKey].some(Boolean)) return null;
  if (!account || !bucket || !accessKeyId || !secretAccessKey) throw new Error("The R2 connection is incomplete. Complete its server configuration before uploading.");
  if (!/^[a-f0-9]{32}$/i.test(account)) throw new Error("The R2 account ID is invalid.");
  return { bucket, client: new S3Client({ region: "auto", endpoint: `https://${account}.r2.cloudflarestorage.com`, credentials: { accessKeyId, secretAccessKey }, maxAttempts: 3 }) };
}

export async function storeFile(data: Buffer, mime: string): Promise<StoredFile> {
  const config = r2Config();
  if (!config) return { backend: "database", key: null, bucket: null, content: data };
  const key = `techpacks/${randomUUID()}`;
  try {
    await config.client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: data, ContentType: mime, ContentLength: data.length }));
    return { backend: "r2", key, bucket: config.bucket, content: null };
  } finally { config.client.destroy(); }
}

export async function readStoredFile(file: StoredFile): Promise<Uint8Array> {
  if (file.backend === "database" && file.content) return new Uint8Array(file.content);
  const config = r2Config();
  if (!config || !file.key || !file.bucket) throw new Error("The file storage connection is unavailable.");
  try {
    const object = await config.client.send(new GetObjectCommand({ Bucket: file.bucket, Key: file.key }));
    if (!object.Body) throw new Error("File content is unavailable.");
    return await object.Body.transformToByteArray();
  } finally { config.client.destroy(); }
}

// Only used to undo new uploads when their database transaction cannot be saved.
export async function discardNewUpload(file: StoredFile) {
  if (file.backend !== "r2" || !file.key || !file.bucket) return;
  const config = r2Config();
  if (!config) return;
  try { await config.client.send(new DeleteObjectCommand({ Bucket: file.bucket, Key: file.key })); }
  finally { config.client.destroy(); }
}
