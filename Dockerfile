# Build stage: install with pnpm and produce the adapter-node bundle.
FROM node:24-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@11.1.3 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Runtime stage: only the built server, no toolchain, no root user.
FROM node:24-alpine
ENV NODE_ENV=production
WORKDIR /app
# The app may persist a generated APP_SECRET or APP_TOKEN into .env, so the
# runtime user owns its working directory. No volume is needed: a container
# without one keeps that file in its writable layer.
RUN chown node:node /app
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/build ./build
# Values arrive as environment variables (Compose `env_file`, `docker run
# --env-file`), so the container command carries no --env-file. On bare metal
# `pnpm start` reads .env itself.
USER node
EXPOSE 3000
ENV PORT=3000 HOST=0.0.0.0
CMD ["node", "build/index.js"]
