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

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception");
  process.exit(1);
});

const port = Number(process.env["PORT"] ?? 8080);
createServer((req, res) => {
  if (req.url === "/api/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", uptime: process.uptime() }));
  } else {
    res.writeHead(404);
    res.end();
  }
}).listen(port, () => {
  logger.info({ port }, "Health server listening");
});

client.login(token).catch((err) => {
  logger.error({ err }, "Failed to log in to Discord");
  process.exit(1);
});
