import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import type { Command } from "../../types/index";

const MOD_CMDS = new Set([
  "ban","kick","unban","unban-all","mute","unmute","warn","clear-warns",
  "slow-mode","unslow-mode","lock","lock-all","unlock","unlock-all","nick","hide","unhide",
]);

export const help: Command = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("📖 View all available commands"),
  cooldown: 5,
  async execute(interaction, client) {
    const all = [...client.commands.values()];

    const section = (cmds: Command[]) =>
      cmds.map((cmd) =>
        `> ✦ **/${cmd.data.name}** — ${cmd.data.description}`,
      ).join("\n");

    const modCmds = all.filter((c) => MOD_CMDS.has(c.data.name));
    const utilCmds = all.filter((c) => !MOD_CMDS.has(c.data.name));

    const embed = new EmbedBuilder()
      .setColor(config.colors.primary)
      .setTitle("📖 Command Directory")
      .setDescription(
        `Welcome, **${interaction.user.username}**!\n` +
        `Here's the full list of **${client.commands.size}** commands.\n` +
        `> ${config.divider}`,
      )
      .setThumbnail(interaction.client.user!.displayAvatarURL({ size: 256 }))
      .addFields(
        {
          name: "🛡️ Moderation",
          value: section(modCmds) || "> *None*",
          inline: false,
        },
        {
          name: "🔧 Utility",
          value: section(utilCmds) || "> *None*",
          inline: false,
        },
      )
      .setTimestamp()
      .setFooter({ text: `⚡ ${config.embedFooter} • ${client.commands.size} commands` });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
