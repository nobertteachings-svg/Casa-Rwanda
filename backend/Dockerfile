FROM node:22-alpine AS build
WORKDIR /app

# Install backend dependencies
COPY backend/package.json backend/package-lock.json ./backend/
WORKDIR /app/backend
RUN npm ci

# Copy source and DB migrations (migrate.ts resolves ../../../db/migrations)
COPY backend/ ./
COPY db/migrations /app/db/migrations

RUN npm run build && npm prune --omit=dev

FROM node:22-alpine
WORKDIR /app/backend
ENV NODE_ENV=production

COPY --from=build /app/backend/package.json ./
COPY --from=build /app/backend/node_modules ./node_modules
COPY --from=build /app/backend/dist ./dist
COPY --from=build /app/db/migrations /app/db/migrations

EXPOSE 3000
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/index.js"]
