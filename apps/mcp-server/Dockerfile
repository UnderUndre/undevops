FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/core/package.json ./packages/core/

FROM base AS deps
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm --filter @undevops/mcp-server build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app
COPY --from=build /app/apps/mcp-server/dist ./dist
COPY --from=build /app/apps/mcp-server/package.json ./
COPY --from=build /app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
