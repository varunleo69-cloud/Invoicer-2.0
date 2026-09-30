FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
# npm ci = reproducible install from package-lock.json
RUN npm ci --omit=dev

COPY src/ ./src/

ENV NODE_ENV=production
EXPOSE 3000

# Do not run the app as root
USER node

# Lets Docker / Compose know when the API (and its database connection) is healthy
HEALTHCHECK --interval=15s --timeout=3s --start-period=15s --retries=3 \
  CMD wget -qO /dev/null "http://127.0.0.1:${PORT:-3000}/health" || exit 1

CMD ["node", "src/server.js"]
