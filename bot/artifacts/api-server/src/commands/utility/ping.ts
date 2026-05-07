import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

function latencyStatus(ms: number): string {
  if (ms < 80)  return "🟢 **Excellent**";
  if (ms < 150) return "🟡 **Good**";
  if (ms < 300) return "🟠 **Moderate**";
  return           "🔴 **Poor**";
}

function latencyColor(ms: number): number {
  if (ms < 80)  return config.colors.success;
  if (ms < 150) return 0x57c8f2;
  if (ms < 300) return config.colors.warning;
  return config.colors.error;
}

export const ping: Command = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("📡 Check the bot's latency and API response time"),
  cooldown: 5,
  async execute(interaction, client) {
    const sent = await interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(config.colors.primary)
          .setDescription("📡 **Measuring latency...** please wait.")
          .setTimestamp(),
      ],
      fetchReply: true,
    });

    const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
    const ws        = client.ws.ping;
    const color     = latencyColor(Math.max(roundtrip, ws));

    await interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle("🏓 Pong!")
          .setDescription(
            `> Latency check for **${interaction.user.username}**\n` +
            `> ${config.divider}`,
          )
          .addFields(
            {
              name: "📶 Roundtrip",
              value: `\`${roundtrip}ms\`\n${latencyStatus(roundtrip)}`,
              inline: true,
            },
            {
              name: "🌐 WebSocket",
              value: `\`${ws}ms\`\n${latencyStatus(ws)}`,
              inline: true,
            },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter} • ${interaction.user.tag}` }),
      ],
    });
  },
};
