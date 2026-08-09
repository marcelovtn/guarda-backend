import { HTTPException } from "hono/http-exception";
import {
  deleteFromR2,
  getPresignedUploadUrl,
  uploadToR2,
} from "../../../lib/r2.js";

// Uploads are split by asset kind because a profile photo and a lesson video
// have nothing in common: different types, different size ceilings, and
// different signing windows. The caller declares the kind — inferring it from
// the MIME type would let a 4 GB file through wherever an image was expected.
export type AssetKind = "image" | "video";

type AssetPolicy = {
  mimeTypes: Set<string>;
  maxBytes: number;
  /** How long the presigned URL stays valid, in seconds. */
  presignExpiresIn: number;
  /** Used to build the error message shown to the user. */
  accepted: string;
  /** Whether the file may be proxied through the backend (see uploadFile). */
  allowProxiedUpload: boolean;
};

const ASSET_POLICIES: Record<AssetKind, AssetPolicy> = {
  image: {
    mimeTypes: new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
      "image/heif",
    ]),
    maxBytes: 10 * 1024 * 1024, // 10 MB
    presignExpiresIn: 300, // 5 min
    accepted: "JPEG, PNG, WebP ou HEIC",
    allowProxiedUpload: true,
  },
  video: {
    mimeTypes: new Set([
      "video/mp4",
      "video/quicktime",
      "video/x-matroska",
      "video/webm",
    ]),
    // A single presigned PUT tops out at 5 GiB on R2/S3, which covers the
    // lesson recordings we have seen. Going past that needs a multipart
    // upload — part of the video pipeline work, not this module.
    maxBytes: 5 * 1024 * 1024 * 1024, // 5 GB
    // Multi-gigabyte uploads over a slow connection need a wide window.
    presignExpiresIn: 6 * 60 * 60, // 6 h
    accepted: "MP4, MOV, MKV ou WebM",
    // Never buffer a lesson video in backend memory — presign and let the
    // browser talk to R2 directly.
    allowProxiedUpload: false,
  },
};

function assertAllowed(
  kind: AssetKind,
  contentType: string,
  sizeBytes?: number,
): AssetPolicy {
  const policy = ASSET_POLICIES[kind];

  if (!policy.mimeTypes.has(contentType)) {
    throw new HTTPException(400, {
      message: `Tipo de arquivo não permitido: ${contentType}. Use ${policy.accepted}.`,
    });
  }

  if (sizeBytes !== undefined && sizeBytes > policy.maxBytes) {
    const maxMb = Math.round(policy.maxBytes / (1024 * 1024));
    throw new HTTPException(400, {
      message: `Arquivo muito grande. Tamanho máximo: ${maxMb}MB.`,
    });
  }

  return policy;
}

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
  /**
   * Uploads through the backend. The whole file is buffered in memory, so this
   * is only available to asset kinds that opted into it — videos must go
   * through generatePresignedUrl instead.
   */
  async uploadFile(
    file: File,
    folder = "uploads",
    kind: AssetKind = "image",
  ): Promise<{ url: string; key: string }> {
    const policy = assertAllowed(kind, file.type, file.size);

    if (!policy.allowProxiedUpload) {
      throw new HTTPException(400, {
        message:
          "Arquivos desse tipo devem ser enviados por URL pré-assinada, não pelo backend.",
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

  /**
   * Hands the browser a URL it can PUT straight to R2, so the blob never
   * touches the backend. The signing window widens for video, which can take
   * hours to upload on a home connection.
   */
  async generatePresignedUrl(
    fileName: string,
    contentType: string,
    folder = "uploads",
    kind: AssetKind = "image",
  ): Promise<{ presignedUrl: string; publicUrl: string; key: string }> {
    const policy = assertAllowed(kind, contentType);

    const key = buildStorageKey({
      folder,
      fileName,
      uuid: crypto.randomUUID(),
    });

    const { presignedUrl, publicUrl } = await getPresignedUploadUrl(
      key,
      contentType,
      policy.presignExpiresIn,
    );
    return { presignedUrl, publicUrl, key };
  }

  async deleteFile(key: string): Promise<void> {
    await deleteFromR2(key);
  }
}

export const storageService = new StorageService();
