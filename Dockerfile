FROM node:22
RUN npm install -g pnpm
RUN apt-get update && apt-get install -y python3 python3-pip ffmpeg && pip3 install yt-dlp --break-system-packages
WORKDIR /app
COPY bot/ ./
RUN cd artifacts/api-server && pnpm install --ignore-scripts && pnpm run build
CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
