FROM node:22
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && pip3 install yt-dlp --break-system-packages
WORKDIR /app
COPY bot/ ./
RUN cd artifacts/api-server && pnpm install --ignore-scripts && pnpm run build
RUN mkdir -p artifacts/api-server/dist/commands/music
RUN mkdir -p artifacts/api-server/dist/helpers
RUN cp artifacts/api-server/src/commands/music/*.js artifacts/api-server/dist/commands/music/ 2>/dev/null || true
RUN cp -r artifacts/api-server/src/helpers/. artifacts/api-server/dist/helpers/ 2>/dev/null || true
RUN cp artifacts/api-server/src/emojis.json artifacts/api-server/dist/ 2>/dev/null || true
CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
