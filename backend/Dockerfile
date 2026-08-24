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
RUN npm ci --omit=dev && npx prisma generate --schema=/app/prisma/schema.prisma && npm cache clean --force

COPY --from=build --chown=node:node /app/dist ./dist
RUN chown -R node:node /app

USER node
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
