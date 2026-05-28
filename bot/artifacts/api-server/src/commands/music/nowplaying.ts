import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const nowplaying: Command = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("🎵 Show the currently playing track"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const queues = (interaction.client as any).queues;
    const queue = queues.get(interaction.guildId!);

    if (!queue?.current) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> Nothing is currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const track = queue.current;

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🎵 Now Playing")
          .setDescription(`> **[${track.info.title}](${track.info.uri})**\n> by **${track.info.author}**`)
          .setThumbnail(track.info.artworkUrl ?? null)
          .addFields({ name: "⏱️ Duration", value: track.info.length ? `${Math.floor(track.info.length / 60000)}:${String(Math.floor((track.info.length % 60000) / 1000)).padStart(2, "0")}` : "Unknown", inline: true })
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};