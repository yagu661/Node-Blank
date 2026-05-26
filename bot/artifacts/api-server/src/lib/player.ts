import { Shoukaku, Connectors } from "shoukaku";
import type { BotClient } from "../client";

export function initPlayer(client: BotClient): void {
  const shoukaku = new Shoukaku(
    new Connectors.DiscordJS(client),
    [{
      name: "main",
      url: `${process.env["LAVALINK_HOST"] ?? "localhost"}:${process.env["LAVALINK_PORT"] ?? "443"}`,
      auth: process.env["LAVALINK_PASSWORD"] ?? "youshallnotpass",
      secure: true,
    }],
    {
      resume: true,
      reconnectTries: 10,
    }
  );

  shoukaku.on("error", (name, error) => {
    console.error(`[Lavalink] Error on node ${name}:`, error.message);
  });

  shoukaku.on("ready", (name) => {
    console.log(`[Lavalink] Node ${name} is ready!`);
  });

  (client as any).shoukaku = shoukaku;
  (client as any).queues = new Map();
}