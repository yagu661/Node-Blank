import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const leave: Command = {
  data: new SlashCommandBuilder()
    .setName("leave")
    .setDescription("👋 Make the bot leave the voice channel"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const shoukaku = (interaction.client as any).shoukaku;
    const queues = (interaction.client as any).queues;
    const player = shoukaku.players.get(interaction.guildId!);

    if (!player) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Not Connected").setDescription("> I'm not in a voice channel!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    queues.delete(interaction.guildId!);
    shoukaku.leaveVoiceChannel(interaction.guildId!);

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("👋 Left")
          .setDescription("> Left the voice channel!")
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};