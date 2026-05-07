import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h % 24 > 0) parts.push(`${h % 24}h`);
  if (m % 60 > 0) parts.push(`${m % 60}m`);
  parts.push(`${s % 60}s`);
  return parts.join(" ");
}

export const info: Command = {
  data: new SlashCommandBuilder()
    .setName("info")
    .setDescription("🤖 View detailed information about this bot"),
  cooldown: 10,
  async execute(interaction, client) {
    const guilds   = client.guilds.cache.size;
    const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);
    const uptime   = formatUptime(client.uptime ?? 0);
    const cmds     = client.commands.size;
    const memMB    = (process.memoryUsage().rss / 1024 / 1024).toFixed(1);
    const ping     = client.ws.ping;

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setTitle(`✨ ${client.user!.username}`)
          .setDescription(
            `> A powerful, secure, and aesthetic Discord bot.\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(client.user!.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: "🏰 Servers",    value: `\`${guilds}\``,        inline: true },
            { name: "👥 Users",      value: `\`${users}\``,         inline: true },
            { name: "<a:rules_book:1501544042931028059> Commands",   value: `\`${cmds}\``,          inline: true },
            { name: "⏱️ Uptime",     value: `\`${uptime}\``,        inline: true },
            { name: "🌐 WS Latency", value: `\`${ping}ms\``,        inline: true },
            { name: "💾 Memory",     value: `\`${memMB} MB\``,      inline: true },
            { name: "📦 Library",    value: "`discord.js v14`",     inline: true },
            { name: "🟢 Runtime",    value: `\`${process.version}\``, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
