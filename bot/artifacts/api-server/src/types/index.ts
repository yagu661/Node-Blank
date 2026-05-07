import type {
  ChatInputCommandInteraction,
  ClientEvents,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from "discord.js";
import type { BotClient } from "../client";

export type CommandData =
  | SlashCommandBuilder
  | SlashCommandOptionsOnlyBuilder
  | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;

export interface Command {
  data: CommandData;
  cooldown?: number;
  userPermissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  autocomplete?(interaction: import("discord.js").AutocompleteInteraction): Promise<void>;
  execute(interaction: ChatInputCommandInteraction, client: BotClient): Promise<void>;
}

export interface BotEvent<K extends keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}

export interface Warning {
  reason: string;
  moderator: string;
  timestamp: number;
}
