# Fleetbase socket server: SocketCluster 17 with JWT subscription auth and a signed
# internal publish endpoint. See README.md for configuration.
FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /usr/src/app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund && npm cache clean --force

COPY server.js ./
COPY lib ./lib

USER node

# 8000: public WebSocket (/socketcluster/) and /health-check
# 8001: internal publish/stats listener - keep it on the private network only
EXPOSE 8000 8001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -T 4 -O /dev/null "http://127.0.0.1:${SOCKETCLUSTER_PORT:-8000}/health-check" || exit 1

CMD ["node", "server.js"]
