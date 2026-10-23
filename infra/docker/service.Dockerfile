# One Dockerfile for all six services. Build with --build-arg SERVICE=request-service (etc.).
FROM node:22-alpine AS build
ARG SERVICE
WORKDIR /repo
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter "${SERVICE}..." \
 && pnpm --filter "${SERVICE}..." build \
 && pnpm --filter "${SERVICE}" deploy --prod --legacy /out

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /out .
USER node
CMD ["node", "dist/index.js"]
