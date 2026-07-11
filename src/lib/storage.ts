import { mkdir, writeFile, readFile, stat } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);

export async function storeFile(
  fileName: string,
  buffer: Buffer,
  mime: string
): Promise<string> {
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}_${safeName}`;

  if (useBlob()) {
    const blob = await put(storedName, buffer, {
      access: "public",
      contentType: mime,
    });
    return blob.url;
  }

  const uploadsDir = path.join(process.cwd(), "uploads");
  await mkdir(uploadsDir, { recursive: true });
  const filePath = path.join(uploadsDir, storedName);
  await writeFile(filePath, buffer);
  return storedName;
}

export async function readStoredFile(filePath: string): Promise<{
  buffer: Buffer;
  exists: boolean;
}> {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    const res = await fetch(filePath);
    if (!res.ok) return { buffer: Buffer.alloc(0), exists: false };
    return { buffer: Buffer.from(await res.arrayBuffer()), exists: true };
  }

  const absolutePath = path.join(process.cwd(), "uploads", filePath);
  try {
    await stat(absolutePath);
    const buffer = await readFile(absolutePath);
    return { buffer, exists: true };
  } catch {
    return { buffer: Buffer.alloc(0), exists: false };
  }
}
