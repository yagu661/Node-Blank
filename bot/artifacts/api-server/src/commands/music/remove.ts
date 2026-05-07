import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const remove: Command = {
  data: new SlashCommandBuilder()
    .setName("remove")
    .setDescription("🗑️ Remove any track from the queue by its position number")
    .addIntegerOption((o) =>
      o.setName("position").setDescription("Position of the track in the queue").setMinValue(1).setRequired(true)
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

    const pos    = interaction.options.getInteger("position", true);
    const tracks = queue.tracks.toArray();

    if (pos > tracks.length) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Invalid Position").setDescription(`> Position \`${pos}\` is out of range. The queue has \`${tracks.length}\` track(s).`).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const removed = tracks[pos - 1]!;
    queue.removeTrack(removed);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🗑️ Track Removed")
          .setDescription(`> Removed **[${removed.title}](${removed.url})** from position \`${pos}\`.`)
          .setThumbnail(removed.thumbnail)
          .addFields({ name: "⏱️ Duration", value: removed.duration, inline: true })
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
