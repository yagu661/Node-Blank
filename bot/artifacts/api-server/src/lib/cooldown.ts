import { Collection } from "discord.js";
import type { BotClient } from "../client";
import type { Command } from "../types/index";
import { config } from "../config";

export function checkCooldown(
  client: BotClient,
  command: Command,
  userId: string,
): number | null {
  if (!client.cooldowns.has(command.data.name)) {
    client.cooldowns.set(command.data.name, new Collection());
  }

  const timestamps = client.cooldowns.get(command.data.name)!;
  const cooldownAmount = (command.cooldown ?? config.defaultCooldown) * 1_000;
  const now = Date.now();

  if (timestamps.has(userId)) {
    const expiresAt = timestamps.get(userId)! + cooldownAmount;
    if (now < expiresAt) {
      return (expiresAt - now) / 1_000;
    }
  }

  timestamps.set(userId, now);
  setTimeout(() => timestamps.delete(userId), cooldownAmount);

  return null;
}
