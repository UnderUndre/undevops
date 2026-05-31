FROM node:24-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.22.0 --activate
WORKDIR /usr/src/app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/mcp-server/package.json ./apps/mcp-server/
COPY packages/server/package.json ./packages/server/
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
RUN pnpm --filter=@undevops/mcp-server build

FROM base AS runner
COPY --from=build /usr/src/app/apps/mcp-server/dist ./dist
COPY --from=build /usr/src/app/apps/mcp-server/package.json ./package.json
COPY --from=build /usr/src/app/node_modules ./node_modules
CMD ["node", "dist/index.js"]
