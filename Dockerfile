# --- Estágio de build -------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# Ferramentas para compilar o better-sqlite3 caso não haja binário pré-compilado
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# --- Estágio de execução ----------------------------------------------------
FROM node:22-slim AS run
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY --from=build /app/public ./public
COPY --from=build /app/src ./src
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/package-lock.json ./package-lock.json
COPY --from=build /app/next.config.ts ./next.config.ts
COPY --from=build /app/prisma.config.ts ./prisma.config.ts
COPY --from=build /app/tsconfig.json ./tsconfig.json

EXPOSE 3000

CMD ["sh", "-c", "node scripts/init-db.mjs prepare && npx prisma migrate deploy && node scripts/init-db.mjs seed && npm run start -- -p ${PORT:-3000}"]