import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR, parseDuration, createProgressBar, formatDuration } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const seek: Command = {
  data: new SlashCommandBuilder()
    .setName("seek")
    .setDescription("⏩ Jump to any timestamp in the current track — e.g. 1:30 or 90")
    .addStringOption((o) =>
      o.setName("time").setDescription('Time to seek to (e.g. "1:30" or "90")').setRequired(true)
    ),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue = getQueueForMember(interaction.member as GuildMember);

    if (!queue?.isPlaying() || !queue.currentTrack) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const input = interaction.options.getString("time", true);
    const ms    = parseDuration(input);

    if (ms < 0) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Invalid Time").setDescription("> Please provide a valid time format like `1:30` or `90`.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const total = queue.currentTrack.durationMS;
    if (ms >= total) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Out of Range").setDescription(`> The track is only **${queue.currentTrack.duration}** long.`).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    await queue.node.seek(ms);
    const bar = createProgressBar(ms, total);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏩ Seeked")
          .setDescription(
            `> **${queue.currentTrack.title}**\n\n` +
            `\`${formatDuration(ms)}\` ${bar} \`${queue.currentTrack.duration}\``,
          )
          .setThumbnail(queue.currentTrack.thumbnail)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
