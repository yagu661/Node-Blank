import { SlashCommandBuilder, EmbedBuilder } from "discord.js";
import { config } from "../../config";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import type { Command } from "../../types/index";

export const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("📋 Show the current queue"),
  cooldown: 2,

  async execute(interaction) {
    await interaction.deferReply();

    const queues = (interaction.client as any).queues;
    const queue = queues.get(interaction.guildId!);

    if (!queue?.current && !queue?.tracks?.length) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Empty Queue").setDescription("> No tracks in queue!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const tracks = queue.tracks.slice(0, 10).map((t: any, i: number) =>
      `> **${i + 1}.** [${t.info.title}](${t.info.uri}) — ${t.info.author}`
    ).join("\n");

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("📋 Queue")
          .addFields(
            { name: "🎵 Now Playing", value: queue.current ? `> [${queue.current.info.title}](${queue.current.info.uri})` : "> Nothing", inline: false },
            { name: `📋 Up Next (${queue.tracks.length} tracks)`, value: tracks || "> No more tracks", inline: false },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};