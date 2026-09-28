# Imagen de la API y del worker (ADR 0006: misma imagen, distinto comando). Contexto: raíz del repo.
FROM node:24.21.0-bookworm-slim AS base
RUN npm install --global pnpm@12.6.0
WORKDIR /repo

FROM base AS build
COPY . .
# --ignore-scripts: los hooks de git (lefthook) no tienen sentido en la imagen.
RUN pnpm install --frozen-lockfile --ignore-scripts --filter @canchitas/api... \
  && pnpm --filter @canchitas/api build \
  && pnpm --filter @canchitas/api deploy --prod /salida

FROM node:24.21.0-bookworm-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /salida .
USER node
EXPOSE 3001
# El worker usa la misma imagen con `node dist/main-worker.js`.
CMD ["node", "dist/main-api.js"]
