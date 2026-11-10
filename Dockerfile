# Pod Town server image. Built for linux/amd64 by .github/workflows/image.yml.
FROM denoland/deno:2.9.8

WORKDIR /app
COPY deno.json deno.lock server.js ./
COPY game ./game
COPY public ./public

# Download dependencies at build time so the container starts offline and fast.
RUN deno cache server.js

# The save file lives on a mounted volume so it survives restarts.
ENV PORT=8080 \
    DATA_FILE=/data/state.json
EXPOSE 8080

CMD ["deno", "run", "--allow-net", "--allow-read", "--allow-write", "--allow-env", "--allow-sys", "server.js"]
