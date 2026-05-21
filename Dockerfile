FROM node:22
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN cd bot/artifacts/api-server && pnpm install && pnpm run build
CMD ["sh", "-c", "cd bot/artifacts/api-server && pnpm run start"]
