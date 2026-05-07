import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const pause: Command = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("⏸️ Pause the current track — resume it any time with /resume"),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue?.isPlaying()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    if (queue.node.isPaused()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle("⚠️ Already Paused").setDescription("> The track is already paused. Use `/resume` to continue.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    queue.node.pause();

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏸️ Paused")
          .setDescription(`> **${queue.currentTrack!.title}** has been paused.\n> Use \`/resume\` to continue.`)
          .setThumbnail(queue.currentTrack!.thumbnail)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
