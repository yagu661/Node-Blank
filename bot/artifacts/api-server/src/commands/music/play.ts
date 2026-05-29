import { Poru, PoruOptions, NodeGroup } from "poru";
import type { BotClient } from "../client";

export function initPlayer(client: BotClient): void {
  const nodes: NodeGroup[] = [{
    name: "main",
    host: process.env["LAVALINK_HOST"] ?? "lavalinkv4.serenetia.com",
    port: Number(process.env["LAVALINK_PORT"] ?? 80),
    password: process.env["LAVALINK_PASSWORD"] ?? "https://dsc.gg/ajidevserver",
    secure: false,
  }];

  const options: PoruOptions = {
    library: "discord.js",
    defaultPlatform: "spsearch",
    resumeKey: "YagamiBot",
    resumeTimeout: 60,
    reconnectTimeout: 10000,
    reconnectTries: 5,
  };

  const poru = new Poru(client as any, nodes, options);

  poru.on("nodeConnect", (node) => {
    console.log(`[Poru] Node ${node.name} connected!`);
  });

  poru.on("nodeError", (node, error) => {
    console.error(`[Poru] Node ${node.name} error:`, error.message);
  });

  poru.on("nodeDisconnect", (node) => {
    console.error(`[Poru] Node ${node.name} disconnected!`);
  });

  (client as any).poru = poru;
}