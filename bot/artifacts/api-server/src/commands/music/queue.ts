import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { getQueueForMember } from "../../lib/queueHelper";
import { config } from "../../config";
import type { Command } from "../../types/index";

const PAGE_SIZE = 10;

export const queue: Command = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("<a:rules_book2:1501544101336580146> Browse the full music queue — paginated, clean and easy to read")
    .addIntegerOption((o) =>
      o.setName("page").setDescription("Page number").setMinValue(1).setRequired(false)
    ),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const q = getQueueForMember(interaction.member as GuildMember);

    if (!q?.currentTrack) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Empty Queue").setDescription("> The queue is empty! Use `/play` to add some tracks.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const tracks    = q.tracks.toArray();
    const totalPages = Math.max(1, Math.ceil(tracks.length / PAGE_SIZE));
    const page       = Math.min(interaction.options.getInteger("page") ?? 1, totalPages);
    const start      = (page - 1) * PAGE_SIZE;
    const pageTracks = tracks.slice(start, start + PAGE_SIZE);

    const trackList = pageTracks.length > 0
      ? pageTracks.map((t, i) =>
          `\`${start + i + 1}.\` **[${t.title}](${t.url})** — \`${t.duration}\` — ${t.requestedBy ?? "Unknown"}`
        ).join("\n")
      : "> No more tracks on this page.";

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("<a:rules_book2:1501544101336580146> Music Queue")
          .setDescription(
            `**🎵 Now Playing:**\n` +
            `> **[${q.currentTrack.title}](${q.currentTrack.url})** — \`${q.currentTrack.duration}\`\n\n` +
            (tracks.length > 0 ? `**Up Next:**\n${trackList}` : "> No tracks queued. Add more with `/play`!"),
          )
          .addFields(
            { name: "🎶 Total Tracks", value: `\`${tracks.length + 1}\``,      inline: true },
            { name: "📄 Page",         value: `\`${page} / ${totalPages}\``,   inline: true },
            { name: "🔊 Volume",       value: `\`${q.node.volume}%\``,         inline: true },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
