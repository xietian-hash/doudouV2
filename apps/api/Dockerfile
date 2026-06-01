FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

RUN corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN pnpm install --frozen-lockfile --registry https://registry.npmmirror.com

COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

# 每次部署传入时间戳，强制从编译步骤开始刷新缓存，保留 pnpm install 缓存
ARG CACHE_BUST=1
RUN echo "cache bust: $CACHE_BUST"

RUN pnpm --filter @ddyq/api exec prisma generate
RUN pnpm --filter @ddyq/api build

FROM docker.m.daocloud.io/library/node:22-bookworm-slim AS runtime

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

RUN sed -i "s@http://deb.debian.org@http://mirrors.aliyun.com@g" /etc/apt/sources.list.d/debian.sources && \
    apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY apps/api/prisma ./apps/api/prisma

RUN pnpm --filter @ddyq/api exec prisma generate && \
    mkdir -p /app/apps/api/uploads

EXPOSE 3000

CMD ["node", "apps/api/dist/main"]
