# Backend — Arquitetura

## Stack

| Tecnologia | Papel |
|---|---|
| **Hono** | Framework HTTP (similar ao Express, mas moderno e rápido) |
| **TypeScript** | Tipagem estática em todo o projeto |
| **Better Auth** | Gerenciamento de autenticação e sessões |
| **Prisma** | ORM para acesso ao banco de dados |
| **PostgreSQL** | Banco de dados principal |
| **Resend** | Envio de emails transacionais |
| **pino / pino-pretty** | Logging estruturado |

O backend é um **servidor Hono standalone** (não roda dentro do Next.js). O frontend se comunica com ele via HTTP, e a autenticação é feita via cookies `HttpOnly` gerenciados pelo Better Auth.

---

## Estrutura de diretórios

```
src/
├── errors/
│   ├── errorHandler.ts          # Handler global de erros — captura HTTPException e Error
│   ├── getTranslatedErrorMessage.ts  # Traduz mensagens de erro para o usuário
│   └── errorsTranslations/
│       └── auth.ts              # Mapeamento de erros de autenticação
│
├── index.ts                     # Entry point: configura CORS, middlewares e rotas
│
├── lib/
│   ├── auth.ts                  # Configuração completa do Better Auth
│   ├── prisma.ts                # Instância singleton do Prisma Client
│   ├── resend.ts                # Instância do Resend (email)
│   └── migration.ts             # Utilitário de migração
│
├── middlewares/
│   ├── authContext.ts           # Injeta user/session no contexto Hono + AsyncLocalStorage
│   └── adminRequired.ts        # Guard: bloqueia rotas para não-admins (GOD_USERS)
│
├── modules/
│   ├── _shared/
│   │   └── repositories/
│   │       └── base.repository.ts  # Classe base com helpers para autenticação
│   ├── auth/                    # Endpoints customizados de auth (check-email, etc.)
│   ├── userData/                # Operações de conta do usuário (delete, etc.)
│   ├── userFirstTimeSetup/      # Onboarding de novos usuários
│   └── userInfo/                # Dados de perfil do usuário (language, etc.)
│
└── utils/
    ├── authContext.ts           # AsyncLocalStorage para userId e token
    ├── routes.ts                # Constantes de rotas
    ├── logger.ts                # Configuração do pino
    ├── loggerMiddleware.ts      # Middleware de log por requisição
    ├── controllerRegistry.ts   # Registro automático de controllers
    └── ...
```

---

## Fluxo de uma requisição

```
Request
  │
  ├── CORS middleware (valida origem)
  ├── authContextMiddleware (obtém sessão via Better Auth, injeta no contexto)
  ├── loggerMiddleware (loga método, path, status, duration)
  │
  ├── /api/auth/*  →  Better Auth handler (gerencia login, logout, sessão)
  │
  └── /api/[modulo]/* → Controller → Service → Repository → Prisma → DB
```

---

## Autenticação e contexto

O `authContextMiddleware` roda em **todas as requisições** (`hono.use("*", ...)`). Ele:

1. Chama `auth.api.getSession()` com os headers da requisição
2. Se autenticado, coloca `user` e `session` no contexto do Hono (`c.set(...)`)
3. Também injeta `userId` e `accessToken` no **AsyncLocalStorage** via `authContext`

O AsyncLocalStorage permite que **services e repositories** acessem o `userId` atual sem precisar receber o objeto `c` (contexto Hono) como parâmetro:

```ts
// Em qualquer service ou repository, sem receber parâmetros de auth:
import { getAuthContext } from '../utils/authContext'

const { userId } = getAuthContext()
if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })
```

---

## Módulos

Cada funcionalidade vive em `src/modules/[nome]/` com esta estrutura:

```
modules/minhaFeature/
├── controllers/
│   └── minhaFeature.controller.ts   # Recebe a requisição, chama o service
├── domains/
│   └── minhaFeature.types.ts        # Tipos e DTOs do módulo
├── repositories/
│   └── minhaFeature.repository.ts   # Acesso ao banco via Prisma
└── services/
    └── minhaFeature.services.ts     # Regras de negócio
```

### Controller

Responsabilidade: receber a requisição, extrair parâmetros/body, chamar o service e retornar a resposta. **Sem lógica de negócio.**

```ts
export const minhaFeatureController = new Hono()
  .get('/', async (c) => {
    return c.json(await minhaFeatureService.listar())
  })
  .post('/', async (c) => {
    const body = await c.req.json()
    if (!body.nome) return c.json({ error: 'nome é obrigatório' }, 400)
    return c.json(await minhaFeatureService.criar(body))
  })
```

Registre o controller no `index.ts`:
```ts
hono.route('/api/minha-feature', minhaFeatureController)
```

### Service

Responsabilidade: **toda a lógica de negócio**. Usa o repository para acessar dados. Lança `HTTPException` para erros esperados.

