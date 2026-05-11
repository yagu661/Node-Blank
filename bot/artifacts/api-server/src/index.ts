import { createServer } from "node:http";
import { BotClient } from "./client";
import { commands } from "./commands/index";
import { events } from "./events/index";
import { logger } from "./lib/logger";
import { initPlayer } from "./lib/player";

const token = process.env["DISCORD_TOKEN"];

if (!token) {
  throw new Error("DISCORD_TOKEN environment variable is required but was not provided.");
}

const client = new BotClient();

initPlayer(client).catch((err) => {
  logger.error({ err }, "Failed to initialize music player");
  process.exit(1);
});

for (const command of commands) {
  client.commands.set(command.data.name, command);
}

for (const event of events) {
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...(args as any)));
  } else {
    client.on(event.name, (...args) => event.execute(...(args as any)));
  }
}

process.on("unhandledRejection", (err) => {
  logger.error({ err }, "Unhandled promise rejection");
});

process.on("uncaughtException", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    logger.warn({ port: err.port }, "Port in use — ignoring, bot continues running");
    return;
  }
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

const port = Number(process.env["PORT"] ?? 8080);
const server = createServer((req, res) => {
  if (req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

function startServer(attempt = 1): void {
  server.listen(port, () => {
    logger.info({ port }, "Health server listening");
  });

  server.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      if (attempt <= 5) {
        logger.warn({ port, attempt }, `Port busy — retrying in 2s (attempt ${attempt}/5)`);
        setTimeout(() => {
          server.close();
          startServer(attempt + 1);
        }, 2000);
      } else {
        logger.warn({ port }, "Port still busy after 5 attempts — health server disabled, bot continues");
      }
    } else {
      logger.error({ err }, "Health server error");
    }
  });
}

startServer();

client.login(token).catch((err) => {
  logger.error({ err }, "Failed to log in to Discord");
  process.exit(1);
});
