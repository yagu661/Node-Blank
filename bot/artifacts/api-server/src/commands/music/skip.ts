import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

export const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("⏭️ Skip the current track or jump ahead multiple tracks at once")
    .addIntegerOption((o) =>
      o.setName("amount").setDescription("Number of tracks to skip (default: 1)").setMinValue(1).setMaxValue(50).setRequired(false)
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

    const amount     = interaction.options.getInteger("amount") ?? 1;
    const skippedTrack = queue.currentTrack!;

    if (amount === 1) {
      queue.node.skip();
    } else {
      const toRemove = queue.tracks.toArray().slice(0, amount - 1);
      for (const t of toRemove) queue.removeTrack(t);
      queue.node.skip();
    }

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏭️ Skipped")
          .setDescription(amount === 1
            ? `> Skipped **${skippedTrack.title}**.`
            : `> Skipped **${amount}** track(s).`)
          .setThumbnail(skippedTrack.thumbnail)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
