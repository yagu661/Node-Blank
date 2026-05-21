FROM node:22
RUN npm install -g pnpm
WORKDIR /app
COPY bot/ ./
RUN cd artifacts/api-server && pnpm install && pnpm run build
CMD ["sh", "-c", "cd /app/artifacts/api-server && pnpm run start"]
