# Deploy — R2 e Railway

## Estado atual (2026-08-22)

Já está tudo de pé. Este roteiro serve para reconstruir do zero ou para
entender o que existe.

| O quê | Onde |
|---|---|
| Projeto Railway | `guarda` |
| API | https://api-production-9bec.up.railway.app |
| Frontend | https://web-production-15d196.up.railway.app |
| Banco | Postgres da Railway, rede privada (`postgres.railway.internal`) |
| Conta Cloudflare | `11bfca83f9d25dc976e03a44af06b39e` |
| Bucket público | `guarda-media` → https://pub-3be089b76d244560a6275b9a01e790e9.r2.dev |
| Bucket privado | `guarda-videos` (sem URL pública, só assinada) |
| CORS | aplicado nos dois buckets |
| Token R2 | "GUARDA - api (Railway)", Object Read & Write, escopado nos dois buckets |
| Alertas de gasto | e-mail em US$ 2 e US$ 5 (avisam, **não bloqueiam**) |

O fluxo de upload foi verificado em produção de ponta a ponta: presign, PUT de
53 MB, aula publicada, URL assinada devolvendo `206` com range, o mesmo objeto
sem assinatura devolvendo `400`, troca de vídeo apagando o arquivo antigo, e o
`<video>` do player chegando a `readyState 4` num browser real.

O deploy hoje sai de `railway up` a partir do repositório local. Conectar o
serviço ao GitHub, para redeploy automático a cada merge, ainda não foi feito.


Roteiro de quem sobe o GUARDA do zero. A ordem importa: cada bloco depende de
um valor gerado pelo anterior.

## 1. Cloudflare R2

### 1.1 Buckets

Dois buckets, por motivos explicados no topo de `src/lib/r2.ts`:

| Bucket | Acesso público | Guarda |
|---|---|---|
| `guarda-media` | **ligado** | foto de perfil (`avatars/…`) |
| `guarda-videos` | **desligado** | aulas (`lessons/<instructorId>/…`) |

No `guarda-media`, em *Settings → Public Development URL*, ligue o domínio
`r2.dev`. Ele devolve algo como `https://pub-<hash>.r2.dev` — esse é o
`R2_MEDIA_PUBLIC_URL`.

> O `r2.dev` é limitado por taxa e a Cloudflare não recomenda para tráfego de
> produção. Serve para começar; quando houver domínio próprio, troque por um
> domínio customizado no bucket e atualize a variável.

No `guarda-videos`, **não ligue nada**. O acesso é só por URL assinada — é o que
impede um link vazado de dar acesso vitalício ao conteúdo pago.

### 1.2 CORS — o passo que mais engana

Sem isso o upload falha no browser com um erro que não menciona CORS. Precisa
nos **dois** buckets: a foto sobe direto para o `guarda-media` e o vídeo direto
para o `guarda-videos`.

Em cada bucket, *Settings → CORS Policy*:

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "http://localhost:3005",
      "https://SEU-FRONTEND.up.railway.app"
    ],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedHeaders": ["content-type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```

`AllowedHeaders: ["content-type"]` é o item indispensável. O upload manda
`Content-Type`, o que torna a requisição não-simples e dispara preflight; sem o
header liberado, o preflight reprova e o `PUT` nunca acontece.

### 1.3 Token

*R2 → API → Manage API Tokens → Create*, permissão **Object Read & Write**,
escopado nos dois buckets. Guarde o Access Key ID e o Secret Access Key — o
secret aparece uma vez só. O Account ID está na página inicial do R2.

## 2. Railway

### 2.1 Ordem

1. Crie o projeto e adicione **Postgres**.
2. Crie os dois serviços a partir do GitHub: `marcelovtn/guarda-backend` (acha o
   `Dockerfile` sozinho) e `marcelovtn/guarda-frontend` (vai de nixpacks).
3. **Gere os domínios dos dois antes de preencher variável nenhuma.** Metade das
   variáveis é o endereço do outro serviço — sem os domínios em mão você
   preenche errado e descobre depois.
4. Preencha as variáveis abaixo.
5. Faça deploy dos dois.

### 2.2 Variáveis do backend

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (referência, não copie o texto) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BACKEND_URL` | `https://SEU-BACKEND.up.railway.app` |
| `ALLOWED_ORIGINS` | `https://SEU-FRONTEND.up.railway.app` |
| `COOKIE_DOMAIN` | deixe vazio |
| `NODE_ENV` | `production` |
| `LOG_LEVEL` | `info` |
| `R2_ACCOUNT_ID` | do painel do R2 |
| `R2_ACCESS_KEY_ID` | do token |
| `R2_SECRET_ACCESS_KEY` | do token |
| `R2_MEDIA_BUCKET` | `guarda-media` |
| `R2_MEDIA_PUBLIC_URL` | `https://pub-<hash>.r2.dev` |
| `R2_VIDEO_BUCKET` | `guarda-videos` |

