# syntax=docker/dockerfile:1
FROM node:24.4.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
RUN corepack prepare pnpm@10.22.0 --activate

FROM base AS build
COPY . /usr/src/app
WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y python3 make g++ git python3-pip pkg-config libsecret-1-dev && rm -rf /var/lib/apt/lists/*

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

ENV NODE_ENV=production
RUN pnpm --filter=@undevops/server build
RUN pnpm --filter=./apps/mcp-server run build

RUN pnpm --filter=./apps/mcp-server --prod deploy --legacy /prod/mcp-server

RUN cp -R /usr/src/app/apps/mcp-server/dist /prod/mcp-server/dist

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=build /prod/mcp-server/dist ./dist
COPY --from=build /prod/mcp-server/package.json ./package.json
COPY --from=build /prod/mcp-server/node_modules ./node_modules

ENV MCP_SSE_PORT=3003
EXPOSE 3003

CMD ["node", "dist/index.js"]
