import { EmbedBuilder, GuildMember, User } from "discord.js";
import { config } from "../config";

export function sanitizeReason(reason: string | null | undefined): string {
  if (!reason?.trim()) return "No reason provided";
  return reason
    .replace(/@(everyone|here)/gi, "@\u200b$1")
    .replace(/`/g, "'")
    .trim()
    .slice(0, config.maxReasonLength) || "No reason provided";
}

export function auditReason(moderator: User, reason: string): string {
  return `[${moderator.username}] ${reason}`.slice(0, 512);
}

export function canTarget(executor: GuildMember, target: GuildMember): boolean {
  return target.roles.highest.position < executor.roles.highest.position;
}

export async function safeDM(target: User, embed: EmbedBuilder): Promise<boolean> {
  return target.send({ embeds: [embed] }).then(() => true).catch(() => false);
}

export function caseId(): string {
  return `#${Date.now().toString(36).toUpperCase()}`;
}

export function errEmbed(title: string, description: string): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle(`🚫 ${title}`)
    .setDescription(`> ${description}`)
    .setTimestamp()
    .setFooter({ text: `⚡ ${config.embedFooter}` });
}

export function modEmbed({
  color,
  title,
  description,
  target,
  moderator,
}: {
  color: number;
  title: string;
  description: string;
  target: User;
  moderator: User;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setAuthor({ name: `⚖️ ${moderator.username}`, iconURL: moderator.displayAvatarURL() })
    .setDescription(`${description}\n> ${config.divider}`)
    .setThumbnail(target.displayAvatarURL({ size: 256 }));
}

export function dmEmbed({
  color,
  title,
  guildName,
  guildIcon,
}: {
  color: number;
  title: string;
  guildName: string;
  guildIcon: string | null;
}): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(title)
    .setDescription(`> ${config.divider}`)
    .setThumbnail(guildIcon);
}