`PORT` é injetado pela Railway e `src/index.ts` já o respeita — não defina.

Em *Settings → Healthcheck Path*, use `/api/hello`. A raiz `/` não tem rota e
responde 404, o que a Railway leria como serviço morto.

As migrations rodam no start, pelo `docker-entrypoint.sh`. O build nunca fala
com o banco — se um dia falar, é regressão.

### 2.3 Variáveis do frontend

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://SEU-BACKEND.up.railway.app` |
| `NEXT_PUBLIC_SITE_URL` | `https://SEU-FRONTEND.up.railway.app` |
| `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH` | `false` |
| `NEXT_PUBLIC_ENABLE_PASSWORD_RESET` | `false` |

> **`NEXT_PUBLIC_*` entra no bundle em tempo de build.** Mudar o valor exige
> **redeploy**, não restart. É a confusão número um: a variável aparece certa no
> painel e o app continua chamando o endereço antigo.

## 3. Depois do primeiro deploy

Confira nesta ordem — cada item falha de um jeito diferente:

1. `GET https://SEU-BACKEND.up.railway.app/api/hello` responde `Hello World!`.
2. Cadastro e login funcionam. Se der `INVALID_ORIGIN`, `ALLOWED_ORIGINS` está
   errado. Se logar e cair de volta no login, o cookie não está sendo aceito —
   confira que o backend está em HTTPS e `NODE_ENV=production` (é o que liga
   `sameSite: none` + `secure`).
3. Upload de foto de perfil, e recarregar a página para ver se ela ficou.
4. Upload de vídeo numa aula, e assistir. Falha aqui é quase sempre CORS.

## 4. Criar o primeiro professor

Num banco novo não existe nenhum professor, e sem professor toda a área
`/instructor/*` responde 403 — o que torna alguém professor é existir uma linha
`Instructor` para o `user_id` dele, e não há tela que crie uma. Quem cria é
`POST /api/admin/instructors`, protegido por `GOD_USERS`.

**Não rode `yarn db:seed` em produção** para contornar: ele cria um professor
fictício (Rafael Moura) com 135 aulas de exemplo.

O procedimento:

1. Todos os envolvidos se cadastram normalmente pela tela de criar conta —
   inclusive quem vai ser admin.
2. Descubra o `user_id` de quem vai administrar. Logado, abra
   `https://SEU-BACKEND.up.railway.app/api/auth/get-session` no browser: o `id`
   dentro de `user` é o valor.
3. Ponha esse id em `GOD_USERS` no backend (vários, separados por vírgula) e
   faça redeploy.
4. Logado como esse usuário, chame:

```bash
curl -X POST https://SEU-BACKEND.up.railway.app/api/admin/instructors \
  -H 'Content-Type: application/json' \
  --cookie "__Secure-guarda.session_token=SEU_COOKIE" \
  -d '{
    "email": "professor@exemplo.com",
    "slug": "nome-do-professor",
    "displayName": "Nome do Professor",
    "bio": "Como ele se apresenta.",
    "monthlyPrice": 4990
  }'
```

`monthlyPrice` é em centavos. `slug` aceita só minúsculas, números e hífen — é
o que vai virar `/p/<slug>`. `published` fica `false` por padrão; o professor
liga isso na própria tela de perfil quando quiser aparecer.

Erros que a rota devolve: `404` se o e-mail não tem conta (a pessoa precisa se
cadastrar antes), `409` se a conta já é professor ou se o slug está tomado,
`403` se quem chama não está em `GOD_USERS`.
