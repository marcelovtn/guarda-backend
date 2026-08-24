import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * O datasource só é declarado quando a URL existe.
 *
 * Duas coisas puxam em direções opostas: `postinstall` roda `prisma generate`
 * em toda instalação — inclusive dentro do Docker, onde não há banco — e
 * gerar o client não precisa de conexão nenhuma. Já `migrate deploy` precisa,
 * e quando existe um prisma.config.ts o CLI ignora o `env("DATABASE_URL")` do
 * schema e passa a exigir a URL daqui.
 *
 * O `env()` de `prisma/config` lança quando a variável falta, o que quebrava o
 * build da imagem no primeiro `yarn install`. Ler direto do process e omitir o
 * bloco atende os dois casos.
 */
const databaseUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  ...(databaseUrl ? { datasource: { url: databaseUrl } } : {}),
});
