import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const resume: Command = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("▶️ Resume a paused track and continue playback where you left off"),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    if (!queue.node.isPaused()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle("⚠️ Not Paused").setDescription("> The track is not paused. Use `/pause` to pause it.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    queue.node.resume();

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("▶️ Resumed")
          .setDescription(`> **${queue.currentTrack!.title}** is now playing again.`)
          .setThumbnail(queue.currentTrack!.thumbnail)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
