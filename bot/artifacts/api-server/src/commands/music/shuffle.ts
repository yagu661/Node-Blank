import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const shuffle: Command = {
  data: new SlashCommandBuilder()
    .setName("shuffle")
    .setDescription("🔀 Randomise the entire queue order for a fresh listening experience"),
  cooldown: 5,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue?.isPlaying()) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    if (queue.tracks.size < 2) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.warning).setTitle("⚠️ Not Enough Tracks").setDescription("> There need to be at least **2 tracks** in the queue to shuffle.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    queue.tracks.shuffle();

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🔀 Queue Shuffled")
          .setDescription(`> Shuffled **${queue.tracks.size}** tracks in the queue.`)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
