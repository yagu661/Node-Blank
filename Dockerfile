FROM node:22
RUN npm install -g pnpm
WORKDIR /app
COPY bot/ ./
RUN cd artifacts/api-server && pnpm install --ignore-scripts && pnpm run build
CMD ["node", "--enable-source-maps", "/app/artifacts/api-server/dist/index.mjs"]
