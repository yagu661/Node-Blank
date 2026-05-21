FROM node:22
RUN npm install -g pnpm
WORKDIR /app
COPY . .
RUN ls -la
RUN cd /app/bot/artifacts/api-server && pnpm install && pnpm run build
CMD ["sh", "-c", "cd /app/bot/artifacts/api-server && pnpm run start"]
