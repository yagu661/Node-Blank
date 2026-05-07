import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { getQueueForMember } from "../../lib/queueHelper";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const volume: Command = {
  data: new SlashCommandBuilder()
    .setName("volume")
    .setDescription("🔊 Adjust the playback volume from 1 to 100 — changes apply instantly")
    .addIntegerOption((o) =>
      o.setName("level").setDescription("Volume level (1–100)").setMinValue(1).setMaxValue(100).setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue?.isPlaying()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const level = interaction.options.getInteger("level", true);
    const old   = queue.node.volume;
    queue.node.setVolume(level);

    const bar = "█".repeat(Math.round(level / 10)) + "░".repeat(10 - Math.round(level / 10));
    const icon = level === 0 ? "🔇" : level < 40 ? "🔈" : level < 70 ? "🔉" : "🔊";

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle(`${icon} Volume Updated`)
          .setDescription(`\`${bar}\` \`${level}%\``)
          .addFields(
            { name: "📉 Previous", value: `\`${old}%\``,   inline: true },
            { name: "📈 New",      value: `\`${level}%\``, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
