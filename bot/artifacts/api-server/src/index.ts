import { createServer, type Server } from "node:http";
import { execSync } from "node:child_process";
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
  if (err.code === "EADDRINUSE") return;
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

const port = Number(process.env["PORT"] ?? 8080);

const server: Server = createServer((req, res) => {
  if (req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
});

function shutdown() {
  try { server.closeAllConnections?.(); } catch {}
  try { server.close(); } catch {}
  try { client.destroy(); } catch {}
  process.exit(0);
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

function listen(attempt = 1): void {
  server.listen(port, () => {
    logger.info({ port }, "Health server listening");
  });

  server.once("error", (err: NodeJS.ErrnoException) => {
    if (err.code !== "EADDRINUSE") {
      logger.error({ err }, "Health server error");
      return;
    }

    logger.warn({ port, attempt }, `Port ${port} busy — clearing and retrying (${attempt}/5)`);

    try {
      execSync(`fuser -k ${port}/tcp`, { stdio: "ignore" });
    } catch {}

    if (attempt <= 5) {
      setTimeout(() => {
        server.removeAllListeners("error");
        listen(attempt + 1);
      }, 1000);
    } else {
      logger.warn({ port }, "Could not bind port — health server disabled, bot continues");
    }
  });
}

listen();

client.login(token).catch((err) => {
  logger.error({ err }, "Failed to log in to Discord");
  process.exit(1);
});
