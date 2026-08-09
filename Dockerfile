# 1) Dependências
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --frozen-lockfile

# 2) Builder
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json yarn.lock ./
COPY prisma ./prisma
COPY . .

ARG DATABASE_URL

# Gera Prisma Client (dummy)
RUN DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy" npx prisma generate

RUN yarn build

# 3) Runtime
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

COPY package.json yarn.lock ./
COPY prisma ./prisma

RUN yarn install --production --frozen-lockfile

RUN npx prisma generate

COPY --from=builder /app/dist ./dist

# Copiar e tornar executável o script de entrypoint
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
