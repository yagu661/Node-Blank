import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, GuildMember, ChannelType } from "discord.js";
import { MUSIC_COLOR } from "../../lib/musicUtils";
import { correctSearchQuery } from "../../lib/ai";
import { guilds247 } from "../../lib/musicState";
import { config } from "../../config";
import type { Command } from "../../types/index";

const autocompleteCache = new Map<string, { results: { name: string; value: string }[]; ts: number }>();
const CACHE_TTL = 30_000;

export const play: Command = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("🎵 Search Spotify, YouTube or paste a URL — Spotify-first, highest quality audio")
    .addStringOption((o) =>
      o.setName("query").setDescription("Song name, artist, or URL — even with typos!").setRequired(true).setAutocomplete(true)
    ),
  cooldown: 3,

  async autocomplete(interaction) {
    const query = interaction.options.getFocused().trim();
    if (query.length < 2) return interaction.respond([]);

    const cached = autocompleteCache.get(query);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      await interaction.respond(cached.results).catch(() => null);
      return;
    }

    try {
      const shoukaku = (interaction.client as any).shoukaku;
      const node = shoukaku?.nodes.get("main");
      if (!node) return interaction.respond([]);

      const result = await node.rest.resolve(`ytsearch:${query}`);
      if (!result?.data?.length) return interaction.respond([]);

      const choices = result.data.slice(0, 10).map((t: any) => ({
        name: `${t.info.title} — ${t.info.author}`.slice(0, 100),
        value: t.info.uri,
      }));

      autocompleteCache.set(query, { results: choices, ts: Date.now() });
      await interaction.respond(choices).catch(() => null);
    } catch {
      await interaction.respond([]).catch(() => null);
    }
  },

  async execute(interaction) {
    await interaction.deferReply();

    const member = interaction.member as GuildMember;
    const voiceChannel = member.voice.channel;

    if (!voiceChannel) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Not in Voice").setDescription("> You need to be in a voice channel to play music!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    if (voiceChannel.type !== ChannelType.GuildVoice && voiceChannel.type !== ChannelType.GuildStageVoice) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("🚫 Invalid Channel").setDescription("> That channel type is not supported.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const me = interaction.guild!.members.me;
    const perms = voiceChannel.permissionsFor(me!);
    if (!perms?.has(PermissionFlagsBits.Connect) || !perms?.has(PermissionFlagsBits.Speak)) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("�lock Missing Permissions").setDescription("> I don't have permission to **Connect** or **Speak** in that channel.").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const rawQuery = interaction.options.getString("query", true);
    const isUrl = rawQuery.startsWith("http://") || rawQuery.startsWith("https://");
    const correctedQuery = isUrl ? rawQuery : await correctSearchQuery(rawQuery);
    const query = correctedQuery || rawQuery;
    const wasCorrected = !isUrl && query.toLowerCase() !== rawQuery.toLowerCase();

    const shoukaku = (interaction.client as any).shoukaku;
    const node = shoukaku?.nodes.get("main");

    if (!node) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ Music Unavailable").setDescription("> Music server is not connected!").setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    const search = isUrl ? query : `ytsearch:${query}`;
    const result = await node.rest.resolve(search);

    if (!result?.data?.length) {
      return void interaction.editReply({
        embeds: [new EmbedBuilder().setColor(config.colors.error).setTitle("❌ No Results").setDescription(`> No results found for \`${rawQuery}\`.`).setTimestamp().setFooter({ text: `⚡ ${config.embedFooter}` })],
      });
    }

    let player = shoukaku.players.get(interaction.guildId!);
    if (!player) {
      player = await shoukaku.joinVoiceChannel({
        guildId: interaction.guildId!,
        channelId: voiceChannel.id,
        shardId: interaction.guild!.shardId,
        deaf: true,
      });
    }

    const queues = (interaction.client as any).queues;
    let queue = queues.get(interaction.guildId!);
    if (!queue) {
      queue = { tracks: [], current: null, channel: interaction.channel, is247: guilds247.has(interaction.guildId!) };
      queues.set(interaction.guildId!, queue);
    }

    const isPlaylist = result.loadType === "playlist";
    const tracks = isPlaylist ? result.data.tracks : [result.data[0]];

    for (const track of tracks) queue.tracks.push(track);

    if (!queue.current) {
      await playNext(player, queue, shoukaku, interaction.guildId!);
    }

    const track = tracks[0];
    const correctionNote = wasCorrected ? `\n> 🔍 *Searched as: \`${track.info.title}\`*` : "";

    if (isPlaylist) {
      return void interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(MUSIC_COLOR)
            .setTitle("📋 Playlist Queued")
            .setDescription(`> Added **${tracks.length}** tracks from **${result.data.info?.name ?? "Playlist"}**${correctionNote}`)
            .addFields(
              { name: "👤 Requested by", value: `${interaction.user}`, inline: true },
              { name: "♾️ AI Autoplay", value: "Enabled — similar songs play automatically", inline: false },
            )
            .setTimestamp()
            .setFooter({ text: `⚡ ${config.embedFooter}` }),
        ],
      });
    }

    return void interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🎵 Added to Queue")
          .setDescription(`> **[${track.info.title}](${track.info.uri})**\n> by **${track.info.author}**${correctionNote}`)
          .setThumbnail(track.info.artworkUrl ?? null)
          .addFields(
            { name: "⏱️ Duration", value: msToTime(track.info.length), inline: true },
            { name: "👤 Requested by", value: `${interaction.user}`, inline: true },
            { name: "♾️ AI Autoplay", value: "On — genre-matched songs auto-queue", inline: false },
          )
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    });
  },
};

async function playNext(player: any, queue: any, shoukaku: any, guildId: string) {
  if (!queue.tracks.length) {
    queue.current = null;
    shoukaku.leaveVoiceChannel(guildId);
    return;
  }

  const track = queue.tracks.shift();
  queue.current = track;

  await player.playTrack({ track: track.encoded });

  if (queue.channel) {
    queue.channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(MUSIC_COLOR)
          .setTitle("🎵 Now Playing")
          .setDescription(`> **[${track.info.title}](${track.info.uri})**\n> by **${track.info.author}**`)
          .setThumbnail(track.info.artworkUrl ?? null)
          .addFields({ name: "⏱️ Duration", value: msToTime(track.info.length), inline: true })
          .setTimestamp()
          .setFooter({ text: `⚡ ${config.embedFooter}` }),
      ],
    }).catch(() => null);
  }

  player.once("end", () => {
    queue.current = null;
    playNext(player, queue, shoukaku, guildId);
  });
}

function msToTime(ms: number): string {
  const seconds = Math.floor((ms / 1000) % 60);
  const minutes = Math.floor((ms / (1000 * 60)) % 60);
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}