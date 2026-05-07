import { Events } from "discord.js";
import { logger } from "../lib/logger";
import type { BotEvent } from "../types/index";

export const error: BotEvent<Events.Error> = {
  name: Events.Error,
  execute(err: Error) {
    logger.error({ err }, "Discord client error");
  },
};

export const warn: BotEvent<Events.Warn> = {
  name: Events.Warn,
  execute(message: string) {
    logger.warn({ message }, "Discord client warning");
  },
};
