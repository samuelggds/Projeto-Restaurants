FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN npm ci && npx prisma generate --schema=/app/prisma/schema.prisma

COPY . .
RUN npm run build

FROM node:22-alpine AS runtime

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma
RUN apk upgrade --no-cache \
  && npm ci --omit=dev \
  && npx prisma generate --schema=/app/prisma/schema.prisma \
  && npm cache clean --force \
  && rm -rf \
    /usr/local/lib/node_modules/npm \
    /usr/local/bin/npm \
    /usr/local/bin/npx \
    /usr/local/lib/node_modules/corepack \
    /usr/local/bin/corepack \
    /opt/yarn-v* \
    /usr/local/bin/yarn \
    /usr/local/bin/yarnpkg

COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node scripts/provisionRuntimeRole.mjs ./scripts/provisionRuntimeRole.mjs
RUN chown -R node:node /app

USER node
EXPOSE 3000

CMD ["node", "dist/server.js"]
