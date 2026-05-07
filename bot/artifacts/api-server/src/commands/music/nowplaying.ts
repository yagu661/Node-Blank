import { SlashCommandBuilder, EmbedBuilder, GuildMember } from "discord.js";
import { useTimeline, QueueRepeatMode } from "discord-player";
import { getQueueForMember } from "../../lib/queueHelper";
import { MUSIC_COLOR, createProgressBar, formatDuration } from "../../lib/musicUtils";
import { config } from "../../config";
import type { Command } from "../../types/index";

const repeatModeLabel: Record<QueueRepeatMode, string> = {
  [QueueRepeatMode.OFF]:       "🚫 Off",
  [QueueRepeatMode.TRACK]:     "🔂 Track",
  [QueueRepeatMode.QUEUE]:     "🔁 Queue",
  [QueueRepeatMode.AUTOPLAY]:  "♾️ Autoplay",
};

export const nowplaying: Command = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("🎶 See the current track with live progress bar, artwork and queue position"),
  cooldown: 3,
  async execute(interaction) {
    await interaction.deferReply();
    const queue    = getQueueForMember(interaction.member as GuildMember);
    const timeline = useTimeline();

    if (!queue?.isPlaying() || !queue.currentTrack) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Nothing Playing").setDescription("> There is nothing currently playing!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const track     = queue.currentTrack;
    const current   = timeline?.timestamp?.current?.value  ?? 0;
    const total     = timeline?.timestamp?.total?.value    ?? track.durationMS;
    const bar       = createProgressBar(current, total);
    const curLabel  = formatDuration(current);
    const totLabel  = formatDuration(total);
    const volume    = queue.node.volume;
    const loopLabel = repeatModeLabel[queue.repeatMode] ?? "🚫 Off";
    const isPaused  = queue.node.isPaused();

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle(`${isPaused ? "⏸️ Paused" : "🎵 Now Playing"}`)
          .setDescription(
            `**[${track.title}](${track.url})**\nby **${track.author}**\n\n` +
            `\`${curLabel}\` ${bar} \`${totLabel}\``,
          )
          .setThumbnail(track.thumbnail)
          .addFields(
            { name: "🔊 Volume",     value: `\`${volume}%\``,      inline: true },
            { name: "🔁 Loop",       value: loopLabel,              inline: true },
            { name: "👤 Requested", value: `${track.requestedBy}`, inline: true },
            { name: "<a:rules_book2:1501544101336580146> In Queue",  value: `\`${queue.tracks.size}\` track(s)`, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};
