# O build não fala com o banco em momento nenhum. As migrations rodam no start,
# pelo docker-entrypoint.sh, quando DATABASE_URL finalmente existe.

# 1) Dependências — inclui devDependencies, o builder precisa do TypeScript.
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile

# 2) Builder — compila src/ em dist/.
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN yarn build

# 3) Runtime — só o que roda: dependências de produção e o dist/.
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# O postinstall gera o Prisma Client; `prisma` está em dependencies, então o
# entrypoint consegue rodar `prisma migrate deploy` nesta mesma imagem.
COPY package.json yarn.lock prisma.config.ts ./
COPY prisma ./prisma
RUN yarn install --production --frozen-lockfile

COPY --from=builder /app/dist ./dist
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
