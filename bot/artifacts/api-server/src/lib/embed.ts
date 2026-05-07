import { EmbedBuilder } from "discord.js";
import { config } from "../config";

export function successEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle(`✅ ${title}`)
    .setDescription(`> ${description}\n> ${config.divider}`)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}

export function errorEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`🚫 ${title}`)
    .setDescription(`> ${description}`)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}

export function warningEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`⚠️ ${title}`)
    .setDescription(`> ${description}`)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}

export function baseEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}
