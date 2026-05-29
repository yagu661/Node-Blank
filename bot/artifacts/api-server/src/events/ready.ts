import { REST, Routes, Events } from "discord.js";
import { logger } from "../lib/logger";
import { commands } from "../commands/index";
import type { BotEvent } from "../types/index";
import type { Client } from "discord.js";

export const ready: BotEvent<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client<true>) {
    logger.info(`Logged in as ${client.user.tag} — serving ${client.guilds.cache.size} server(s)`);

    const rest = new REST().setToken(process.env["DISCORD_TOKEN"]!);
    const allCommands = [...commands.map((cmd) => cmd.data.toJSON())];

// Add JS music commands
const jsMusicPath = require("path").join(__dirname, "../commands/music");
const fs = require("fs");
if (fs.existsSync(jsMusicPath)) {
  const jsFiles = fs.readdirSync(jsMusicPath).filter((f: string) => f.endsWith(".js"));
  for (const file of jsFiles) {
    const cmd = require(require("path").join(jsMusicPath, file));
    if (cmd.data) allCommands.push(cmd.data.toJSON());
  }
}

const body = allCommands;

    try {
      const guildId = process.env["GUILD_ID"];
      if (guildId) {
        await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
        logger.info("Cleared all global slash commands");
        await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
        logger.info(`Registered ${body.length} guild slash command(s) instantly`);
      } else {
        await rest.put(Routes.applicationCommands(client.user.id), { body });
        logger.info(`Registered ${body.length} global slash command(s)`);
      }
    } catch (err) {
      logger.error({ err }, "Failed to register slash commands");
    }
  },
};
