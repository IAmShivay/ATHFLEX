import { getOptionalUser } from "@/lib/dal";
import { query } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { readStoredFile } from "@/lib/file-storage";

export async function GET(request: Request, context: RouteContext<"/api/techpacks/files/[id]">) {
  const user = await getOptionalUser();
  if (!user) return new Response("Unauthorized", { status: 401 });
  if (!hasPermission(user, "techpacks")) return new Response("Forbidden", { status: 403 });
  const { id: rawId } = await context.params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id < 1) return new Response("Not found", { status: 404 });
  const { rows } = await query<{ original_name: string; mime_type: string; content: Buffer | null; storage_backend: "database" | "r2"; object_key: string | null; object_bucket: string | null }>("SELECT original_name,mime_type,content,storage_backend,object_key,object_bucket FROM techpack_files WHERE id=$1", [id]);
  const file = rows[0];
  if (!file) return new Response("Not found", { status: 404 });
  const filename = encodeURIComponent(file.original_name.toWellFormed()).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
  const preview = new URL(request.url).searchParams.get("preview") === "1" && ["image/jpeg","image/png","image/webp"].includes(file.mime_type);
  try {
    const content = await readStoredFile({ backend: file.storage_backend, content: file.content, key: file.object_key, bucket: file.object_bucket });
    return new Response(new Uint8Array(content), { headers: { "Content-Type": file.mime_type, "Content-Disposition": `${preview ? "inline" : "attachment"}; filename="attachment"; filename*=UTF-8''${filename}`, "X-Content-Type-Options": "nosniff", "Cache-Control": "private, no-store", "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch (error) {
    console.error("Tech pack file retrieval failed", error);
    return new Response("File storage is temporarily unavailable.", { status: 503 });
  }
}
