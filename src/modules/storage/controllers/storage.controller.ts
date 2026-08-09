import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { storageService } from "../services/storage.service.js";

// Upload genérico para R2/S3. Três rotas:
//   POST   /presign       -> presigned URL (upload direto do browser, sem passar o blob pelo backend)
//   POST   /upload        -> upload multipart via backend (fallback)
//   DELETE /:key          -> remove o objeto
// Todas exigem usuário autenticado (authContextMiddleware popula c.get("user")).
// `folder` namespaceia o objeto — quem chama decide a estrutura de pastas.
export const storageController = new Hono()
  .post("/presign", async (c) => {
    const user = c.get("user" as never) as { id: string } | null;
    if (!user) throw new HTTPException(401, { message: "Unauthorized" });

    const { fileName, contentType, folder } = await c.req.json<{
      fileName: string;
      contentType: string;
      folder?: string;
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

    const result = await storageService.uploadFile(file, folder);
    return c.json(result, 201);
  })
  .delete("/:key{.+}", async (c) => {
    const user = c.get("user" as never) as { id: string } | null;
    if (!user) throw new HTTPException(401, { message: "Unauthorized" });

    const key = c.req.param("key");
    if (!key) throw new HTTPException(400, { message: "Key não informada" });

    await storageService.deleteFile(key);
    return c.body(null, 204);
  });
