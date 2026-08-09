# GUARDA — backend

API do GUARDA: plataforma onde um professor de jiu jitsu publica aulas organizadas
em trilhas e o aluno assiste na ordem que o professor ensina.

Servidor Hono standalone (porta 3001). O frontend (`guarda-frontend`) consome via
HTTP com cookies de sessão do Better Auth.

Este repositório nasceu do `blank-backend`, que continua acessível como remote
`upstream` — dá para puxar melhorias da base com `git fetch upstream`.

## Antes de escrever código

Leia [`docs/backend_architecture.md`](docs/backend_architecture.md). Ele cobre a
stack, o fluxo de uma requisição, o contexto de autenticação, o padrão de módulo
e como criar uma feature nova. O que está abaixo complementa, não substitui.

## Idioma

**Código em inglês, texto de usuário em português.**

Modelos, campos, rotas, arquivos, funções, variáveis e mensagens de commit em
inglês. Mensagens de erro voltam em português porque passam por
`getTranslatedErrorMessage` antes de chegar ao cliente.

## Regras que não estão na doc

**Estrutura de módulo.** Toda feature vive em `src/modules/<name>/` com
`controllers/`, `domains/`, `repositories/` e `services/`. Escreva nessa ordem:
repository → service → controller. Controller não tem regra de negócio — ele
extrai o input, chama o service e devolve a resposta. Registre em `src/index.ts`
com `hono.route('/api/<name>', <name>Controller)`.

**Autenticação.** O `userId` vem sempre de `getAuthContext()` (AsyncLocalStorage),
nunca por parâmetro. Nos repositories, use os helpers de
`src/modules/_shared/repositories/base.repository.ts` — `getUserId()`,
`getClientAndUser()`, `getClient()`.

**Acesso do aluno.** Toda leitura de conteúdo por um aluno é filtrada pelas
assinaturas dele. Essa regra mora num helper do `BaseRepository`, não espalhada
pelos services. Se você está escrevendo `where: { instructorId }` num service,
provavelmente está no lugar errado.

**Erros.** Sempre `HTTPException` do `hono/http-exception`. O `handleError` global
em `src/errors/errorHandler.ts` captura, traduz e loga com `requestId` e `userId`.

**Prisma.** Modelos novos seguem a convenção do `UserInfo`, não a do `User` — o
`User` é do Better Auth e tem estilo próprio. Ou seja: `@map` em snake_case,
`@db.Timestamptz(6)` nas datas, `deletedAt` para soft delete e
`dbgenerated("gen_random_uuid()")` no id.

**Vídeo.** O acesso a vídeo passa por `src/lib/videoProvider.ts`, nunca direto no
R2 a partir de um service. A implementação atual é mínima; o pipeline real
(transcodificação, HLS, status de processamento) é responsabilidade de outra
pessoa e vai entrar trocando só a implementação dessa interface.

**Assinatura.** Não há cobrança nesta fase. `Subscription` é criada direto no
banco pela tela de checkout. O gate de acesso lê esse registro normalmente.

## Comandos

```bash
yarn dev              # http://localhost:3001
yarn db:migrate:dev   # cria/aplica migration em desenvolvimento
yarn db:seed          # popula com os dados do protótipo
yarn db:studio        # inspeciona o banco
```

## Pendências conhecidas

- `src/index.ts` e `src/lib/auth.ts` têm domínios de outro produto hardcoded no
  CORS e em `trustedOrigins` (`amfinance.com.br`, `jupter.app`). Trocar pelos do
  GUARDA e mover para variável de ambiente.
- `cookiePrefix` em `src/lib/auth.ts` ainda é `am`.
