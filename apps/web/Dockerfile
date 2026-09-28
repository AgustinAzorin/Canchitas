# Imagen de la web en modo standalone (ADR 0010, ADR 0013). Contexto: raíz del repo.
FROM node:24.21.0-bookworm-slim AS base
RUN npm install --global pnpm@12.6.0
WORKDIR /repo

FROM base AS build
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_STANDALONE=1
COPY . .
# --ignore-scripts: los hooks de git (lefthook) no tienen sentido en la imagen.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @canchitas/web... \
  && pnpm --filter @canchitas/web build

FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --from=build --chown=node:node /repo/apps/web/.next/standalone .
COPY --from=build --chown=node:node /repo/apps/web/.next/static ./apps/web/.next/static
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
