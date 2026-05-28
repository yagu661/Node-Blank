import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const stop: Command = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("⏹️ Stop music and clear the queue"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const shoukaku = (interaction.client as any).shoukaku;
    const queues = (interaction.client as any).queues;
    const player = shoukaku.players.get(interaction.guildId!);

    if (!player) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing to stop!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    queues.delete(interaction.guildId!);
    await player.stopTrack();
    shoukaku.leaveVoiceChannel(interaction.guildId!);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏹️ Stopped")
          .setDescription("> Music stopped and queue cleared!")
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};