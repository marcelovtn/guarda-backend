import { HTTPException } from "hono/http-exception";
import {
  deleteFromR2,
  getPresignedUploadUrl,
  uploadToR2,
} from "../../../lib/r2.js";

// Allowlist de tipos aceitos. Estenda conforme o projeto precisar
// (PDFs, vídeos, etc.). Mantido em imagens por ser o caso mais comum.
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .toLowerCase()
    .slice(0, 40);
}

// Key genérica: <folder>/<uuid>.<ext>. `folder` é um namespace livre
// definido pelo projeto (ex.: "avatars", "documents", "reports/ft7").
// Sem acoplamento de domínio — quem chama decide a estrutura de pastas.
export function buildStorageKey(params: {
  folder: string;
  fileName: string;
  uuid: string;
}): string {
  const { folder, fileName, uuid } = params;
  const ext = fileName.split(".").pop() ?? "bin";
  // Permite subpastas no folder (ex.: "reports/ft7"), slugificando cada nível.
  const safeFolder =
    folder
      .split("/")
      .map((segment) => slugify(segment))
      .filter(Boolean)
      .join("/") || "uploads";
  return `${safeFolder}/${uuid}.${ext}`;
}

export class StorageService {
  async uploadFile(
    file: File,
    folder = "uploads",
  ): Promise<{ url: string; key: string }> {
    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new HTTPException(400, {
        message: `Tipo de arquivo não permitido: ${file.type}. Use JPEG, PNG, WebP ou HEIC.`,
      });
    }

    if (file.size > MAX_SIZE_BYTES) {
      throw new HTTPException(400, {
        message: "Arquivo muito grande. Tamanho máximo: 10MB.",
      });
    }

    const key = buildStorageKey({
      folder,
      fileName: file.name,
      uuid: crypto.randomUUID(),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToR2(key, buffer, file.type);

    return { url, key };
  }

  async generatePresignedUrl(
    fileName: string,
    contentType: string,
    folder = "uploads",
  ): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      throw new HTTPException(400, {
        message: `Tipo de arquivo não permitido: ${contentType}. Use JPEG, PNG, WebP ou HEIC.`,
      });
    }

    const key = buildStorageKey({
      folder,
      fileName,
      uuid: crypto.randomUUID(),
    });

    const { presignedUrl, publicUrl } = await getPresignedUploadUrl(
      key,
      contentType,
    );
    return { presignedUrl, publicUrl, key };
  }

  async deleteFile(key: string): Promise<void> {
    await deleteFromR2(key);
  }
}

export const storageService = new StorageService();
