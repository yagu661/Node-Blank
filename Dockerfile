FROM node:22
RUN npm install -g pnpm
WORKDIR /app
COPY bot/artifacts/api-server ./
RUN pnpm install && pnpm run build
CMD ["pnpm", "run", "start"]
