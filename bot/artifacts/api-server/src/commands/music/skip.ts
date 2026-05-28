import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { playNext } from "./play";
import type { Command } from "../../types/index";

export const skip: Command = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("⏭️ Skip the current track"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const shoukaku = (interaction.client as any).shoukaku;
    const queues = (interaction.client as any).queues;
    const queue = queues.get(interaction.guildId!);
    const player = shoukaku.players.get(interaction.guildId!);

    if (!player || !queue?.current) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing to skip!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const skipped = queue.current;
    queue.current = null;
    await player.stopTrack();

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("⏭️ Skipped")
          .setDescription(`> **${skipped.info.title}** by **${skipped.info.author}**`)
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};