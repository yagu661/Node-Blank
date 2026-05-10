import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

function formatUptime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function pingLabel(ms: number): string {
  if (ms < 80)  return "🟢 Excellent";
  if (ms < 150) return "🟡 Good";
  if (ms < 300) return "🟠 Moderate";
  return           "🔴 Poor";
}

function memBar(usedMB: number, totalMB: number): string {
  const pct   = Math.min(usedMB / totalMB, 1);
  const filled = Math.round(pct * 10);
  return "█".repeat(filled) + "░".repeat(10 - filled) + ` ${(pct * 100).toFixed(0)}%`;
}

export const status: Command = {
  data: new SlashCommandBuilder()
    .setName("status")
    .setDescription("📊 View the bot's live health and operational status"),
  cooldown: 10,
  async execute(interaction, client) {
    const mem      = process.memoryUsage();
    const usedMB   = mem.rss / 1024 / 1024;
    const heapMB   = mem.heapUsed / 1024 / 1024;
    const totalMB  = mem.heapTotal / 1024 / 1024;
    const wsPing   = client.ws.ping;
    const uptime   = formatUptime(client.uptime ?? 0);
    const servers  = client.guilds.cache.size;
    const users    = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle("📊 Bot Status")
          .setDescription(
            `> Real-time health overview for **${client.user!.username}**\n` +
            `> ${config.divider}`,
          )
          .setThumbnail(client.user!.displayAvatarURL({ size: 256 }))
          .addFields(
            {
              name: "🌐 WS Ping",
              value: `\`${wsPing}ms\` — ${pingLabel(wsPing)}`,
              inline: true,
            },
            {
              name: "⏱️ Uptime",
              value: `\`${uptime}\``,
              inline: true,
            },
            {
              name: "🏰 Servers",
              value: `\`${servers}\``,
              inline: true,
            },
            {
              name: "👥 Users",
              value: `\`${users}\``,
              inline: true,
            },
            {
              name: "💾 Memory (RSS)",
              value: `\`${usedMB.toFixed(1)} MB\``,
              inline: true,
            },
            {
              name: "🧠 Heap",
              value: `\`${heapMB.toFixed(1)} / ${totalMB.toFixed(1)} MB\``,
              inline: true,
            },
            {
              name: "📈 Heap Usage",
              value: `\`${memBar(heapMB, totalMB)}\``,
              inline: false,
            },
            {
              name: "🟢 Runtime",
              value: `\`${process.version}\``,
              inline: true,
            },
            {
              name: "📦 Library",
              value: "`discord.js v14`",
              inline: true,
            },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
