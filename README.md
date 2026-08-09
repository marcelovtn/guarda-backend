# blank-backend

Backend standalone em Hono + Prisma + Better Auth.

## Setup

```bash
yarn install
cp .env.example .env   # preencha as variáveis
npx prisma migrate dev # cria as tabelas
yarn dev               # http://localhost:3001
```

## Documentação

- [Arquitetura do backend](docs/backend_architecture.md) — stack, módulos, auth, Prisma, como criar features novas
