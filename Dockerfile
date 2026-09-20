# Builds web/ if present, then runs the server. Migrations run automatically at server start.
FROM node:24-alpine AS build
WORKDIR /app
COPY . .
RUN if [ -d web ] && [ -f web/package.json ]; then \
      cd web && npm ci && npm run build; \
    fi; \
    mkdir -p web/dist

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY server/package.json server/package-lock.json* ./server/
RUN cd server && npm ci --omit=dev
COPY server ./server
COPY --from=build /app/web/dist ./server/web-dist

EXPOSE 4820
CMD ["node", "server/server.mjs"]
