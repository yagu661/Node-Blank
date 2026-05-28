import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const pause: Command = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("⏸️ Pause the current track"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const shoukaku = (interaction.client as any).shoukaku;
    const player = shoukaku.players.get(interaction.guildId!);

    if (!player) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing to pause!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    await player.setPaused(true);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏸️ Paused")
          .setDescription("> Music paused! Use `/resume` to continue.")
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};