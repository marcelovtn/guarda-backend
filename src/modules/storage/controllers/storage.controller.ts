import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AssetKind } from "../services/storage.service.js";
import { storageService } from "../services/storage.service.js";

// Upload genérico para R2/S3. Três rotas:
//   POST   /presign       -> presigned URL (upload direto do browser, sem passar o blob pelo backend)
//   POST   /upload        -> upload multipart via backend (fallback, só imagem)
//   DELETE /:key?kind=    -> remove o objeto (kind escolhe o bucket)
// Todas exigem usuário autenticado (authContextMiddleware popula c.get("user")).
// `folder` namespaceia o objeto — quem chama decide a estrutura de pastas.
// `kind` seleciona a política de tipo/tamanho ("image" por padrão, "video" para aulas).
const ASSET_KINDS = new Set<AssetKind>(["image", "video"]);

function parseAssetKind(value: unknown): AssetKind | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && ASSET_KINDS.has(value as AssetKind)) {
    return value as AssetKind;
  }
  throw new HTTPException(400, {
    message: `kind inválido: ${String(value)}. Use "image" ou "video".`,
  });
}

export const storageController = new Hono()
  .post("/presign", async (c) => {
    const user = c.get("user" as never) as { id: string } | null;
    if (!user) throw new HTTPException(401, { message: "Unauthorized" });

    const { fileName, contentType, folder, kind } = await c.req.json<{
      fileName: string;
      contentType: string;
      folder?: string;
      kind?: string;
    }>();

    if (!fileName || !contentType) {
      throw new HTTPException(400, {
        message: "Campos obrigatórios: fileName, contentType",
      });
    }

    const result = await storageService.generatePresignedUrl(
      fileName,
      contentType,
      folder,
      parseAssetKind(kind),
    );
    return c.json(result);
  })
  .post("/upload", async (c) => {
    const user = c.get("user" as never) as { id: string } | null;
    if (!user) throw new HTTPException(401, { message: "Unauthorized" });

    const body = await c.req.parseBody();
    const file = body["file"];
    const folder =
      typeof body["folder"] === "string" ? body["folder"] : undefined;

    if (!file || typeof file === "string") {
      throw new HTTPException(400, { message: "Arquivo não enviado" });
    }

    const result = await storageService.uploadFile(
      file,
      folder,
      parseAssetKind(body["kind"]),
    );
    return c.json(result, 201);
  })
  .delete("/:key{.+}", async (c) => {
    const user = c.get("user" as never) as { id: string } | null;
    if (!user) throw new HTTPException(401, { message: "Unauthorized" });

    const key = c.req.param("key");
    if (!key) throw new HTTPException(400, { message: "Key não informada" });

    // `kind` diz em qual bucket procurar — sem isso um vídeo seria buscado no
    // bucket público e o delete falharia em silêncio.
    await storageService.deleteFile(key, parseAssetKind(c.req.query("kind")));
    return c.body(null, 204);
  });
