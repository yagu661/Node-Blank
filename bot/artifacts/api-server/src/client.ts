import { Client, Collection, GatewayIntentBits } from "discord.js";
import type { Command, Warning } from "./types/index";

export class BotClient extends Client {
  commands:  Collection<string, Command>                           = new Collection();
  cooldowns: Collection<string, Collection<string, number>>        = new Collection();
  warnings:  Collection<string, Collection<string, Warning[]>>     = new Collection();
  tempBans:  Collection<string, NodeJS.Timeout>                    = new Collection();

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
      ],
      allowedMentions: { repliedUser: false },
    });
  }
}