```ts
export class MinhaFeatureService {
  private readonly repository: MinhaFeatureRepository

  constructor(repository = new MinhaFeatureRepository()) {
    this.repository = repository
  }

  async listar() {
    const { userId } = getAuthContext()
    if (!userId) throw new HTTPException(401, { message: 'Unauthorized' })
    return this.repository.findAllByUserId(userId)
  }

  async criar(data: CriarDTO) {
    const result = await this.repository.insert(data)
    if (!result) throw new HTTPException(500, { message: 'Falha ao criar' })
    return result
  }
}

export const minhaFeatureService = new MinhaFeatureService()
```

### Repository

Responsabilidade: **toda a interação com o banco de dados**. Herda de `BaseRepository` para ter acesso facilitado ao `userId`.

```ts
import { BaseRepository } from '../../_shared/repositories/base.repository'

export class MinhaFeatureRepository extends BaseRepository {
  async findAllByUserId(userId: string) {
    return prisma.minhaFeature.findMany({ where: { userId } })
  }

  async findByAuthenticatedUser() {
    const { prisma, user } = await this.getClientAndUser()
    return prisma.minhaFeature.findMany({ where: { userId: user.id } })
  }

  async insert(data: any) {
    const userId = this.getUserId()
    return prisma.minhaFeature.create({ data: { ...data, userId } })
  }
}
```

### BaseRepository

Em `src/modules/_shared/repositories/base.repository.ts`. Fornece três helpers:

| Método | O que faz |
|---|---|
| `getClientAndUser()` | Retorna `{ prisma, user: { id } }` — lança 401 se não autenticado |
| `getClient()` | Retorna apenas o Prisma Client |
| `getUserId()` | Retorna o `userId` do AsyncLocalStorage — lança 401 se não autenticado |

---

## Tratamento de erros

O `handleError` em `src/errors/errorHandler.ts` captura **todos os erros não tratados** (`hono.onError`):

- `HTTPException` → usa o `status` e traduz a `message`
- `Error` genérico → status 400, traduz a `message`
- Sempre loga com `requestId` e `userId` para rastreabilidade

Para lançar erros nos services:
```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(404, { message: 'Registro não encontrado' })
throw new HTTPException(401, { message: 'Unauthorized' })
throw new HTTPException(403, { message: 'Forbidden' })
```

As mensagens passam por `getTranslatedErrorMessage` antes de ir para o cliente, que mapeia strings técnicas para mensagens amigáveis.

---

## Middlewares disponíveis

### `authContextMiddleware`

Aplicado globalmente (`hono.use("*", authContextMiddleware)`). Injeta o contexto de autenticação em todas as requisições. Não bloqueia — apenas popula o contexto (ou deixa vazio para requests não autenticadas).

### `adminRequired`

Guard para rotas que só podem ser acessadas por usuários na lista `GOD_USERS` (env var):

```ts
import { adminRequired } from '@/middlewares/adminRequired'

hono.route('/api/admin/algo', new Hono()
  .use(adminRequired)
  .get('/', async (c) => { ... })
)
```

---

## Better Auth

A configuração completa está em `src/lib/auth.ts`. Pontos importantes:

- **Cookie prefix:** `am` → cookies gerados serão `am.session_token` (ou `__Secure-am.session_token` em produção HTTPS)
- **Plugins ativos:** `admin()`, `anonymous()`, `phoneNumber()`
- **Email/senha** habilitados sem verificação obrigatória (pode ser ativado no código comentado)
- **Google OAuth** configurado via `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`
- **Cross-subdomain cookies** habilitados em produção para o domínio configurado

O Better Auth expõe rotas em `/api/auth/*` automaticamente — não crie endpoints manuais para login/logout/sessão.

---

## Prisma

Schema em `prisma/schema.prisma`. Modelos disponíveis:

| Model | Descrição |
|---|---|
| `User` | Usuário do sistema (gerenciado pelo Better Auth) |
| `Account` | Provedores OAuth vinculados |
| `Session` | Sessões ativas |
| `Verification` | Tokens de verificação de email/reset |
| `UserInfo` | Dados de perfil (idioma, onboarding, etc.) |

Para adicionar um novo modelo:
1. Edite `prisma/schema.prisma`
2. Rode `npx prisma migrate dev --name nome-da-migration`
3. Rode `npx prisma generate` para atualizar o client

---

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string do PostgreSQL |
| `BACKEND_URL` | Sim | URL pública do backend (para callbacks do Better Auth) |
| `BETTER_AUTH_SECRET` | Sim | Secret para assinar sessões |
| `GOOGLE_CLIENT_ID` | OAuth | Client ID do Google |
| `GOOGLE_CLIENT_SECRET` | OAuth | Client Secret do Google |
| `RESEND_API_KEY` | Email | Chave da API do Resend |
| `GOD_USERS` | Admin | IDs separados por vírgula com acesso admin |
| `PORT` | Não | Porta do servidor (padrão: 3001) |

---

## Como criar um novo módulo

1. Crie a pasta `src/modules/minhaFeature/` com a estrutura padrão
2. Implemente repository → service → controller nessa ordem
3. Adicione os tipos em `domains/minhaFeature.types.ts`
4. Registre o controller no `src/index.ts`:
   ```ts
   hono.route('/api/minha-feature', minhaFeatureController)
   ```
5. Se precisar de tabela nova, adicione ao schema Prisma e rode a migration
