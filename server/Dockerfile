# Built from the repo root: the server runs sim/ straight from app/src.
FROM node:24-alpine
WORKDIR /repo
COPY server/package.json server/package-lock.json server/
RUN cd server && npm ci --omit=dev
COPY server/tsconfig.json server/
COPY server/src server/src
# Whole app/src: the room imports sim/, shared/ and pure helpers from net/ (no browser deps needed at runtime).
COPY app/src app/src
WORKDIR /repo/server
ENV NODE_ENV=production
CMD ["npx", "tsx", "src/index.ts"]
